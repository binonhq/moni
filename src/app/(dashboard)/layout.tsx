import { requirePageSession } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { await requirePageSession(); return <AppShell>{children}</AppShell>; }
