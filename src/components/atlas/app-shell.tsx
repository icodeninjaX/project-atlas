"use client";

import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Goal,
  Landmark,
  Menu,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AtlasMark } from "./atlas-mark";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Today", icon: Gauge },
  { href: "/money/accounts", label: "Money", icon: WalletCards },
  { href: "/debts", label: "Debts", icon: Landmark },
  { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/career", label: "Career", icon: BriefcaseBusiness },
  { href: "/reviews", label: "Reviews", icon: CircleDollarSign },
] as const;

const mobileMoreNavigation = [
  { href: "/career", label: "Career", icon: BriefcaseBusiness },
  { href: "/reviews", label: "Reviews", icon: CircleDollarSign },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/money/accounts") {
      return pathname?.startsWith("/money/") === true;
    }

    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  };

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <aside className="border-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:flex lg:flex-col">
        <Link
          href="/dashboard"
          className="border-border focus-visible:ring-ring flex h-20 items-center gap-3 border-b px-6 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <AtlasMark />
          <div>
            <p className="text-sm font-semibold">Project Atlas</p>
            <p className="text-muted-foreground text-[11px]">
              Personal operating system
            </p>
          </div>
        </Link>
        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive(href) &&
                  "bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              <Icon
                className={cn(
                  "text-muted-foreground group-hover:text-primary size-[18px]",
                  isActive(href) && "text-primary",
                )}
              />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-border border-t p-3">
          <Link
            href="/search"
            aria-current={isActive("/search") ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
              isActive("/search") &&
                "bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <Search className="size-[18px]" />
            Search
            <kbd className="border-border bg-background ml-auto rounded border px-1.5 font-mono text-[10px]">
              /
            </kbd>
          </Link>
          <Link
            href="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
              isActive("/settings") &&
                "bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <Settings className="size-[18px]" />
            Settings
          </Link>
        </div>
      </aside>
      <main id="main-content" className="min-h-dvh pb-20 lg:ml-64 lg:pb-0">
        {children}
      </main>
      <nav
        aria-label="Primary navigation"
        className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 flex h-17 items-center justify-around border-t px-2 backdrop-blur lg:hidden"
      >
        {navigation.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "text-muted-foreground focus-visible:ring-ring flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium focus-visible:ring-2 focus-visible:outline-none",
              isActive(href) && "text-primary",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
        <div className="relative flex min-w-14 justify-center">
          {moreOpen && (
            <div
              id="mobile-more-menu"
              role="menu"
              aria-label="More navigation"
              className="border-border bg-popover text-popover-foreground absolute right-0 bottom-14 min-w-44 rounded-xl border p-1 shadow-lg"
            >
              {mobileMoreNavigation.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm focus-visible:ring-2 focus-visible:outline-none",
                    isActive(href) &&
                      "bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                >
                  <Icon className="size-[18px]" />
                  {label}
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-controls="mobile-more-menu"
            aria-label="More navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className="text-muted-foreground focus-visible:ring-ring flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <Menu className="size-[18px]" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
