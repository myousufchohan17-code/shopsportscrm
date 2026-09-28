import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { DashboardHome } from "@/components/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <DashboardShell active="dashboard">
      <DashboardHome />
    </DashboardShell>
  );
}
