import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Goal,
  Landmark,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AtlasMark } from "./atlas-mark";

const navigation = [
  { href: "/dashboard", label: "Today", icon: Gauge },
  { href: "/money/accounts", label: "Money", icon: WalletCards },
  { href: "/debts", label: "Debts", icon: Landmark },
  { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/career", label: "Career", icon: BriefcaseBusiness },
  { href: "/reviews", label: "Reviews", icon: CircleDollarSign },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
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
              className="group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon className="text-muted-foreground group-hover:text-primary size-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-border border-t p-3">
          <Link
            href="/search"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm"
          >
            <Search className="size-[18px]" />
            Search
            <kbd className="border-border bg-background ml-auto rounded border px-1.5 font-mono text-[10px]">
              /
            </kbd>
          </Link>
          <Link
            href="/settings"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm"
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
            className="text-muted-foreground focus-visible:ring-ring flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
