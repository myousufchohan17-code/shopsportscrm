import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ products: [], customers: [], orders: [] });
  }

  const [products, customers, orders] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId: session.user.storeId,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
          { barcode: { contains: q, mode: "insensitive" as const } },
          { brand: { contains: q, mode: "insensitive" as const } },
        ],
      },
      select: { id: true, name: true, sku: true, sellingPrice: true, imageUrl: true, category: { select: { name: true } } },
      take: 5,
    }),
    prisma.customer.findMany({
      where: {
        storeId: session.user.storeId,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        storeId: session.user.storeId,
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" as const } },
          { customerName: { contains: q, mode: "insensitive" as const } },
          { customerPhone: { contains: q, mode: "insensitive" as const } },
        ],
      },
      select: { id: true, orderNumber: true, customerName: true, status: true, total: true, createdAt: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ products, customers, orders });
}
