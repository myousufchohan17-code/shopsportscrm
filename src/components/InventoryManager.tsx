"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Minus, AlertTriangle, Package } from "lucide-react";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: { id: string; name: string };
  quantity: number;
  minStockLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  imageUrl: string | null;
  active: boolean;
  lastUpdated: string;
  movements: {
    id: string;
    type: string;
    quantity: number;
    previousQty: number;
    newQty: number;
    notes: string | null;
    createdAt: string;
  }[];
};

export function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/dashboard/inventory?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function saveAdjustment() {
    if (!adjusting) return;
    const qty = Number(adjustQty);
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjusting,
          type: adjustType,
          quantity: adjustType === "ADJUSTMENT" ? qty : qty,
          notes: adjustNotes.trim() || null,
        }),
      });
      if (res.ok) {
        toast.success("Stock updated.");
        setAdjusting(null);
        setAdjustQty("1");
        setAdjustNotes("");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Update failed.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading inventory…</p>;
  }

  const totalValue = items.reduce((sum, i) => sum + i.stockValue, 0);
  const lowStockCount = items.filter((i) => i.stockStatus === "LOW_STOCK").length;
  const outOfStockCount = items.filter((i) => i.stockStatus === "OUT_OF_STOCK").length;

  return (
    <div className="space-y-6">
      {/* Adjustment modal */}
      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Adjust Stock</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {items.find((i) => i.id === adjusting)?.name}
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT")}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="STOCK_IN">Stock In (Add)</option>
                <option value="STOCK_OUT">Stock Out (Remove)</option>
                <option value="ADJUSTMENT">Adjustment (Set absolute)</option>
              </select>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Quantity"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setAdjusting(null)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] py-2.5 text-sm font-medium text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveAdjustment}
                className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Inventory</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Track stock levels, adjustments, and inventory history.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Total Stock Value</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary-bright)]">{formatMoney(totalValue)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Low Stock Items</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{lowStockCount}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Out of Stock</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, barcode..."
            className="input-theme w-full rounded-xl py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-theme rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Inventory list */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm text-[var(--text-dim)]">No products in inventory. Add products first.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-soft)]">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-4 w-4 text-[var(--text-dim)]" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[var(--text)]">
                  {item.name}
                  {item.stockStatus === "LOW_STOCK" && (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                      Low Stock
                    </span>
                  )}
                  {item.stockStatus === "OUT_OF_STOCK" && (
                    <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                      Out of Stock
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-dim)]">
                  {item.sku} · {item.category.name} · Stock: {item.quantity} · Value: {formatMoney(item.stockValue)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjusting(item.id);
                  setAdjustType("STOCK_IN");
                  setAdjustQty("1");
                  setAdjustNotes("");
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <Plus className="mr-1 inline h-3 w-3" />
                Stock In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjusting(item.id);
                  setAdjustType("STOCK_OUT");
                  setAdjustQty("1");
                  setAdjustNotes("");
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <Minus className="mr-1 inline h-3 w-3" />
                Stock Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjusting(item.id);
                  setAdjustType("ADJUSTMENT");
                  setAdjustQty(String(item.quantity));
                  setAdjustNotes("");
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Adjust
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-soft)] disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-soft)] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
