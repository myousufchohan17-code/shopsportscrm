import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-12 text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,31,47,0.15),transparent_55%)]" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <span className="mt-3 text-2xl font-bold text-[var(--text)]">SPORTSHOP</span>
          <span className="mt-1 text-xs uppercase tracking-[0.25em] text-[var(--text-dim)]">
            Create your sports shop
          </span>
        </Link>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow)] sm:p-8">
          <h1 className="text-2xl font-bold text-[var(--text)]">Get Started</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create your sports shop account and start managing your business.
          </p>
          <div className="mt-6">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
