import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const status = searchParams.get("status") ?? "";
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
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        inventoryMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
  ]);

  const store = await prisma.store.findUnique({
    where: { id: session.user.storeId },
    select: { lowStockThreshold: true },
  });

  const threshold = store?.lowStockThreshold ?? 5;

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    quantity: p.quantity,
    minStockLevel: p.minStockLevel,
    purchasePrice: p.purchasePrice,
    sellingPrice: p.sellingPrice,
    stockValue: p.quantity * p.purchasePrice,
    stockStatus: p.quantity === 0 ? "OUT_OF_STOCK" : p.quantity <= threshold ? "LOW_STOCK" : "IN_STOCK",
    imageUrl: p.imageUrl,
    active: p.active,
    lastUpdated: p.updatedAt,
    movements: p.inventoryMovements,
  }));

  // Filter by status client-side
  const filtered = status
    ? items.filter((i) => i.stockStatus === status)
    : items;

  return NextResponse.json({
    items: filtered,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
  quantity: z.number().int().positive(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = stockAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, storeId: session.user.storeId },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let newQty: number;
  if (parsed.data.type === "STOCK_IN") {
    newQty = product.quantity + parsed.data.quantity;
  } else if (parsed.data.type === "STOCK_OUT") {
    if (product.quantity < parsed.data.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.quantity}` },
        { status: 400 }
      );
    }
    newQty = product.quantity - parsed.data.quantity;
  } else {
    // ADJUSTMENT - quantity is the new absolute value
    newQty = parsed.data.quantity;
  }

  const [updatedProduct, movement] = await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { quantity: newQty },
    }),
    prisma.inventoryMovement.create({
      data: {
        storeId: session.user.storeId,
        productId: product.id,
        type: parsed.data.type,
        quantity: parsed.data.type === "ADJUSTMENT" ? newQty - product.quantity : parsed.data.quantity,
        previousQty: product.quantity,
        newQty,
        notes: parsed.data.notes || null,
      },
    }),
  ]);

  return NextResponse.json({ product: updatedProduct, movement }, { status: 201 });
}
