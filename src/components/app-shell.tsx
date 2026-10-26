"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { motion } from "motion/react";
import {
  House,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Settings2,
  ShieldCheck,
  WifiOff,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Brand } from "./brand";
import { useDevice } from "./providers";
import { cn } from "@/lib/utils";
import { AddTransaction } from "./transaction-editor";
import { Button } from "./ui/button";
import { refreshData, useRefreshing } from "@/hooks/use-resource";
const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/insights", label: "Insights", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function RouteContent({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const selector = [
        ".page-heading",
        ".balance-card",
        ".metric-card",
        ".panel:not(.filters)",
        ".history-toolbar",
        ".day-group",
        ".lifetime-strip",
        ".installed-note",
        ".page-footer",
        ".skeleton-page",
      ].join(",");

      const reveal = (items: Element[], stagger = 0.055) => {
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 16, filter: "blur(5px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.58,
            stagger,
            ease: "power3.out",
            clearProps: "opacity,visibility,transform,filter",
          },
        );
      };

      reveal(Array.from(root.current?.querySelectorAll(selector) ?? []));

      const observer = new MutationObserver(records => {
        const additions = new Set<Element>();
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches(selector)) additions.add(node);
            node.querySelectorAll(selector).forEach(item => additions.add(item));
          }
        }
        if (additions.size) reveal(Array.from(additions), 0.035);
      });
      observer.observe(root.current!, { childList: true, subtree: true });

      return () => observer.disconnect();
    });

    return () => media.revert();
  }, [routeKey]);

  return (
    <div ref={root} className="route-content">
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { online, standalone, iosSafari } = useDevice();
  const refreshing = useRefreshing();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  return (
    <div className={cn("app-shell", standalone && iosSafari && "ios-standalone")}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" aria-label="Moni home">
          <Brand />
        </Link>
        <div className="sidebar-caption">YOUR PERSONAL FINANCES</div>
        <nav aria-label="Main navigation">
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn("desktop-nav-item", path === href && "active")}
              aria-current={path === href ? "page" : undefined}
            >
              {path === href && (
                <motion.span
                  className="desktop-nav-active"
                  layoutId="desktop-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/guide" className="shortcut-tip">
            <span className="tip-symbol">↗</span>
            <strong>A little less manual.</strong>
            <span>Let your iPhone log expenses.</span>
            <span className="tip-link">
              Connect Shortcuts <ArrowUpRight size={15} />
            </span>
          </Link>
          <div className="privacy-label">
            <ShieldCheck size={15} /> Just you. Always private.
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <Link href="/" className="mobile-brand" aria-label="Moni home">
            <Brand />
          </Link>
          <div className="desktop-breadcrumb">
            Your space <span>/</span> {tabs.find(t => t.href === path)?.label ?? "Shortcuts guide"}
          </div>
          <div className="topbar-actions">
            <span className="private-badge">
              <span /> Personal workspace
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh data"
              title="Refresh data"
              disabled={!online || refreshing}
              onClick={refreshData}
            >
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </Button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={17} />
            <span>You’re offline. Displayed amounts may be out of date. Changes are paused.</span>
          </div>
        )}
        <main id="main" className="main-content">
          <RouteContent routeKey={path}>{children}</RouteContent>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={cn("bottom-nav-item", path === href && "active")}
          >
            <span className="nav-icon">
              {path === href && (
                <motion.span
                  className="bottom-nav-active"
                  layoutId="bottom-nav-active"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon size={22} strokeWidth={path === href ? 2.2 : 1.7} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <AddTransaction />
    </div>
  );
}
