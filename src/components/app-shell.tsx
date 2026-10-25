"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { House, ArrowLeftRight, ChartNoAxesCombined, Settings2, ShieldCheck, WifiOff, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { useDevice } from "./providers";
import { cn } from "@/lib/utils";
const tabs = [{ href: "/", label: "Home", icon: House }, { href: "/transactions", label: "Transactions", icon: ArrowLeftRight }, { href: "/insights", label: "Insights", icon: ChartNoAxesCombined }, { href: "/settings", label: "Settings", icon: Settings2 }];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const { online } = useDevice();
  return <div className="app-shell"><a href="#main" className="skip-link">Skip to content</a>
    <aside className="sidebar"><Link href="/" aria-label="Moni home"><Brand /></Link><div className="sidebar-caption">YOUR PERSONAL FINANCES</div><nav aria-label="Main navigation">{tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("desktop-nav-item", path === href && "active")} aria-current={path === href ? "page" : undefined}><Icon size={20} strokeWidth={1.8} />{label}{path === href && <span className="nav-dot" />}</Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/guide" className="shortcut-tip"><span className="tip-symbol">↗</span><strong>A little less manual.</strong><span>Let your iPhone log expenses.</span><span className="tip-link">Connect Shortcuts <ArrowUpRight size={15} /></span></Link><div className="privacy-label"><ShieldCheck size={15} /> Just you. Always private.</div></div>
    </aside>
    <div className="main-column"><header className="topbar"><Link href="/" className="mobile-brand" aria-label="Moni home"><Brand /></Link><div className="desktop-breadcrumb">Your space <span>/</span> {tabs.find(t => t.href === path)?.label ?? "Shortcuts guide"}</div><span className="private-badge"><span /> Personal workspace</span></header>
      {!online && <div className="offline-banner" role="status"><WifiOff size={17} /><span>You’re offline. Displayed amounts may be out of date. Changes are paused.</span></div>}
      <main id="main" className="main-content"><motion.div key={path} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>{children}</motion.div></main>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={cn("bottom-nav-item", path === href && "active")}><span className="nav-icon"><Icon size={22} strokeWidth={path === href ? 2.2 : 1.7} /></span><span>{label}</span></Link>)}</nav>
  </div>;
}
