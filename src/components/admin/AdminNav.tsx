"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeft, Pin, PinOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminNavGroups } from "./admin-nav-config";
import { AdminMobileDrawer } from "./AdminMobileDrawer";
import type { AdminQueueCounts } from "./useAdminQueueCounts";

const RECENT_PAGES_STORAGE_KEY = "admin-recent-pages";
const LAST_ADMIN_PAGE_STORAGE_KEY = "admin-last-page";
const PINNED_QUICK_ACTIONS_STORAGE_KEY = "admin-pinned-quick-actions";
const MAX_RECENT_PAGES = 6;
const MAX_PINNED_QUICK_ACTIONS = 3;

function getSearchScore(candidate: string, normalizedQuery: string): number | null {
  if (!normalizedQuery) return 1;

  const normalizedCandidate = candidate.toLowerCase();

  if (normalizedCandidate === normalizedQuery) return 200;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 140;
  if (normalizedCandidate.includes(normalizedQuery)) return 100;

  // Subsequence fallback: supports fuzzy shortcuts like "pg" -> "play groups".
  let queryIndex = 0;
  let gapPenalty = 0;

  for (let i = 0; i < normalizedCandidate.length && queryIndex < normalizedQuery.length; i += 1) {
    if (normalizedCandidate[i] === normalizedQuery[queryIndex]) {
      queryIndex += 1;
    } else {
      gapPenalty += 1;
    }
  }

  if (queryIndex !== normalizedQuery.length) return null;
  return Math.max(10, 70 - gapPenalty);
}

type PaletteItem = {
  href: string;
  label: string;
  queueCountId?: string;
  groupId: string;
  groupLabel: string;
};

type QuickAction = {
  key: string;
  label: string;
  href: string;
  queueCountId?: string;
  aliases: string[];
};

type SelectablePaletteEntry = {
  key: string;
  href: string;
};

interface AdminNavProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  navCounts?: AdminQueueCounts;
  totalActionableCount?: number;
}

