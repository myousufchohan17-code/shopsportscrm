"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

const emptyForm = { name: "", phone: "", email: "", address: "", city: "", notes: "" };

export function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/dashboard/customers?${params.toString()}`);
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      notes: form.notes.trim() || null,
    };
    const res = await fetch("/api/dashboard/customers", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(editing ? "Customer updated." : "Customer added.");
      setEditing(null);
      setForm(emptyForm);
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong.");
    }
  }

  async function deleteCustomer() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/customers?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Customer deleted.");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Delete failed.");
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function startEdit(c: CustomerRow) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      notes: c.notes ?? "",
    });
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading customers…</p>;
  }

  return (
    <div className="space-y-6">
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Delete Customer</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">{deleteTarget.name}</span>?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] py-2.5 text-sm font-medium text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteCustomer}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Customers</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your customer relationships and track their orders.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="card h-fit">
          <h2 className="font-semibold text-[var(--text)]">
            {editing ? "Edit Customer" : "Add Customer"}
          </h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes"
              rows={2}
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary flex-1">
                {editing ? "Save changes" : "Add Customer"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(null); setForm(emptyForm); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, or city…"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>

          {customers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm text-[var(--text-dim)]">No customers found. Add your first customer.</p>
            </div>
          )}

          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-bold text-[var(--primary-bright)]">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/dashboard/customers/${c.id}`} className="font-medium text-[var(--text)] hover:text-[var(--primary-bright)]">
                      {c.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--text-dim)]">
                      {[c.phone, c.email, c.city].filter(Boolean).join(" · ") || "No contact info"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text)]">{c.orderCount}</p>
                    <p>orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--primary-bright)]">{formatMoney(c.totalSpent)}</p>
                    <p>spent</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
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
        </section>
      </div>
    </div>
  );
}
