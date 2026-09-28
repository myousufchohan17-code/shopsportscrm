import { auth, signOut } from "@/lib/auth";
import { DashboardSidebar, type NavKey } from "@/components/DashboardSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";

export async function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: NavKey;
}) {
  const session = await auth();
  const userName = session?.user.name || "Admin";
  const roleLabel = session?.user.role === "ADMIN" ? "Administrator" : "Staff";
  const storeName = session?.user.storeName || "SportShop";

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <DashboardSidebar active={active} storeName={storeName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-elevated)]/80">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/20">
              <span className="text-sm font-bold text-[var(--primary-bright)]">S</span>
            </div>
            <span className="truncate text-sm font-semibold text-[var(--text)]">
              {storeName}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <GlobalSearch />
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[11px] font-bold leading-none text-[var(--primary-bright)]">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-[var(--text)]">{userName}</p>
                <p className="truncate text-[10px] text-[var(--text-dim)]">{roleLabel}</p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary-bright)]"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
