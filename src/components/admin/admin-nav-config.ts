import {
  Home,
  CalendarDays,
  ClipboardList,
  PawPrint,
  DollarSign,
  Users,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  queueCountId?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    items: [
      {
        href: "/admin",
        label: "Overview",
        match: (pathname) => pathname === "/admin" || pathname === "/admin/dashboard",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: ClipboardList,
    items: [
      {
        href: "/admin/bookings",
        label: "Bookings",
        match: (pathname) => pathname.startsWith("/admin/bookings") || pathname.startsWith("/admin/check-"),
        queueCountId: "pending_confirmations",
      },
      {
        href: "/admin/occupancy",
        label: "Occupancy",
        match: (pathname) => pathname.startsWith("/admin/occupancy"),
      },
      {
        href: "/admin/play-groups",
        label: "Play Groups",
        match: (pathname) => pathname.startsWith("/admin/play-groups"),
        queueCountId: "actionable_staffing_exceptions",
      },
    ],
  },
  {
    id: "pet-care",
    label: "Pet Care",
    icon: PawPrint,
    items: [
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
        href: "/admin/vaccine-alerts",
        label: "Vaccine Alerts",
        match: (pathname) => pathname.startsWith("/admin/vaccine-alerts"),
      },
      {
        href: "/admin/photos",
        label: "Photos",
        match: (pathname) => pathname.startsWith("/admin/photos"),
      },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling",
    icon: CalendarDays,
    items: [
      {
        href: "/admin/time-slots",
        label: "Time Slots",
        match: (pathname) => pathname.startsWith("/admin/time-slots"),
      },
      {
        href: "/admin/recurring",
        label: "Recurring",
        match: (pathname) => pathname.startsWith("/admin/recurring"),
      },
      {
        href: "/admin/reminders",
        label: "Reminders",
        match: (pathname) => pathname.startsWith("/admin/reminders"),
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: DollarSign,
    items: [
      {
        href: "/admin/finance",
        label: "Finance",
        match: (pathname) => pathname.startsWith("/admin/finance"),
      },
      {
        href: "/admin/packages",
        label: "Packages",
        match: (pathname) => pathname.startsWith("/admin/packages"),
      },
      {
        href: "/admin/inventory",
        label: "Inventory",
        match: (pathname) => pathname.startsWith("/admin/inventory"),
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    items: [
      {
        href: "/admin/crm",
        label: "CRM",
        match: (pathname) =>
          pathname === "/admin/crm" || pathname.startsWith("/admin/crm/"),
      },
      {
        href: "/admin/crm/pipeline",
        label: "Pipeline",
        match: (pathname) => pathname.startsWith("/admin/crm/pipeline"),
      },
      {
        href: "/admin/crm/campaigns",
        label: "Campaigns",
        match: (pathname) => pathname.startsWith("/admin/crm/campaigns"),
      },
      {
        href: "/admin/messages",
        label: "Messages",
        match: (pathname) => pathname.startsWith("/admin/messages"),
        queueCountId: "unresolved_messages",
      },
      {
        href: "/admin/contacts",
        label: "Emergency Contacts",
        match: (pathname) => pathname.startsWith("/admin/contacts"),
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: UserCog,
    items: [
      {
        href: "/admin/staff",
        label: "Staff",
        match: (pathname) => pathname.startsWith("/admin/staff"),
      },
      {
        href: "/admin/activities",
        label: "Activity Log",
        match: (pathname) => pathname.startsWith("/admin/activities"),
      },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        match: (pathname) => pathname.startsWith("/admin/settings"),
      },
      {
        href: "/admin/association-audit",
        label: "Association Audit",
        match: (pathname) => pathname.startsWith("/admin/association-audit"),
      },
    ],
  },
];

/** Flat list of all nav items for search/matching */
export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap(
  (group) => group.items,
);
