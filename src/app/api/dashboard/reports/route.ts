import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { isRevenueOrder } from "@/lib/utils";

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from") ?? dayKey(new Date());
  const toParam = searchParams.get("to") ?? dayKey(new Date());

  const from = startOfDay(fromParam);
  const to = new Date(startOfDay(toParam).getTime());
  to.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      storeId: session.user.storeId,
      createdAt: { gte: from, lte: to },
    },
    include: {
      items: { include: { product: { include: { category: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const revenueOrders = orders.filter((o) => isRevenueOrder(o.status));
  const revenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const productsSold = revenueOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const avgOrderValue = revenueOrders.length > 0 ? revenue / revenueOrders.length : 0;

  // Daily breakdown
  const daily: { date: string; orders: number; revenue: number }[] = [];
  const bucket = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const key = dayKey(new Date(o.createdAt));
    const b = bucket.get(key) ?? { orders: 0, revenue: 0 };
    b.orders += 1;
    if (isRevenueOrder(o.status)) b.revenue += o.total;
    bucket.set(key, b);
  }
  const cursor = new Date(from.getTime());
  while (cursor.getTime() <= to.getTime()) {
    const key = dayKey(cursor);
    daily.push({ date: key, ...(bucket.get(key) ?? { orders: 0, revenue: 0 }) });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Category breakdown
  const categoryMap = new Map<string, { quantity: number; revenue: number }>();
  for (const o of revenueOrders) {
    for (const item of o.items) {
      const catName = item.product?.category?.name ?? "Uncategorized";
      const ct = categoryMap.get(catName) ?? { quantity: 0, revenue: 0 };
      ct.quantity += item.quantity;
      ct.revenue += item.subtotal;
      categoryMap.set(catName, ct);
    }
  }
  const categoryBreakdown = [...categoryMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top selling products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number; category: string }>();
  for (const o of revenueOrders) {
    for (const item of o.items) {
      const key = item.productName || "Unknown";
      const existing = productMap.get(key) ?? {
        name: key,
        quantity: 0,
        revenue: 0,
        category: item.product?.category?.name ?? "Uncategorized",
      };
      existing.quantity += item.quantity;
      existing.revenue += item.subtotal;
      productMap.set(key, existing);
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Profit calculation (revenue - cost of goods sold)
  let profit = 0;
  for (const o of revenueOrders) {
    for (const item of o.items) {
      const product = item.product;
      if (product) {
        profit += item.subtotal - product.purchasePrice * item.quantity;
      }
    }
  }

  const recentOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    items: o.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
  }));

  return NextResponse.json({
    from: fromParam,
    to: toParam,
    summary: {
      totalOrders,
      revenueOrders: revenueOrders.length,
      revenue,
      averageOrderValue: avgOrderValue,
      productsSold,
      profit,
    },
    daily,
    categoryBreakdown,
    topProducts,
    recentOrders,
  });
}
