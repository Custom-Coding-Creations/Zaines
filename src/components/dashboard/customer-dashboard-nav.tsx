"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import type { ComponentType } from "react";
import { CalendarDays, ClipboardList, House, MessageSquareMore, PawPrint, Settings2, Shield, FileText, AlertTriangle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
};

const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: House,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    icon: CalendarDays,
    match: (pathname) => pathname.startsWith("/dashboard/bookings"),
  },
  {
    href: "/dashboard/pets",
    label: "Pets",
    icon: PawPrint,
    match: (pathname) => pathname.startsWith("/dashboard/pets"),
  },
  {
    href: "/dashboard/records",
    label: "Records",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/dashboard/records"),
  },
  {
    href: "/dashboard/updates",
    label: "Updates",
    icon: MessageSquareMore,
    match: (pathname) => pathname.startsWith("/dashboard/updates") || pathname.startsWith("/dashboard/messages"),
  },
  {
    href: "/dashboard/report-cards",
    label: "Report Cards",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/dashboard/report-cards"),
  },
  {
    href: "/dashboard/incidents",
    label: "Incidents",
    icon: AlertTriangle,
    match: (pathname) => pathname.startsWith("/dashboard/incidents"),
  },
  {
    href: "/dashboard/packages",
    label: "Packages",
    icon: Wallet,
    match: (pathname) => pathname.startsWith("/dashboard/packages"),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings2,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
  {
    href: "/dashboard/settings#security",
    label: "Security",
    icon: Shield,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
];

function DashboardNavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());

  const handlePrefetch = (href: string) => {
    if (href === pathname || prefetchedRoutesRef.current.has(href)) {
      return;
    }

    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  };

  return (
    <ul className={cn("gap-2", compact ? "grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3" : "space-y-1") }>
      {dashboardNavItems.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onMouseEnter={() => handlePrefetch(item.href)}
              onFocus={() => handlePrefetch(item.href)}
              onTouchStart={() => handlePrefetch(item.href)}
              className={cn(
                "focus-ring inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CustomerDashboardNav() {
  return (
    <aside className="paw-card p-3">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Customer Portal
      </p>
      <DashboardNavLinks />
    </aside>
  );
}

export function CustomerDashboardMobileNav() {
  return (
    <div className="paw-card p-3">
      <p className="px-1 pb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Quick Navigation
      </p>
      <DashboardNavLinks compact />
    </div>
  );
}
