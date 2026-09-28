"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney, formatDate, STATUS_LABELS, ORDER_STATUSES } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type ReportData = {
  from: string;
  to: string;
  summary: {
    totalOrders: number;
    revenueOrders: number;
    revenue: number;
    averageOrderValue: number;
    productsSold: number;
    profit: number;
  };
  daily: { date: string; orders: number; revenue: number }[];
  categoryBreakdown: { name: string; quantity: number; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number; category: string }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    itemCount: number;
    items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  }[];
};

function toInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function ReportsManager() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toInput(d);
  });
  const [to, setTo] = useState(() => toInput(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/reports?from=${from}&to=${to}`, { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const maxDailyRevenue = useMemo(
    () => Math.max(1, ...(data?.daily.map((d) => d.revenue) ?? [1])),
    [data]
  );

  const presets = [
    {
      label: "Today",
      set: () => {
        const d = new Date();
        setFrom(toInput(d));
        setTo(toInput(d));
      },
    },
    {
      label: "7 Days",
      set: () => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        setFrom(toInput(d));
        setTo(toInput(new Date()));
      },
    },
    {
      label: "30 Days",
      set: () => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        setFrom(toInput(d));
        setTo(toInput(new Date()));
      },
    },
    {
      label: "3 Months",
      set: () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        setFrom(toInput(d));
        setTo(toInput(new Date()));
      },
    },
    {
      label: "6 Months",
      set: () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        setFrom(toInput(d));
        setTo(toInput(new Date()));
      },
    },
    {
      label: "1 Year",
      set: () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        setFrom(toInput(d));
        setTo(toInput(new Date()));
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Sales Reports</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Analyze your sports shop performance and sales data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-1 text-xs">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={p.set}
                className="rounded-lg px-3 py-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="input-theme rounded-xl px-3 py-2 text-sm"
          />
          <span className="text-xs text-[var(--text-dim)]">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => e.target.value && setTo(e.target.value)}
            className="input-theme rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Loading reports…</p>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card">
              <p className="text-xs text-[var(--text-muted)]">Revenue</p>
              <p className="mt-1 text-2xl font-bold text-[var(--primary-bright)]">{formatMoney(data.summary.revenue)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-[var(--text-muted)]">Orders</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)]">{data.summary.totalOrders}</p>
            </div>
            <div className="card">
              <p className="text-xs text-[var(--text-muted)]">Avg Order Value</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatMoney(data.summary.averageOrderValue)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-[var(--text-muted)]">Products Sold</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)]">{data.summary.productsSold}</p>
            </div>
          </div>

          {/* Profit card */}
          <div className="card">
            <p className="text-xs text-[var(--text-muted)]">Estimated Profit</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{formatMoney(data.summary.profit)}</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              Revenue minus cost of goods sold
            </p>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Revenue by Day</h2>
              {data.daily.length === 0 || data.summary.revenue === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
                  <p className="text-sm text-[var(--text-dim)]">No sales data available yet.</p>
                </div>
              ) : (
                <div className="flex h-48 items-end gap-1">
                  {data.daily.map((d) => (
                    <div key={d.date} className="group relative flex-1">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-[var(--primary)]/30 to-[var(--primary)]"
                        style={{ height: `${Math.max(2, (d.revenue / maxDailyRevenue) * 100)}%` }}
                      />
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text)] opacity-0 shadow transition-opacity group-hover:opacity-100">
                        {formatMoney(d.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Sales by Category</h2>
              {data.categoryBreakdown.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
                  <p className="text-sm text-[var(--text-dim)]">No sales data available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.categoryBreakdown.map((c) => {
                    const pct = data.summary.revenue > 0 ? (c.revenue / data.summary.revenue) * 100 : 0;
                    return (
                      <div key={c.name}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--text)]">{c.name}</span>
                          <span className="text-[var(--text-dim)]">{formatMoney(c.revenue)}</span>
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

          {/* Top products & Recent orders */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Best Sellers</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-[var(--text-dim)]">No sales in this period.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-xs text-[var(--text-dim)]">
                    <tr>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Sold</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((t, i) => (
                      <tr key={t.name} className="border-b border-[var(--border)]/50">
                        <td className="py-2.5 text-[var(--text)]">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[10px] font-bold text-[var(--primary-bright)]">
                            {i + 1}
                          </span>
                          {t.name}
                        </td>
                        <td className="py-2.5 text-[var(--text-dim)]">{t.category}</td>
                        <td className="py-2.5 text-[var(--text-dim)]">{t.quantity}</td>
                        <td className="py-2.5 text-right font-medium text-[var(--primary-bright)]">
                          {formatMoney(t.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Recent Orders</h2>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-[var(--text-dim)]">No orders in this period.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentOrders.slice(0, 10).map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm">
                      <div>
                        <p className="text-[var(--text)]">{o.orderNumber}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">
                          {o.customerName || "Walk-in"} · {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          {STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] ?? o.status}
                        </span>
                        <span className="font-semibold text-[var(--primary-bright)]">{formatMoney(o.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
