"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Eye, ImagePlus } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  active: boolean;
  category: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type Category = { id: string; name: string };

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  categoryId: "",
  brand: "",
  description: "",
  imageUrl: "",
  purchasePrice: "",
  sellingPrice: "",
  quantity: "0",
  minStockLevel: "5",
  active: true,
};

export function ProductsManager() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/dashboard/products?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [search, categoryFilter, statusFilter, page]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/dashboard/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, statusFilter]);

  // Handle ?new=1 from quick actions
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setForm(emptyForm);
    }
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId,
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice),
      quantity: Number(form.quantity) || 0,
      minStockLevel: Number(form.minStockLevel) || 5,
      active: form.active,
    };

    const res = await fetch("/api/dashboard/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(editing ? "Product updated." : "Product added.");
      setEditing(null);
      setForm(emptyForm);
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong.");
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/products?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted.");
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

  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      categoryId: p.category.id,
      brand: p.brand ?? "",
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      purchasePrice: String(p.purchasePrice),
      sellingPrice: String(p.sellingPrice),
      quantity: String(p.quantity),
      minStockLevel: String(p.minStockLevel),
      active: p.active,
    });
  }

  async function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/dashboard/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Image upload failed.");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success("Image uploaded.");
    } catch {
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading products…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Delete Product</p>
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
                onClick={deleteProduct}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Products</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage your sports products, SKUs, and inventory.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Add / edit form */}
        <section className="card h-fit">
          <h2 className="font-semibold text-[var(--text)]">
            {editing ? "Edit Product" : "Add Product"}
          </h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Barcode"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Brand"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                placeholder="Selling price"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                placeholder="Purchase price"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="Quantity"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                placeholder="Min stock level"
                className="input-theme w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {/* Image upload */}
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-[var(--text-dim)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text)]">Product image</p>
                <p className="text-[10px] text-[var(--text-dim)]">JPG, PNG, WEBP · max 2MB</p>
                <div className="mt-2 flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={onImageFileChange}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary-bright)] disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="input-theme w-full rounded-xl px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary flex-1">
                {editing ? "Save changes" : "Add Product"}
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

        {/* Product list */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, barcode…"
                className="input-theme w-full rounded-xl py-2 pl-10 pr-3 text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-theme rounded-xl px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-theme rounded-xl px-3 py-2 text-sm"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm text-[var(--text-dim)]">No products found. Add your first product.</p>
            </div>
          )}

          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-soft)]">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-[var(--text-dim)]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text)]">
                      {p.name}{" "}
                      <span className="text-[var(--text-muted)]">· {formatMoney(p.sellingPrice)}</span>
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {p.sku} · {p.category.name} · Stock: {p.quantity}
                      {!p.active && <span className="ml-2 text-red-400">Inactive</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
        </section>
      </div>
    </div>
  );
}
