"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminNavGroups } from "./admin-nav-config";
import type { AdminQueueCounts } from "./useAdminQueueCounts";

interface AdminMobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navCounts?: AdminQueueCounts;
}

export function AdminMobileDrawer({
  open,
  onOpenChange,
  navCounts = {},
}: AdminMobileDrawerProps) {
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
    onOpenChange(false);
  };

  const handlePrefetch = (href: string) => {
    if (href === pathname || prefetchedRoutesRef.current.has(href)) return;
    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  };

  const urgentActions = [
    {
      id: "pending_confirmations",
      label: "Pending confirmations",
      href: "/admin/bookings?status=pending",
      count: navCounts.pending_confirmations ?? 0,
    },
    {
      id: "actionable_staffing_exceptions",
      label: "Staffing exceptions",
      href: "/admin/play-groups?tab=staffing",
      count: navCounts.actionable_staffing_exceptions ?? 0,
    },
    {
      id: "unresolved_messages",
      label: "Unresolved messages",
      href: "/admin/messages",
      count: navCounts.unresolved_messages ?? 0,
    },
  ].filter((action) => action.count > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm">🐾 Staff Dashboard</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="flex flex-col gap-1 p-3">
            {urgentActions.length > 0 ? (
              <section className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  Urgent Actions
                </p>
                <div className="flex flex-col gap-1">
                  {urgentActions.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      onClick={(e) => handleNavigate(e, action.href)}
                      onMouseEnter={() => handlePrefetch(action.href)}
                      onTouchStart={() => handlePrefetch(action.href)}
                      className="rounded-md bg-background/80 px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{action.label}</span>
                        <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                          {action.count > 99 ? "99+" : action.count}
                        </Badge>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {adminNavGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.id} className="mb-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {group.label}
                  </div>
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = item.match(pathname);
                      const badgeCount = item.queueCountId ? navCounts[item.queueCountId] ?? 0 : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavigate(e, item.href)}
                          onMouseEnter={() => handlePrefetch(item.href)}
                          onTouchStart={() => handlePrefetch(item.href)}
                          className={cn(
                            "rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>{item.label}</span>
                            {badgeCount > 0 ? (
                              <Badge
                                variant={badgeCount >= 10 ? "destructive" : "secondary"}
                                className="h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                              >
                                {badgeCount > 99 ? "99+" : badgeCount}
                              </Badge>
                            ) : null}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
