"use client";

import {
  ArrowLeftRight,
  ChartPie,
  Hourglass,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useScrollStrip } from "@/components/shared/scroll-strip";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/money/accounts", label: "Accounts", icon: WalletCards },
  { href: "/money/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/money/budget", label: "Budget", icon: ChartPie },
  { href: "/money/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/money/runway", label: "Runway", icon: Hourglass },
  { href: "/debts", label: "Debts", icon: Landmark },
] as const;

export function MoneyNavigation({ currentHref }: { currentHref: string }) {
  const navRef = useRef<HTMLElement>(null);

  useScrollStrip(navRef, { activeKey: currentHref });

  return (
    <nav
      ref={navRef}
      aria-label="Money navigation"
      className="border-border bg-muted/50 mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-full border p-1 [&::-webkit-scrollbar]:hidden"
    >
      {destinations.map(({ href, label, icon: Icon }) => {
        const active = href === currentHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10",
              active
                ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-4 shrink-0", active && "text-primary")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
