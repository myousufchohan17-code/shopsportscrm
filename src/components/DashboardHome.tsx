"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Plus,
  UserPlus,
  ClipboardList,
  Warehouse,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatMoney, formatDateTime, STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type DashboardData = {
  stats: {
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    totalSales: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  }[];
  recentCustomers: {
    id: string;
    name: string;
    email: string | null;
    orderCount: number;
    createdAt: string;
  }[];
  topProducts: {
    productId: string | null;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  salesByCategory: { name: string; revenue: number }[];
  salesOverview: { date: string; revenue: number; orders: number }[];
};

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/dashboard", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--bg-soft)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <p className="text-[var(--text-dim)]">Failed to load dashboard data.</p>
      </div>
    );
  }

  const { stats, recentOrders, recentCustomers, topProducts, salesByCategory, salesOverview } = data;

  const maxRevenue = Math.max(1, ...salesOverview.map((s) => s.revenue));
  const totalCategoryRevenue = salesByCategory.reduce((sum, c) => sum + c.revenue, 0);

  const statCards = [
    {
      label: "Total Orders",
      value: String(stats.totalOrders),
      icon: ShoppingCart,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
    },
    {
      label: "Total Customers",
      value: String(stats.totalCustomers),
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Products in Stock",
      value: String(stats.totalProducts),
      icon: Package,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Total Sales",
      value: formatMoney(stats.totalSales),
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/20 via-[var(--bg-card)] to-[var(--bg-card)] p-6 sm:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Welcome Back,
          </h1>
          <p className="mt-1 text-lg font-semibold text-[var(--primary-bright)]">
            Manage Your Sports Business
          </p>
          <p className="mt-2 max-w-lg text-sm text-[var(--text-muted)]">
            Track orders, customers, inventory and grow your store with ease.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-[var(--primary)]/5 blur-2xl" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text)]">{card.value}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Overview */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Sales Overview</h2>
            <span className="text-xs text-[var(--text-dim)]">Last 30 days</span>
          </div>
          {salesOverview.length === 0 || maxRevenue === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--text-dim)]">No sales data available yet.</p>
            </div>
          ) : (
            <div className="flex h-48 items-end gap-1">
              {salesOverview.map((s, i) => (
                <div key={i} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[var(--primary)]/30 to-[var(--primary)] transition-all hover:from-[var(--primary)]/50 hover:to-[var(--primary-bright)]"
                    style={{ height: `${Math.max(2, (s.revenue / maxRevenue) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text)] opacity-0 shadow transition-opacity group-hover:opacity-100">
                    {formatMoney(s.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Category */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Sales by Category</h2>
          {salesByCategory.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--text-dim)]">No sales data available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salesByCategory.slice(0, 6).map((cat) => {
                const pct = totalCategoryRevenue > 0 ? (cat.revenue / totalCategoryRevenue) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--text)]">{cat.name}</span>
                      <span className="text-[var(--text-dim)]">{formatMoney(cat.revenue)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-bright)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-xs text-[var(--primary-bright)] hover:underline">
              View All
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--text-dim)]">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{order.orderNumber}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">
                      {order.customerName || "Walk-in"} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
                    </span>
                    <span className="text-sm font-semibold text-[var(--primary-bright)]">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Top Selling Products</h2>
            <Link href="/dashboard/products" className="text-xs text-[var(--primary-bright)] hover:underline">
              View All
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--text-dim)]">No sales data yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, idx) => (
                <div key={product.productId || idx} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary-bright)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{product.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{product.quantity} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--primary-bright)]">
                    {formatMoney(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Customers & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Customers */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Recent Customers</h2>
            <Link href="/dashboard/customers" className="text-xs text-[var(--primary-bright)] hover:underline">
              View All
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--text-dim)]">No customers yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary-bright)]">
                    {customer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{customer.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{customer.email || "—"}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{customer.orderCount} orders</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/products?new=1"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            >
              <Plus className="h-5 w-5 text-[var(--primary-bright)]" />
              <span className="text-xs font-medium text-[var(--text)]">Add Product</span>
            </Link>
            <Link
              href="/dashboard/customers?new=1"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            >
              <UserPlus className="h-5 w-5 text-[var(--primary-bright)]" />
              <span className="text-xs font-medium text-[var(--text)]">Add Customer</span>
            </Link>
            <Link
              href="/dashboard/orders?new=1"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            >
              <ClipboardList className="h-5 w-5 text-[var(--primary-bright)]" />
              <span className="text-xs font-medium text-[var(--text)]">Create Order</span>
            </Link>
            <Link
              href="/dashboard/inventory"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            >
              <Warehouse className="h-5 w-5 text-[var(--primary-bright)]" />
              <span className="text-xs font-medium text-[var(--text)]">Update Inventory</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
