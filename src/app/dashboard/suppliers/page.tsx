import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { SuppliersManager } from "@/components/SuppliersManager";

export const metadata: Metadata = {
  title: "Suppliers",
};

export default function SuppliersPage() {
  return (
    <DashboardShell active="suppliers">
      <SuppliersManager />
    </DashboardShell>
  );
}
