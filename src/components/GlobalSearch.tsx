"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type SearchResults = {
  products: { id: string; name: string; sku: string; sellingPrice: number; imageUrl: string | null; category: { name: string } }[];
  customers: { id: string; name: string; email: string | null; phone: string | null }[];
  orders: { id: string; orderNumber: string; customerName: string | null; status: string; total: number; createdAt: string }[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search products, customers, orders..."
        className="input-theme w-64 rounded-xl py-2 pl-10 pr-4 text-sm"
      />

      {open && results && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow)]">
          {results.products.length === 0 && results.customers.length === 0 && results.orders.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-dim)]">
              No results found
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.products.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    Products
                  </p>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        router.push(`/dashboard/products?edit=${p.id}`);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-soft)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--text)]">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{p.sku} · {p.category.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.customers.length > 0 && (
                <div className="border-t border-[var(--border)] p-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    Customers
                  </p>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        router.push(`/dashboard/customers/${c.id}`);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-soft)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--text)]">{c.name}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{c.email || c.phone || "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.orders.length > 0 && (
                <div className="border-t border-[var(--border)] p-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    Orders
                  </p>
                  {results.orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        router.push(`/dashboard/orders?edit=${o.id}`);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-soft)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--text)]">{o.orderNumber}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{o.customerName || "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