export function AdminNav({
  sidebarCollapsed,
  onToggleSidebar,
  navCounts = {},
  totalActionableCount = 0,
}: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [recentPageHrefs, setRecentPageHrefs] = useState<string[]>([]);
  const [lastVisitedHref, setLastVisitedHref] = useState<string | null>(null);
  const [pinnedQuickActionKeys, setPinnedQuickActionKeys] = useState<string[]>([]);
  const [highlightedEntryKey, setHighlightedEntryKey] = useState<string | null>(null);

  const paletteItems = useMemo<PaletteItem[]>(
    () =>
      adminNavGroups.flatMap((group) =>
        group.items.map((item) => ({
          href: item.href,
          label: item.label,
          queueCountId: item.queueCountId,
          groupId: group.id,
          groupLabel: group.label,
        })),
      ),
    [],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = paletteQuery.trim().toLowerCase();

    return paletteItems
      .map((item) => {
        const score = Math.max(
          getSearchScore(item.label, normalizedQuery) ?? -1,
          getSearchScore(item.groupLabel, normalizedQuery) ?? -1,
          getSearchScore(item.href, normalizedQuery) ?? -1,
        );

        return { item, score };
      })
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [paletteItems, paletteQuery]);

  const visibleByGroup = useMemo(() => {
    return adminNavGroups
      .map((group) => ({
        id: group.id,
        label: group.label,
        items: visibleItems.filter((item) => item.groupId === group.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleItems]);

  const recentItems = useMemo(() => {
    const byHref = new Map(paletteItems.map((item) => [item.href, item]));
    return recentPageHrefs
      .map((href) => byHref.get(href))
      .filter((item): item is PaletteItem => Boolean(item));
  }, [paletteItems, recentPageHrefs]);

  const lastVisitedItem = useMemo(() => {
    if (!lastVisitedHref) return null;
    return paletteItems.find((item) => item.href === lastVisitedHref) ?? null;
  }, [lastVisitedHref, paletteItems]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "qa-pending-confirmations",
        label: "Review pending confirmations",
        href: "/admin/bookings?status=pending",
        queueCountId: "pending_confirmations",
        aliases: ["pending", "confirm", "bookings"],
      },
      {
        key: "qa-staffing-exceptions",
        label: "Resolve staffing exceptions",
        href: "/admin/play-groups?tab=staffing",
        queueCountId: "actionable_staffing_exceptions",
        aliases: ["staffing", "exceptions", "play groups", "pg"],
      },
      {
        key: "qa-unresolved-messages",
        label: "Handle unresolved messages",
        href: "/admin/messages",
        queueCountId: "unresolved_messages",
        aliases: ["messages", "inbox", "support"],
      },
      {
        key: "qa-failed-payments",
        label: "Triage failed payments",
        href: "/admin/finance?tab=transactions",
        queueCountId: "failed_payments",
        aliases: ["payments", "failed", "finance", "transactions"],
      },
      {
        key: "qa-low-stock",
        label: "Check low-stock inventory",
        href: "/admin/inventory",
        queueCountId: "low_stock_items",
        aliases: ["inventory", "stock", "supplies"],
      },
    ],
    [],
  );

  const quickActionByKey = useMemo(
    () => new Map(quickActions.map((action) => [action.key, action])),
    [quickActions],
  );

  const pinnedQuickActions = useMemo(
    () => pinnedQuickActionKeys
      .map((key) => quickActionByKey.get(key))
      .filter((action): action is QuickAction => Boolean(action)),
    [pinnedQuickActionKeys, quickActionByKey],
  );

  const visibleQuickActions = useMemo(() => {
    const prioritized = [...quickActions].sort((a, b) => {
      const countA = a.queueCountId ? navCounts[a.queueCountId] ?? 0 : 0;
      const countB = b.queueCountId ? navCounts[b.queueCountId] ?? 0 : 0;
      return countB - countA;
    });

    const pinnedSet = new Set(pinnedQuickActionKeys);
    const pinnedRanked = pinnedQuickActions;
    const unpinnedRanked = prioritized.filter((action) => !pinnedSet.has(action.key));
    const ordered = [...pinnedRanked, ...unpinnedRanked];

    const normalizedQuery = paletteQuery.trim().toLowerCase();
    if (!normalizedQuery) return ordered;

    return ordered
      .map((action) => {
        const aliasScore = action.aliases.reduce((best, alias) => {
          const aliasScoreCandidate = getSearchScore(alias, normalizedQuery) ?? -1;
          return Math.max(best, aliasScoreCandidate);
        }, -1);

        const score = Math.max(
          getSearchScore(action.label, normalizedQuery) ?? -1,
          getSearchScore(action.href, normalizedQuery) ?? -1,
          aliasScore,
        );

        return { action, score };
      })
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ action }) => action);
  }, [navCounts, paletteQuery, pinnedQuickActionKeys, pinnedQuickActions, quickActions]);

  const selectableEntries = useMemo<SelectablePaletteEntry[]>(() => {
    const entries: SelectablePaletteEntry[] = [];
    const queryIsEmpty = paletteQuery.trim().length === 0;

    entries.push(
      ...visibleQuickActions.map((action) => ({ key: action.key, href: action.href })),
    );

    if (queryIsEmpty) {
      if (lastVisitedItem) {
        entries.push({
          key: `resume-${lastVisitedItem.href}`,
          href: lastVisitedItem.href,
        });
      }

      entries.push(
        ...recentItems.map((item) => ({
          key: `recent-${item.href}`,
          href: item.href,
        })),
      );
    }

    for (const group of visibleByGroup) {
      entries.push(
        ...group.items.map((item) => ({
          key: `group-${group.id}-${item.href}`,
          href: item.href,
        })),
      );
    }

    return entries;
  }, [lastVisitedItem, paletteQuery, recentItems, visibleByGroup, visibleQuickActions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(RECENT_PAGES_STORAGE_KEY);
      if (!value) return;
      const parsed = JSON.parse(value) as string[];
      if (Array.isArray(parsed)) {
        setRecentPageHrefs(parsed.slice(0, MAX_RECENT_PAGES));
      }
    } catch {
      // Ignore malformed local storage content.
    }
  }, []);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(LAST_ADMIN_PAGE_STORAGE_KEY);
      if (!value) return;
      setLastVisitedHref(value);
    } catch {
      // Ignore malformed local storage content.
    }
  }, []);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(PINNED_QUICK_ACTIONS_STORAGE_KEY);
      if (!value) return;

      const parsed = JSON.parse(value) as string[];
      if (!Array.isArray(parsed)) return;

      const unique = [...new Set(parsed)].slice(0, MAX_PINNED_QUICK_ACTIONS);
      setPinnedQuickActionKeys(unique);
    } catch {
      // Ignore malformed local storage content.
    }
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/admin")) return;

    const currentAdminPath = `${window.location.pathname}${window.location.search}`;

    try {
      window.localStorage.setItem(LAST_ADMIN_PAGE_STORAGE_KEY, currentAdminPath);
    } catch {
      // Non-blocking persistence failure.
    }
    setLastVisitedHref(currentAdminPath);
  }, [pathname]);

  const upsertRecentPage = (href: string) => {
    setRecentPageHrefs((previous) => {
      const next = [href, ...previous.filter((entry) => entry !== href)].slice(
        0,
        MAX_RECENT_PAGES,
      );
      try {
        window.localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-blocking persistence failure.
      }
      return next;
    });
  };

  const handlePaletteNavigate = (href: string) => {
    setPaletteOpen(false);
    setPaletteQuery("");
    setHighlightedEntryKey(null);
    setLastVisitedHref(href);

    try {
      window.localStorage.setItem(LAST_ADMIN_PAGE_STORAGE_KEY, href);
    } catch {
      // Non-blocking persistence failure.
    }

    upsertRecentPage(href);
    router.push(href);
  };

  const prefetchPaletteTarget = (href: string) => {
    router.prefetch(href);
  };

  const togglePinnedQuickAction = (actionKey: string) => {
    setPinnedQuickActionKeys((previous) => {
      const exists = previous.includes(actionKey);
      const next = exists
        ? previous.filter((entry) => entry !== actionKey)
        : [actionKey, ...previous].slice(0, MAX_PINNED_QUICK_ACTIONS);

      try {
        window.localStorage.setItem(
          PINNED_QUICK_ACTIONS_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        // Non-blocking persistence failure.
      }

      return next;
    });
  };

  useEffect(() => {
    if (!paletteOpen) return;

    const highlightedStillExists = selectableEntries.some(
      (entry) => entry.key === highlightedEntryKey,
    );
    if (!highlightedStillExists) {
      setHighlightedEntryKey(selectableEntries[0]?.key ?? null);
    }
  }, [highlightedEntryKey, paletteOpen, selectableEntries]);

  useEffect(() => {
    if (!paletteOpen || !highlightedEntryKey) return;

    const element = document.getElementById(`palette-option-${highlightedEntryKey}`);
    element?.scrollIntoView({ block: "nearest" });
  }, [highlightedEntryKey, paletteOpen]);

  const moveHighlight = (direction: 1 | -1) => {
    if (selectableEntries.length === 0) return;

    const currentIndex = selectableEntries.findIndex(
      (entry) => entry.key === highlightedEntryKey,
    );

    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + selectableEntries.length) % selectableEntries.length;

    setHighlightedEntryKey(selectableEntries[nextIndex]?.key ?? null);
  };

  const onPaletteInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedEntryKey(selectableEntries[0]?.key ?? null);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedEntryKey(
        selectableEntries[selectableEntries.length - 1]?.key ?? null,
      );
      return;
    }

    const numericHotkeyMatch = event.key.match(/^[1-5]$/);
    if (numericHotkeyMatch && paletteQuery.trim().length === 0) {
      const actionIndex = Number(event.key) - 1;
      const targetAction = visibleQuickActions[actionIndex];
      if (!targetAction) return;
      event.preventDefault();
      handlePaletteNavigate(targetAction.href);
      return;
    }

    if (event.key !== "Enter") return;
    event.preventDefault();

    const selected = selectableEntries.find((entry) => entry.key === highlightedEntryKey);
    const fallback = selectableEntries[0];
    const target = selected ?? fallback;
    if (!target) return;

    handlePaletteNavigate(target.href);
  };

  const getPaletteButtonClassName = (entryKey: string) => {
    const isHighlighted = highlightedEntryKey === entryKey;
    return isHighlighted
      ? "w-full rounded-md bg-muted px-2 py-2 text-left text-sm"
      : "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted";
  };

  const getOptionProps = (entryKey: string) => ({
    id: `palette-option-${entryKey}`,
    role: "option" as const,
    "aria-selected": highlightedEntryKey === entryKey,
  });

  return (
    <>
      <nav className="sticky top-0 z-40 border-b bg-card px-4 sm:px-6 py-2.5 flex items-center gap-3 h-14">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-8 w-8"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        )}

        <span className="font-semibold text-sm">🐾 Staff Dashboard</span>

        <div className="ml-auto flex items-center gap-2">
          {lastVisitedItem && lastVisitedItem.href !== pathname ? (
            <Button
              variant="secondary"
              size="sm"
              className="hidden xl:inline-flex"
              onClick={() => handlePaletteNavigate(lastVisitedItem.href)}
            >
              Resume {lastVisitedItem.label}
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex gap-2"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open page jumper"
          >
            <Search className="h-4 w-4" />
            Jump
            <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl+K
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden h-8 w-8"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open page jumper"
          >
            <Search className="h-4 w-4" />
          </Button>

          {totalActionableCount > 0 ? (
            <Badge variant={totalActionableCount >= 10 ? "destructive" : "secondary"}>
              {totalActionableCount > 99 ? "99+" : totalActionableCount} alerts
            </Badge>
          ) : null}

          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground py-2 px-2 rounded-md hover:bg-muted transition-colors"
          >
            Admin Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground py-2 px-2 rounded-md hover:bg-muted transition-colors"
          >
            Customer View
          </Link>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AdminMobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        navCounts={navCounts}
      />

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Jump To Admin Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Type a page name..."
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              onKeyDown={onPaletteInputKeyDown}
              role="combobox"
              aria-expanded={paletteOpen}
              aria-controls="admin-command-palette-list"
              aria-activedescendant={
                highlightedEntryKey ? `palette-option-${highlightedEntryKey}` : undefined
              }
            />
            <p className="px-1 text-xs text-muted-foreground">
              Use up/down arrows to choose, Home/End to jump, numbers 1-5 for quick actions, then press Enter.
            </p>
            <div
              id="admin-command-palette-list"
              role="listbox"
              aria-label="Admin page and action results"
              className="max-h-80 overflow-y-auto space-y-3"
            >
              {visibleQuickActions.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Quick Actions
                  </p>
                  <div className="space-y-1">
                    {visibleQuickActions.map((action, index) => {
                      const badgeCount = action.queueCountId ? navCounts[action.queueCountId] ?? 0 : 0;
                      const isPinned = pinnedQuickActionKeys.includes(action.key);
                      return (
                        <div key={action.key} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePaletteNavigate(action.href)}
                            onMouseEnter={() => {
                              setHighlightedEntryKey(action.key);
                              prefetchPaletteTarget(action.href);
                            }}
                            className={`${getPaletteButtonClassName(action.key)} flex-1`}
                            {...getOptionProps(action.key)}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                {index < 5 ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] text-muted-foreground">
                                    {index + 1}
                                  </span>
                                ) : null}
                                <span>{action.label}</span>
                                {isPinned ? (
                                  <span className="text-[10px] uppercase tracking-wide text-primary">
                                    pinned
                                  </span>
                                ) : null}
                              </span>
                              {badgeCount > 0 ? (
                                <Badge
                                  variant={badgeCount >= 10 ? "destructive" : "secondary"}
                                  className="h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                                >
                                  {badgeCount > 99 ? "99+" : badgeCount}
                                </Badge>
                              ) : null}
                            </span>
                          </button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={isPinned ? `Unpin ${action.label}` : `Pin ${action.label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              togglePinnedQuickAction(action.key);
                            }}
                          >
                            {isPinned ? (
                              <PinOff className="h-4 w-4" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {paletteQuery.trim().length === 0 && lastVisitedItem ? (
                <section>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resume
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePaletteNavigate(lastVisitedItem.href)}
                    onMouseEnter={() => {
                      setHighlightedEntryKey(`resume-${lastVisitedItem.href}`);
                      prefetchPaletteTarget(lastVisitedItem.href);
                    }}
                    className={getPaletteButtonClassName(`resume-${lastVisitedItem.href}`)}
                    {...getOptionProps(`resume-${lastVisitedItem.href}`)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>Resume {lastVisitedItem.label}</span>
                      <span className="text-xs text-muted-foreground">Last page</span>
                    </span>
                  </button>
                </section>
              ) : null}

              {paletteQuery.trim().length === 0 && recentItems.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent
                  </p>
                  <div className="space-y-1">
                    {recentItems.map((item) => {
                      const badgeCount = item.queueCountId ? navCounts[item.queueCountId] ?? 0 : 0;
                      return (
                        <button
                          key={`recent-${item.href}`}
                          type="button"
                          onClick={() => handlePaletteNavigate(item.href)}
                          onMouseEnter={() => {
                            setHighlightedEntryKey(`recent-${item.href}`);
                            prefetchPaletteTarget(item.href);
                          }}
                          className={getPaletteButtonClassName(`recent-${item.href}`)}
                          {...getOptionProps(`recent-${item.href}`)}
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
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {visibleByGroup.length === 0 ? (
                <p className="px-2 py-1 text-sm text-muted-foreground">No matches found.</p>
              ) : (
                visibleByGroup.map((group) => (
                  <section key={group.id}>
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const badgeCount = item.queueCountId ? navCounts[item.queueCountId] ?? 0 : 0;
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => handlePaletteNavigate(item.href)}
                            onMouseEnter={() => {
                              setHighlightedEntryKey(`group-${group.id}-${item.href}`);
                              prefetchPaletteTarget(item.href);
                            }}
                            className={getPaletteButtonClassName(`group-${group.id}-${item.href}`)}
                            {...getOptionProps(`group-${group.id}-${item.href}`)}
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
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
