"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdminCameraCapture } from "@/components/admin/AdminCameraCapture";
import { MobileNav } from "@/components/mobile-nav";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";
import { navItems } from "@/config/site";
import { Phone } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showAdminCamera = status === "authenticated" && role === "admin";
  const { contactInfo, businessName } = useSiteSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="navigation"
      className={cn(
        "sticky top-0 z-50 w-full bg-card transition-all duration-300",
        scrolled
          ? "border-b shadow-sm"
          : "border-b border-transparent"
      )}
      style={{
        borderBottomColor: scrolled ? "var(--color-sky)" : "transparent",
      }}
    >
      <div className="container flex h-18 min-h-[4.5rem] items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link
          href="/"
          className="focus-ring group flex flex-shrink-0 items-center gap-2.5 rounded-lg"
          aria-label={`${businessName} — Home`}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-transform group-hover:scale-110"
            aria-hidden="true"
          >
            🐾
          </span>
          <div className="hidden sm:flex flex-col">
            <span className="font-display text-xl font-bold text-foreground tracking-tight leading-none">
              {businessName || "Zaine's Stay & Play"}
            </span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Doggy Daycare
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems
            .filter((item) => item.title !== "Book Now")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "focus-ring rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.title}
              </Link>
            ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href={`tel:${contactInfo.phone.replace(/\D/g, '')}`}
            className="hidden lg:flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            aria-label={`Call ${businessName}`}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span>{contactInfo.phone}</span>
          </a>
          <Link
            href="/book"
            className="hidden md:inline-flex items-center rounded-md px-3 py-2 text-sm font-bold transition-all"
            style={{
              background: "var(--color-yellow)",
              color: "var(--color-navy)",
            }}
          >
            <span className="mr-1.5" aria-hidden="true">🐾</span>
            Book a Playday
          </Link>
          {showAdminCamera ? <AdminCameraCapture /> : null}
          <UserNav />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

