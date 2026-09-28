"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/components/ToastProvider";

type Category = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  _count: { products: number };
};

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/dashboard/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      toast.success("Category created.");
      load();
    }
  }

  async function saveRename(id: string) {
    if (editingName.trim()) {
      await fetch("/api/dashboard/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editingName.trim(), description: editingDesc.trim() || null }),
      });
      toast.success("Category updated.");
    }
    setEditingId(null);
    load();
  }

  async function deleteCategory() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/dashboard/categories?id=${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted.");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Delete failed.");
    }
    setDeleteTarget(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    const a = next[index];
    const b = next[target];
    await Promise.all([
      fetch("/api/dashboard/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }),
      }),
      fetch("/api/dashboard/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }),
      }),
    ]);
    load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading categories…</p>;
  }

  return (
    <div className="space-y-6">
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Delete Category</p>
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
                onClick={deleteCategory}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Categories</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Organize your sports products into categories.
        </p>
      </div>

      <form onSubmit={createCategory} className="flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="input-theme min-w-[220px] flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Description (optional)"
          className="input-theme min-w-[220px] flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-primary">
          <Plus className="mr-1 inline h-4 w-4" />
          Add Category
        </button>
      </form>

      {categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm text-[var(--text-dim)]">No categories yet. Create one above.</p>
        </div>
      )}

      <div className="space-y-2">
        {categories.map((c, i) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-6 text-center text-xs text-[var(--text-dim)]">{i + 1}</span>
              {editingId === c.id ? (
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(c.id)}
                    className="input-theme rounded-lg px-2 py-1 text-sm"
                  />
                  <input
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    placeholder="Description"
                    className="input-theme rounded-lg px-2 py-1 text-sm"
                  />
                </div>
              ) : (
                <>
                  <p className="font-medium text-[var(--text)]">{c.name}</p>
                  <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                    {c._count.products} products
                  </span>
                  {!c.active && <span className="text-[10px] text-red-400">Inactive</span>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === categories.length - 1}
                  onClick={() => move(i, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {editingId === c.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveRename(c.id)}
                    className="rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditingName(c.name);
                    setEditingDesc(c.description ?? "");
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
