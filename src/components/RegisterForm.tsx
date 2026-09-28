"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function RegisterForm() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewSlug = slugTouched ? slug : slugify(storeName);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalSlug = previewSlug;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          slug: finalSlug,
          adminName: adminName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-muted)]">Store Name</span>
        <input
          required
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          className="input-theme w-full rounded-xl px-4 py-3 text-sm"
          placeholder="Your sports shop name"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-muted)]">URL Slug</span>
        <input
          required
          value={previewSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="input-theme w-full rounded-xl px-4 py-3 text-sm"
          placeholder="my-sportshop"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-muted)]">Your Name</span>
        <input
          required
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          className="input-theme w-full rounded-xl px-4 py-3 text-sm"
          placeholder="Admin name"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-muted)]">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-theme w-full rounded-xl px-4 py-3 text-sm"
          placeholder="you@sportshop.com"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-muted)]">Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-theme w-full rounded-xl px-4 py-3 text-sm"
          placeholder="At least 6 characters"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider"
      >
        {loading ? "Creating…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--primary-bright)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
