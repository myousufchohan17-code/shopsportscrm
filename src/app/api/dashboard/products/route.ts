import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(100),
  barcode: z.string().trim().max(100).optional().nullable(),
  categoryId: z.string().min(1),
  brand: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().positive(),
  quantity: z.number().int().min(0).default(0),
  minStockLevel: z.number().int().min(0).default(5),
  active: z.boolean().default(true),
});

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const categoryId = searchParams.get("categoryId") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = {
    storeId: session.user.storeId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q, mode: "insensitive" as const } },
            { brand: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy:
        sort === "name"
          ? { name: order }
          : sort === "price"
            ? { sellingPrice: order }
            : sort === "quantity"
              ? { quantity: order }
              : { createdAt: order },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    products,
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

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, storeId: session.user.storeId },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const existingSku = await prisma.product.findFirst({
    where: { storeId: session.user.storeId, sku: parsed.data.sku },
  });
  if (existingSku) {
    return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      storeId: session.user.storeId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode || null,
      brand: parsed.data.brand || null,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      purchasePrice: parsed.data.purchasePrice,
      sellingPrice: parsed.data.sellingPrice,
      quantity: parsed.data.quantity,
      minStockLevel: parsed.data.minStockLevel,
      active: parsed.data.active,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  // Create initial inventory movement if quantity > 0
  if (parsed.data.quantity > 0) {
    await prisma.inventoryMovement.create({
      data: {
        storeId: session.user.storeId,
        productId: product.id,
        type: "STOCK_IN",
        quantity: parsed.data.quantity,
        previousQty: 0,
        newQty: parsed.data.quantity,
        reference: "Initial stock",
      },
    });
  }

  return NextResponse.json({ product }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.product.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (rest.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: String(rest.categoryId), storeId: session.user.storeId },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  if (rest.sku && rest.sku !== existing.sku) {
    const existingSku = await prisma.product.findFirst({
      where: { storeId: session.user.storeId, sku: String(rest.sku) },
    });
    if (existingSku) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: String(rest.name).trim() } : {}),
      ...(rest.sku !== undefined ? { sku: String(rest.sku).trim() } : {}),
      ...(rest.barcode !== undefined
        ? { barcode: rest.barcode ? String(rest.barcode).trim() : null }
        : {}),
      ...(rest.categoryId !== undefined ? { categoryId: String(rest.categoryId) } : {}),
      ...(rest.brand !== undefined
        ? { brand: rest.brand ? String(rest.brand).trim() : null }
        : {}),
      ...(rest.description !== undefined
        ? { description: rest.description ? String(rest.description) : null }
        : {}),
      ...(rest.imageUrl !== undefined
        ? { imageUrl: rest.imageUrl ? String(rest.imageUrl).trim() : null }
        : {}),
      ...(rest.purchasePrice !== undefined
        ? { purchasePrice: Number(rest.purchasePrice) }
        : {}),
      ...(rest.sellingPrice !== undefined
        ? { sellingPrice: Number(rest.sellingPrice) }
        : {}),
      ...(rest.quantity !== undefined ? { quantity: Number(rest.quantity) } : {}),
      ...(rest.minStockLevel !== undefined
        ? { minStockLevel: Number(rest.minStockLevel) }
        : {}),
      ...(rest.active !== undefined ? { active: Boolean(rest.active) } : {}),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ product });
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

  const existing = await prisma.product.findFirst({
    where: { id, storeId: session.user.storeId },
    include: { orderItems: { take: 1 } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prevent deletion if product has order items
  if (existing.orderItems.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete product with order history. Deactivate it instead." },
      { status: 400 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
