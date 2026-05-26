"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminNavGroups, type AdminNavGroup } from "./admin-nav-config";
import type { AdminQueueCounts } from "./useAdminQueueCounts";

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  navCounts?: AdminQueueCounts;
}

export function AdminSidebar({ collapsed = false, navCounts = {} }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());

  // Track which groups are expanded (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(adminNavGroups.map((g) => g.id)),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

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
    if (href === pathname || prefetchedRoutesRef.current.has(href)) return;
    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  };

  const isGroupActive = (group: AdminNavGroup) =>
    group.items.some((item) => item.match(pathname));

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {adminNavGroups.map((group) => {
            const Icon = group.icon;
            const expanded = expandedGroups.has(group.id);
            const groupActive = isGroupActive(group);
            const groupBadgeCount = group.items.reduce((sum, item) => {
              if (!item.queueCountId) return sum;
              return sum + (navCounts[item.queueCountId] ?? 0);
            }, 0);

            if (collapsed) {
              // Collapsed mode: show only icons with tooltip
              const firstItem = group.items[0];
              return (
                <Tooltip key={group.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={firstItem.href}
                      onClick={(e) => handleNavigate(e, firstItem.href)}
                      onMouseEnter={() => handlePrefetch(firstItem.href)}
                      className={cn(
                        "relative flex items-center justify-center rounded-md p-2.5 transition-colors",
                        groupActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {groupBadgeCount > 0 ? (
                        <span
                          className={cn(
                            "absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-primary-foreground",
                            groupBadgeCount >= 10 ? "bg-destructive" : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                        </span>
                      ) : null}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {group.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            // Expanded mode: show full grouped nav
            return (
              <div key={group.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    groupActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      expanded ? "" : "-rotate-90",
                    )}
                  />
                </button>
                {expanded && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
                    {group.items.map((item) => {
                      const active = item.match(pathname);
                      const badgeCount = item.queueCountId ? navCounts[item.queueCountId] ?? 0 : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavigate(e, item.href)}
                          onMouseEnter={() => handlePrefetch(item.href)}
                          onFocus={() => handlePrefetch(item.href)}
                          className={cn(
                            "rounded-md px-2.5 py-1.5 text-sm transition-colors",
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
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
