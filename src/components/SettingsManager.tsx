"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ToastProvider";

type Store = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
};

export function SettingsManager() {
  const [form, setForm] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/profile")
      .then((r) => r.json())
      .then((data) => setForm(data.store));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const res = await fetch("/api/dashboard/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setForm(data.store);
      toast.success("Settings saved.");
    } else {
      toast.error("Could not save settings.");
    }
  }

  if (!form) {
    return <p className="text-sm text-[var(--text-dim)]">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Configure your store preferences and business settings.
        </p>
      </div>

      <form onSubmit={onSave} className="max-w-2xl space-y-6">
        {/* Store Information */}
        <section className="card">
          <h2 className="font-semibold text-[var(--text)]">Store Information</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">Store Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">Description</span>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-[var(--text-muted)]">Phone</span>
                <input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[var(--text-muted)]">Email</span>
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">Address</span>
              <input
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">City</span>
              <input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        {/* Business Settings */}
        <section className="card">
          <h2 className="font-semibold text-[var(--text)]">Business Settings</h2>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-[var(--text-muted)]">Currency</span>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (Rs)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[var(--text-muted)]">Tax Rate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                  className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">Low Stock Threshold</span>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-[var(--text-dim)]">
                Products at or below this level will be marked as low stock
              </span>
            </label>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
