import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { SettingsManager } from "@/components/SettingsManager";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <DashboardShell active="settings">
      <SettingsManager />
    </DashboardShell>
  );
}
