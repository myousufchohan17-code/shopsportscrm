import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = session.user.storeId;

  const [
    totalOrders,
    totalCustomers,
    totalProducts,
    totalSales,
    recentOrders,
    recentCustomers,
    topProducts,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId, active: true } }),
    prisma.order.aggregate({
      where: { storeId, status: { in: ["COMPLETED", "PROCESSING"] } },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { storeId },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customer.findMany({
      where: { storeId },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { storeId, status: { in: ["COMPLETED", "PROCESSING"] } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.product.count({
      where: { storeId, active: true, quantity: { gt: 0, lte: 5 } },
    }),
    prisma.product.count({
      where: { storeId, active: true, quantity: 0 },
    }),
  ]);

  // Get category sales for donut chart
  const categorySales = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { storeId, status: { in: ["COMPLETED", "PROCESSING"] } } },
    _sum: { subtotal: true, quantity: true },
  });

  const productIds = categorySales.map((cs) => cs.productId).filter(Boolean) as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: { select: { name: true } } },
  });

  const productCategoryMap = new Map(products.map((p) => [p.id, p.category.name]));

  const categoryRevenue = new Map<string, number>();
  for (const cs of categorySales) {
    if (!cs.productId) continue;
    const catName = productCategoryMap.get(cs.productId) ?? "Other";
    const current = categoryRevenue.get(catName) ?? 0;
    categoryRevenue.set(catName, current + (cs._sum.subtotal ?? 0));
  }

  const salesByCategory = [...categoryRevenue.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Sales overview - last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesOverview = await prisma.order.groupBy({
    by: ["createdAt"],
    where: {
      storeId,
      status: { in: ["COMPLETED", "PROCESSING"] },
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: { total: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    stats: {
      totalOrders,
      totalCustomers,
      totalProducts,
      totalSales: totalSales._sum.total ?? 0,
      lowStockCount,
      outOfStockCount,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      createdAt: o.createdAt,
      items: o.items,
    })),
    recentCustomers: recentCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      orderCount: c._count.orders,
      createdAt: c.createdAt,
    })),
    topProducts: topProducts.map((tp) => ({
      productId: tp.productId,
      name: tp.productName,
      quantity: tp._sum.quantity ?? 0,
      revenue: tp._sum.subtotal ?? 0,
    })),
    salesByCategory,
    salesOverview: salesOverview.map((so) => ({
      date: so.createdAt,
      revenue: so._sum.total ?? 0,
      orders: so._count._all,
    })),
  });
}
