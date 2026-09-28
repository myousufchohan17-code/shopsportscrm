"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { formatMoney, formatDateTime, STATUS_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from "@/lib/utils";
import { toast } from "@/components/ToastProvider";

type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: { id: string; name: string; imageUrl: string | null; sku: string } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  quantity: number;
  imageUrl: string | null;
  active: boolean;
  category: { id: string; name: string };
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export function OrdersManager() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [formDiscount, setFormDiscount] = useState("0");
  const [formTaxRate, setFormTaxRate] = useState("0");
  const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
  const [formPaymentStatus, setFormPaymentStatus] = useState("PENDING");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/dashboard/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [search, statusFilter, page]);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/dashboard/products?limit=100");
    const data = await res.json();
    setProducts(data.products ?? []);
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await fetch("/api/dashboard/customers?limit=100");
    const data = await res.json();
    setCustomers(data.customers ?? []);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Handle ?new=1 from quick actions
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      startNewOrder();
    }
  }, [searchParams]);

  function startNewOrder() {
    setEditingOrder(null);
    setFormCustomerId("");
    setFormCustomerName("");
    setFormItems([]);
    setFormDiscount("0");
    setFormTaxRate("0");
    setFormPaymentMethod("CASH");
    setFormPaymentStatus("PENDING");
    setFormNotes("");
    setShowForm(true);
  }

  function startEdit(order: Order) {
    setEditingOrder(order);
    setFormCustomerId(order.customerId ?? "");
    setFormCustomerName(order.customerName ?? "");
    setFormItems(order.items.map((i) => ({ productId: i.productId || "", quantity: i.quantity })));
    setFormDiscount(String(order.discount));
    setFormTaxRate("0");
    setFormPaymentMethod(order.paymentMethod || "CASH");
    setFormPaymentStatus(order.paymentStatus);
    setFormNotes(order.notes ?? "");
    setShowForm(true);
  }

  function addFormItem() {
    setFormItems([...formItems, { productId: "", quantity: 1 }]);
  }

  function removeFormItem(index: number) {
    setFormItems(formItems.filter((_, i) => i !== index));
  }

  function updateFormItem(index: number, field: "productId" | "quantity", value: string | number) {
    const next = [...formItems];
    next[index] = { ...next[index], [field]: value };
    setFormItems(next);
  }

  function calculateTotals() {
    const subtotal = formItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product ? product.sellingPrice * item.quantity : 0);
    }, 0);
    const discount = Number(formDiscount) || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = (taxableAmount * (Number(formTaxRate) || 0)) / 100;
    const total = taxableAmount + tax;
    return { subtotal, discount, tax, total };
  }

  async function saveOrder(e: React.FormEvent) {
    e.preventDefault();
    if (formItems.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }

    // Validate stock
    for (const item of formItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        toast.error("Please select a product for all items.");
        return;
      }
      if (product.quantity < item.quantity) {
        toast.error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
        return;
      }
    }

    setSaving(true);
    const totals = calculateTotals();

    try {
      const payload = {
        customerId: formCustomerId || null,
        customerName: formCustomerName.trim() || null,
        items: formItems,
        discount: totals.discount,
        taxRate: Number(formTaxRate) || 0,
        paymentMethod: formPaymentMethod,
        paymentStatus: formPaymentStatus,
        notes: formNotes.trim() || null,
      };

      const res = await fetch("/api/dashboard/orders", {
        method: editingOrder ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingOrder ? { orderId: editingOrder.id, ...payload } : payload),
      });

      if (res.ok) {
        toast.success(editingOrder ? "Order updated." : "Order created.");
        setShowForm(false);
        setEditingOrder(null);
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save order.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/orders?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted.");
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

  async function updateStatus(orderId: string, status: string) {
    const res = await fetch("/api/dashboard/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    if (res.ok) {
      toast.success("Order status updated.");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Update failed.");
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">Loading orders…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Delete Order</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Are you sure you want to delete order <span className="font-semibold text-[var(--text)]">{deleteTarget.orderNumber}</span>?
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
                onClick={deleteOrder}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View order modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Order {viewOrder.orderNumber}</h2>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-dim)]">Customer</p>
                  <p className="text-[var(--text)]">{viewOrder.customerName || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-[var(--text-dim)]">Date</p>
                  <p className="text-[var(--text)]">{formatDateTime(viewOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-dim)]">Status</p>
                  <p className="text-[var(--text)]">{STATUS_LABELS[viewOrder.status as keyof typeof STATUS_LABELS] ?? viewOrder.status}</p>
                </div>
                <div>
                  <p className="text-[var(--text-dim)]">Payment</p>
                  <p className="text-[var(--text)]">{PAYMENT_STATUS_LABELS[viewOrder.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? viewOrder.paymentStatus}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text)]">Items</p>
                <div className="space-y-2">
                  {viewOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm">
                      <span className="text-[var(--text)]">{item.productName} × {item.quantity}</span>
                      <span className="text-[var(--primary-bright)]">{formatMoney(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1 border-t border-[var(--border)] pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Subtotal</span>
                  <span className="text-[var(--text)]">{formatMoney(viewOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Discount</span>
                  <span className="text-[var(--text)]">-{formatMoney(viewOrder.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Tax</span>
                  <span className="text-[var(--text)]">{formatMoney(viewOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold">
                  <span className="text-[var(--text)]">Total</span>
                  <span className="text-[var(--primary-bright)]">{formatMoney(viewOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {editingOrder ? `Edit Order ${editingOrder.orderNumber}` : "Create New Order"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingOrder(null); }}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={saveOrder} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Customer</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => {
                      setFormCustomerId(e.target.value);
                      const cust = customers.find((c) => c.id === e.target.value);
                      if (cust) setFormCustomerName(cust.name);
                    }}
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Customer Name (if walk-in)</label>
                  <input
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="Walk-in"
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Order items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs text-[var(--text-muted)]">Order Items</label>
                  <button
                    type="button"
                    onClick={addFormItem}
                    className="rounded-lg border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary-bright)]"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formItems.map((item, idx) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={item.productId}
                          onChange={(e) => updateFormItem(idx, "productId", e.target.value)}
                          className="input-theme flex-1 rounded-xl px-3 py-2 text-sm"
                        >
                          <option value="">Select product</option>
                          {products.filter((p) => p.active !== false).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) - Stock: {p.quantity}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateFormItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
                          className="input-theme w-20 rounded-xl px-3 py-2 text-sm"
                        />
                        <span className="w-24 text-right text-sm text-[var(--primary-bright)]">
                          {product ? formatMoney(product.sellingPrice * item.quantity) : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFormItem(idx)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(e.target.value)}
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Payment Status</label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value)}
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Notes</label>
                  <input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Order notes..."
                    className="input-theme w-full rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Subtotal</span>
                    <span className="text-[var(--text)]">{formatMoney(calculateTotals().subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Discount</span>
                    <span className="text-[var(--text)]">-{formatMoney(calculateTotals().discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Tax</span>
                    <span className="text-[var(--text)]">{formatMoney(calculateTotals().tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold">
                    <span className="text-[var(--text)]">Total</span>
                    <span className="text-[var(--primary-bright)]">{formatMoney(calculateTotals().total)}</span>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? "Saving..." : editingOrder ? "Update Order" : "Create Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Orders</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and manage customer orders with inventory tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewOrder}
          className="btn-primary"
        >
          <Plus className="mr-1 inline h-4 w-4" />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer..."
            className="input-theme w-full rounded-xl py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-theme rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
          ))}
        </select>
      </div>

      {/* Orders list */}
      {orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm text-[var(--text-dim)]">No orders found. Create your first order.</p>
        </div>
      )}

      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-[var(--text)]">
                {order.orderNumber}{" "}
                <span className="text-[var(--text-muted)]">· {order.customerName || "Walk-in"}</span>
              </p>
              <p className="text-xs text-[var(--text-dim)]">
                {formatDateTime(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
              </span>
              <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                {PAYMENT_STATUS_LABELS[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? order.paymentStatus}
              </span>
              <span className="text-sm font-semibold text-[var(--primary-bright)]">
                {formatMoney(order.total)}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewOrder(order)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)]"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(order)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)]"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(order)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
