"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type AdminSubNavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const adminSubNavItems: AdminSubNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    match: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    match: (pathname) => pathname.startsWith("/admin/bookings"),
  },
  {
    href: "/admin/occupancy",
    label: "Occupancy",
    match: (pathname) => pathname.startsWith("/admin/occupancy"),
  },
  {
    href: "/admin/staff",
    label: "Staff",
    match: (pathname) => pathname.startsWith("/admin/staff"),
  },
  {
    href: "/admin/report-cards",
    label: "Report Cards",
    match: (pathname) => pathname.startsWith("/admin/report-cards"),
  },
  {
    href: "/admin/incidents",
    label: "Incidents",
    match: (pathname) => pathname.startsWith("/admin/incidents"),
  },
  {
    href: "/admin/packages",
    label: "Packages",
    match: (pathname) => pathname.startsWith("/admin/packages"),
  },
  {
    href: "/admin/recurring",
    label: "Recurring",
    match: (pathname) => pathname.startsWith("/admin/recurring"),
  },
  {
    href: "/admin/vaccine-alerts",
    label: "Vaccine Alerts",
    match: (pathname) => pathname.startsWith("/admin/vaccine-alerts"),
  },
  {
    href: "/admin/time-slots",
    label: "Time Slots",
    match: (pathname) => pathname.startsWith("/admin/time-slots"),
  },
  {
    href: "/admin/reminders",
    label: "Reminders",
    match: (pathname) => pathname.startsWith("/admin/reminders"),
  },
  {
    href: "/admin/activities",
    label: "Activity Log",
    match: (pathname) => pathname.startsWith("/admin/activities"),
  },
  {
    href: "/admin/photos",
    label: "Photos",
    match: (pathname) => pathname.startsWith("/admin/photos"),
  },
  {
    href: "/admin/contacts",
    label: "Emergency Contacts",
    match: (pathname) => pathname.startsWith("/admin/contacts"),
  },
  {
    href: "/admin/messages",
    label: "Customer Messages",
    match: (pathname) => pathname.startsWith("/admin/messages"),
  },
  {
    href: "/admin/association-audit",
    label: "Association Audit",
    match: (pathname) => pathname.startsWith("/admin/association-audit"),
  },
  {
    href: "/admin/finance",
    label: "Finance",
    match: (pathname) => pathname.startsWith("/admin/finance"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (pathname) => pathname.startsWith("/admin/settings"),
  },
];

export function AdminSubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());

  const handleNavigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  };

  const handlePrefetch = (href: string) => {
    if (href === pathname || prefetchedRoutesRef.current.has(href)) {
      return;
    }

    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  };

  return (
    <nav className="border-b bg-muted/30 px-6 py-2">
      <ul className="flex flex-wrap gap-2">
        {adminSubNavItems.map((item) => {
          const active = item.match(pathname);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={(event) => handleNavigate(event, item.href)}
                onMouseEnter={() => handlePrefetch(item.href)}
                onFocus={() => handlePrefetch(item.href)}
                onTouchStart={() => handlePrefetch(item.href)}
                className={`inline-flex rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
