"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const segmentLabels: Record<string, string> = {
  admin: "Overview",
  bookings: "Bookings",
  check: "Check",
  "check-in": "Check-In",
  "check-out": "Check-Out",
  occupancy: "Occupancy",
  staff: "Staff",
  "report-cards": "Report Cards",
  incidents: "Incidents",
  packages: "Packages",
  recurring: "Recurring",
  "vaccine-alerts": "Vaccine Alerts",
  "time-slots": "Time Slots",
  reminders: "Reminders",
  inventory: "Inventory",
  "play-groups": "Play Groups",
  activities: "Activity Log",
  photos: "Photos",
  contacts: "Emergency Contacts",
  crm: "CRM",
  pipeline: "Pipeline",
  campaigns: "Campaigns",
  messages: "Messages",
  "association-audit": "Association Audit",
  finance: "Finance",
  settings: "Settings",
  dashboard: "Overview",
  create: "Create",
  new: "Create",
};

function toTitleCase(value: string): string {
  return value
    .replaceAll("-", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelForSegment(segment: string): string {
  if (segmentLabels[segment]) {
    return segmentLabels[segment];
  }

  // Dynamic IDs (UUIDs, short IDs) become generic detail labels.
  if (/^[0-9a-f]{8,}$/i.test(segment) || /^\d+$/.test(segment)) {
    return "Detail";
  }

  return toTitleCase(segment);
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "admin" || segments.length <= 1) {
    return null;
  }

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: index === 0 ? "Overview" : labelForSegment(segment),
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4 hidden sm:block">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb.isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
            {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
