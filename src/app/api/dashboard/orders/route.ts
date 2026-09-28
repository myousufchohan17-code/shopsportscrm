import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orders";
import { requireStaff } from "@/lib/session";
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from "@/lib/utils";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().max(120).optional().nullable(),
  customerPhone: z.string().trim().max(40).optional().nullable(),
  customerEmail: z.string().trim().email().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("PENDING"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = {
    storeId: session.user.storeId,
    ...(status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])
      ? { status }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { customerPhone: { contains: q, mode: "insensitive" as const } },
            { customerEmail: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true, sku: true } } } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: session.user.storeId },
      select: { taxRate: true },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Validate products and check stock
    const productIds = parsed.data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId: session.user.storeId, active: true },
    });

    if (products.length !== new Set(productIds).size) {
      return NextResponse.json({ error: "One or more products not found or inactive" }, { status: 404 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of parsed.data.items) {
      const product = productMap.get(item.productId)!;
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.quantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const subtotal = parsed.data.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + product.sellingPrice * item.quantity;
    }, 0);
    const discount = parsed.data.discount;
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxRate = parsed.data.taxRate || store.taxRate;
    const tax = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + tax;

    const orderNumber = await generateOrderNumber(session.user.storeId);

    // Create order with inventory deduction in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          storeId: session.user.storeId,
          orderNumber,
          customerId: parsed.data.customerId || null,
          customerName: parsed.data.customerName || null,
          customerPhone: parsed.data.customerPhone || null,
          customerEmail: parsed.data.customerEmail || null,
          status: "PENDING",
          paymentStatus: parsed.data.paymentStatus,
          paymentMethod: parsed.data.paymentMethod,
          subtotal,
          discount,
          tax,
          total,
          notes: parsed.data.notes || null,
          items: {
            create: parsed.data.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: product.sellingPrice,
                subtotal: product.sellingPrice * item.quantity,
              };
            }),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, imageUrl: true, sku: true } } } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      // Deduct inventory and create movements
      for (const item of parsed.data.items) {
        const product = productMap.get(item.productId)!;
        const newQty = product.quantity - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { quantity: newQty },
        });

        await tx.inventoryMovement.create({
          data: {
            storeId: session.user.storeId,
            productId: product.id,
            type: "ORDER",
            quantity: -item.quantity,
            previousQty: product.quantity,
            newQty,
            reference: orderNumber,
            notes: `Order ${orderNumber}`,
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, paymentMethod, notes, items } = body as {
      orderId?: string;
      status?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      notes?: string;
      items?: { productId: string; quantity: number }[];
    };

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId: session.user.storeId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Handle status change to CANCELLED - restore inventory
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Restore inventory for each item
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;

          const newQty = product.quantity + item.quantity;
          await tx.product.update({
            where: { id: product.id },
            data: { quantity: newQty },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId: session.user.storeId,
              productId: product.id,
              type: "CANCEL",
              quantity: item.quantity,
              previousQty: product.quantity,
              newQty,
              reference: order.orderNumber,
              notes: `Order ${order.orderNumber} cancelled`,
            },
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            ...(paymentStatus ? { paymentStatus } : {}),
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, imageUrl: true, sku: true } } } },
            customer: { select: { id: true, name: true, email: true, phone: true } },
          },
        });
      });

      return NextResponse.json({ order: updatedOrder });
    }

    // Handle item updates (edit order items)
    if (items && items.length > 0) {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Restore inventory for all existing items
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;

          const newQty = product.quantity + item.quantity;
          await tx.product.update({
            where: { id: product.id },
            data: { quantity: newQty },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId: session.user.storeId,
              productId: product.id,
              type: "RETURN",
              quantity: item.quantity,
              previousQty: product.quantity,
              newQty,
              reference: order.orderNumber,
              notes: `Order ${order.orderNumber} items updated`,
            },
          });
        }

        // Delete old items
        await tx.orderItem.deleteMany({ where: { orderId } });

        // Validate new products
        const productIds = items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, storeId: session.user.storeId, active: true },
        });
        if (products.length !== new Set(productIds).size) {
          throw new Error("One or more products not found or inactive");
        }

        const productMap = new Map(products.map((p) => [p.id, p]));
        for (const item of items) {
          const product = productMap.get(item.productId)!;
          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
          }
        }

        // Create new items and deduct inventory
        const newItems = items.map((item) => {
          const product = productMap.get(item.productId)!;
          return {
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: product.sellingPrice,
            subtotal: product.sellingPrice * item.quantity,
          };
        });

        for (const item of items) {
          const product = productMap.get(item.productId)!;
          const newQty = product.quantity - item.quantity;

          await tx.product.update({
            where: { id: product.id },
            data: { quantity: newQty },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId: session.user.storeId,
              productId: product.id,
              type: "ORDER",
              quantity: -item.quantity,
              previousQty: product.quantity,
              newQty,
              reference: order.orderNumber,
              notes: `Order ${order.orderNumber} items updated`,
            },
          });
        }

        // Recalculate totals
        const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
        const discount = order.discount;
        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = (taxableAmount * 0) / 100; // Keep original tax rate logic
        const total = taxableAmount + order.tax;

        return tx.order.update({
          where: { id: orderId },
          data: {
            subtotal,
            total,
            items: { create: newItems },
            ...(status ? { status } : {}),
            ...(paymentStatus ? { paymentStatus } : {}),
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, imageUrl: true, sku: true } } } },
            customer: { select: { id: true, name: true, email: true, phone: true } },
          },
        });
      });

      return NextResponse.json({ order: updatedOrder });
    }

    // Simple field updates
    const data: Record<string, unknown> = {};
    if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      data.status = status;
    }
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
      data.paymentStatus = paymentStatus;
    }
    if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
      data.paymentMethod = paymentMethod;
    }
    if (notes !== undefined) data.notes = notes || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true, sku: true } } } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, storeId: session.user.storeId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Restore inventory before deleting
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newQty = product.quantity + item.quantity;
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQty },
      });

      await tx.inventoryMovement.create({
        data: {
          storeId: session.user.storeId,
          productId: product.id,
          type: "CANCEL",
          quantity: item.quantity,
          previousQty: product.quantity,
          newQty,
          reference: order.orderNumber,
          notes: `Order ${order.orderNumber} deleted`,
        },
      });
    }

    await tx.order.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
