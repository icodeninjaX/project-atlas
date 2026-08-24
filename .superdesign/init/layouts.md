# Shared Layouts

## Root layout
- Path: `src/app/layout.tsx`
- Description: Global HTML/body shell, Geist fonts, theme provider, PWA registration, and toast host.

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/atlas/theme-provider";
import { PwaRegistration } from "@/components/offline/pwa-registration";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "ATLAS",
  title: {
    default: "ATLAS",
    template: "%s · ATLAS",
  },
  description:
    "A private personal operating system for money, work, goals, and weekly direction.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ATLAS",
  },
  icons: {
    icon: [
      { url: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegistration />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Public layout
- Path: `src/app/(public)/layout.tsx`
- Description: Public-site header with ATLAS identity, theme toggle, and login link.

```tsx
import Link from "next/link";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { ThemeToggle } from "@/components/atlas/theme-toggle";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="relative z-20 mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:ring-ring flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <AtlasMark />
          <span className="text-sm font-semibold">ATLAS</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Log in
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
```

## Authenticated layout
- Path: `src/app/(app)/layout.tsx`
- Description: Authenticated route guard and shared ATLAS application shell/header.

```tsx
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/atlas/app-header";
import { AppShell } from "@/components/atlas/app-shell";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?setup=required");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <OfflineProvider userId={user.id}>
      <AppShell>
        <AppHeader displayName={profile?.display_name ?? user.email} />
        {children}
      </AppShell>
    </OfflineProvider>
  );
}
```

## AppShell
- Path: `src/components/atlas/app-shell.tsx`
- Description: Responsive application chrome: desktop left sidebar, content offset, mobile safe-area bottom nav, and More popover.

```tsx
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
import { useEffect, useRef, useState } from "react";
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
  const moreNavigationRef = useRef<HTMLDivElement>(null);
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

    const closeOnPointerAway = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !moreNavigationRef.current?.contains(event.target)
      ) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnPointerAway);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnPointerAway);
    };
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
            <p className="text-sm font-semibold">ATLAS</p>
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
      <main
        id="main-content"
        className="min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:ml-64 lg:pb-0"
      >
        {children}
      </main>
      <nav
        aria-label="Primary navigation"
        className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 grid h-[calc(4.25rem+env(safe-area-inset-bottom))] grid-cols-6 items-start border-t px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {navigation.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "text-muted-foreground focus-visible:ring-ring flex h-17 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[9px] font-medium focus-visible:ring-2 focus-visible:outline-none sm:text-[10px]",
              isActive(href) && "text-primary",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
        <div
          ref={moreNavigationRef}
          className="relative flex min-w-0 justify-center"
        >
          {moreOpen && (
            <div
              id="mobile-more-menu"
              role="menu"
              aria-label="More navigation"
              className="border-border bg-popover text-popover-foreground absolute right-0 bottom-18 min-w-44 rounded-xl border p-1 shadow-lg"
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
            className="text-muted-foreground focus-visible:ring-ring flex h-17 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[9px] font-medium focus-visible:ring-2 focus-visible:outline-none sm:text-[10px]"
          >
            <Menu className="size-[18px]" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
```

## AppHeader
- Path: `src/components/atlas/app-header.tsx`
- Description: Shared authenticated top bar with identity, sync/install/search/theme, quick task, and sign-out actions.

```tsx
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/offline/install-app-button";
import { SignOutButton } from "@/components/offline/sign-out-button";
import { SyncStatus } from "@/components/offline/sync-status";

export function AppHeader({ displayName }: { displayName?: string | null }) {
  return (
    <header className="border-border flex min-h-18 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
      <div>
        <p className="text-muted-foreground text-xs">Signed in as</p>
        <p className="mt-0.5 text-sm font-semibold">
          {displayName || "ATLAS user"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <SyncStatus />
        <InstallAppButton />
        <Button asChild variant="ghost" size="icon">
          <Link href="/search" aria-label="Search">
            <Search className="size-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
          <Link href="/tasks?create=true">
            <Plus className="size-4" />
            Quick task
          </Link>
        </Button>
        <SignOutButton />
      </div>
    </header>
  );
}
```

## AtlasMark
- Path: `src/components/atlas/atlas-mark.tsx`
- Description: Code-rendered ATLAS brand mark used in public and desktop application chrome.

```tsx
import { cn } from "@/lib/utils";

export function AtlasMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-primary/35 bg-primary/10 relative grid size-9 place-items-center rounded-xl border",
        className,
      )}
    >
      <span className="bg-primary absolute h-5 w-px rotate-45" />
      <span className="bg-primary/50 absolute h-5 w-px -rotate-45" />
      <span className="bg-primary ring-primary/15 size-1.5 rounded-full ring-4" />
    </div>
  );
}
```

## ThemeToggle
- Path: `src/components/atlas/theme-toggle.tsx`
- Description: Shared icon button for switching between light and dark themes.

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(nextTheme)}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
```

## ThemeProvider
- Path: `src/components/atlas/theme-provider.tsx`
- Description: Thin application wrapper around next-themes.

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return <NextThemesProvider {...props} />;
}
```
