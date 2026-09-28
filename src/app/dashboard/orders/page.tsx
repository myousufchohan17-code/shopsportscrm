import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { OrdersManager } from "@/components/OrdersManager";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <DashboardShell active="orders">
      <OrdersManager />
    </DashboardShell>
  );
}
