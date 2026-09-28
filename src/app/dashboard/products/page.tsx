import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { ProductsManager } from "@/components/ProductsManager";

export const metadata: Metadata = {
  title: "Products",
};

export default function ProductsPage() {
  return (
    <DashboardShell active="products">
      <ProductsManager />
    </DashboardShell>
  );
}
