/**
 * Quick Actions Dashboard Widget
 * 
 * Phase 6: Customer Portal - Quick access to common actions
 * 
 * Features:
 * - One-tap access to frequent tasks
 * - Visual icons for recognition
 * - Mobile-optimized grid layout
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MessageSquare,
  CreditCard,
  Settings,
  PawPrint,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Book a Stay",
    href: "/book",
    icon: Calendar,
    description: "Reserve your pup's next stay",
    color: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
    description: "Chat with our team",
    color: "bg-green-100 text-green-700 hover:bg-green-200",
  },
  {
    label: "My Pets",
    href: "/dashboard/pets",
    icon: PawPrint,
    description: "Manage pet profiles",
    color: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  },
  {
    label: "Wallet & Credits",
    href: "/dashboard/wallet",
    icon: CreditCard,
    description: "View balance and payments",
    color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  },
  {
    label: "Health Records",
    href: "/dashboard/records",
    icon: FileText,
    description: "Vaccines and medical info",
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Account preferences",
    color: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  },
];

export function QuickActions({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-xl p-4 transition-all",
                "hover:scale-105 hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                action.color
              )}
            >
              <Icon className="h-6 w-6 transition-transform group-hover:scale-110" aria-hidden="true" />
              <div className="text-center">
                <div className="text-sm font-semibold">{action.label}</div>
                <div className="mt-1 text-xs opacity-80 hidden sm:block">
                  {action.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
