"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney, formatDate, formatDateTime, STATUS_LABELS } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
  items?: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
};

export function CustomerProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`);
      if (!res.ok) {
        router.push("/dashboard/customers");
        return;
      }
      const data = await res.json();
      setCustomer(data.customer);
      setOrders(data.recentActivity ?? []);
      setNotesValue(data.customer.notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNotes() {
    if (!id) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue.trim() || null }),
      });
      if (res.ok) {
        setCustomer((prev) => prev ? { ...prev, notes: notesValue.trim() || null } : prev);
        setEditingNotes(false);
        toast.success("Notes saved.");
      }
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading customer…</p>;
  }

  if (!customer) return null;

  const totalSpent = orders
    .filter((o) => o.status === "COMPLETED" || o.status === "PROCESSING")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
        <Link href="/dashboard/customers" className="text-[var(--primary-bright)] hover:underline">
          Customers
        </Link>
        <span>/</span>
        <span className="text-[var(--text-muted)]">{customer.name}</span>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-2xl font-bold text-[var(--primary-bright)]">
            {customer.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[var(--text)]">{customer.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
              {customer.phone && <span>{customer.phone}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.city && <span>{customer.city}</span>}
              <span>Customer since {formatDate(customer.createdAt)}</span>
            </div>
          </div>
          <Link
            href="/dashboard/customers"
            className="btn-secondary text-sm"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{orders.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary-bright)]">{formatMoney(totalSpent)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Avg Order Value</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {orders.length > 0 ? formatMoney(totalSpent / orders.length) : "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-muted)]">Last Order</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {orders.length > 0 ? formatDate(orders[0].createdAt) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card">
          <h2 className="mb-4 font-semibold text-[var(--text)]">Order History</h2>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
              <p className="text-sm text-[var(--text-dim)]">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{o.orderNumber}</p>
                    <p className="text-[11px] text-[var(--text-dim)]">
                      {formatDateTime(o.createdAt)} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] ?? o.status}
                    </span>
                    <span className="text-sm font-semibold text-[var(--primary-bright)]">{formatMoney(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)]">Notes</h3>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-[var(--primary-bright)] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="mt-3">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={4}
                  className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="Add notes about this customer..."
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={saveNotes}
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {savingNotes ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNotes(false)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {customer.notes || "No notes yet."}
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-[var(--text)]">Contact Info</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-dim)]">Phone</span>
                <span className="text-[var(--text)]">{customer.phone || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-dim)]">Email</span>
                <span className="text-[var(--text)]">{customer.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-dim)]">City</span>
                <span className="text-[var(--text)]">{customer.city || "—"}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
