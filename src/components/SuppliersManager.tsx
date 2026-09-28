"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ToastProvider";

type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  _count: { products: number };
  createdAt: string;
};

const emptyForm = { name: "", company: "", phone: "", email: "", address: "", notes: "" };

export function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/dashboard/suppliers?${params.toString()}`);
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    const res = await fetch("/api/dashboard/suppliers", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(editing ? "Supplier updated." : "Supplier added.");
      setEditing(null);
      setForm(emptyForm);
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong.");
    }
  }

  async function deleteSupplier() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/suppliers?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Supplier deleted.");
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

  function startEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      company: s.company ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
    });
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading suppliers…</p>;
  }

  return (
    <div className="space-y-6">
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Delete Supplier</p>
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
                onClick={deleteSupplier}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Suppliers</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your sports product suppliers and vendors.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="card h-fit">
          <h2 className="font-semibold text-[var(--text)]">
            {editing ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Supplier name"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company"
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
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes"
              rows={2}
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary flex-1">
                {editing ? "Save changes" : "Add Supplier"}
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="input-theme w-full rounded-xl py-2 pl-10 pr-3 text-sm"
            />
          </div>

          {suppliers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm text-[var(--text-dim)]">No suppliers found. Add your first supplier.</p>
            </div>
          )}

          <div className="space-y-2">
            {suppliers.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text)]">
                    {s.name}
                    {s.company && <span className="text-[var(--text-muted)]"> · {s.company}</span>}
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">
                    {[s.phone, s.email, s.address].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    {s._count.products} linked products
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
