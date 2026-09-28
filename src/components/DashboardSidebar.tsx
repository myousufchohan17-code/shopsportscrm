"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingCart,
  Warehouse,
  Truck,
  BarChart3,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "dashboard"
  | "products"
  | "categories"
  | "customers"
  | "orders"
  | "inventory"
  | "suppliers"
  | "reports"
  | "settings";

const nav: { href: string; label: string; icon: LucideIcon; key: NavKey }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/dashboard/products", label: "Products", icon: Package, key: "products" },
  { href: "/dashboard/categories", label: "Categories", icon: Tags, key: "categories" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, key: "customers" },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, key: "orders" },
  { href: "/dashboard/inventory", label: "Inventory", icon: Warehouse, key: "inventory" },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck, key: "suppliers" },
  { href: "/dashboard/reports", label: "Sales Reports", icon: BarChart3, key: "reports" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, key: "settings" },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(href);
}

export function DashboardSidebar({
  active,
  storeName,
}: {
  active: NavKey;
  storeName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text)]">SPORTSHOP</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-dim)]">CRM</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-soft)] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-dim)]">{storeName}</p>
        </div>
      </aside>
    </>
  );
}
