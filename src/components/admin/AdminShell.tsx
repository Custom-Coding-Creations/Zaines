"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminNav } from "./AdminNav";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { useAdminQueueCounts } from "./useAdminQueueCounts";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { counts, totalActionableCount } = useAdminQueueCounts();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminNav
          sidebarCollapsed={sidebarCollapsed}
          totalActionableCount={totalActionableCount}
          navCounts={counts}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
        <div className="flex">
          <AdminSidebar collapsed={sidebarCollapsed} navCounts={counts} />
          <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 sm:py-8">
            <AdminBreadcrumb />
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
