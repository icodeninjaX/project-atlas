"use client";

import Link from "next/link";
import { useRef } from "react";
import { useScrollStrip } from "@/components/shared/scroll-strip";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/money/accounts", label: "Accounts" },
  { href: "/money/transactions", label: "Transactions" },
  { href: "/money/budget", label: "Budget" },
  { href: "/money/transfers", label: "Transfers" },
  { href: "/money/runway", label: "Runway" },
  { href: "/debts", label: "Debts" },
] as const;

export function MoneyNavigation({ currentHref }: { currentHref: string }) {
  const navRef = useRef<HTMLElement>(null);

  useScrollStrip(navRef, { activeKey: currentHref });

  return (
    <nav
      ref={navRef}
      aria-label="Money navigation"
      className="border-border bg-muted/50 mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-xl border p-1 [&::-webkit-scrollbar]:hidden"
    >
      {destinations.map(({ href, label }) => {
        const active = href === currentHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
