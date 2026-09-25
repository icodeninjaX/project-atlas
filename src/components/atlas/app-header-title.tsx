"use client";

import { usePathname } from "next/navigation";

const pageTitles: Array<[prefix: string, title: string]> = [
  ["/dashboard", "Today"],
  ["/capture", "Capture"],
  ["/analyst", "Analyst"],
  ["/signals", "Signals"],
  ["/money/accounts", "Accounts"],
  ["/money/transactions", "Transactions"],
  ["/money/transfers", "Transfers"],
  ["/money/budget", "Budget"],
  ["/money/runway", "Runway"],
  ["/money", "Money"],
  ["/debts", "Debts"],
  ["/tasks", "Tasks"],
  ["/goals", "Goals"],
  ["/career", "Career"],
  ["/reviews", "Reviews"],
  ["/history", "History"],
  ["/timeline", "Timeline"],
  ["/knowledge", "Knowledge"],
  ["/search", "Search"],
  ["/settings", "Settings"],
  ["/onboarding", "Welcome"],
];

export function pageTitleFor(pathname: string | null): string {
  if (!pathname) return "ATLAS";
  const match = pageTitles.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.[1] ?? "ATLAS";
}

export function AppHeaderTitle({ className }: { className?: string }) {
  const pathname = usePathname();
  return <p className={className}>{pageTitleFor(pathname)}</p>;
}
