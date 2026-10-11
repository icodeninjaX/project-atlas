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
      className="relative mt-6 flex [scrollbar-width:none] gap-6 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [&::-webkit-scrollbar]:hidden"
    >
      {destinations.map(({ href, label }) => {
        const active = href === currentHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring relative inline-flex min-h-11 shrink-0 items-center gap-2 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10",
              active
                ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
