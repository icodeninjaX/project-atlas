"use client";

import {
  BriefcaseBusiness,
  BookOpen,
  CalendarRange,
  ChartNoAxesCombined,
  ClipboardCheck,
  Gauge,
  Goal,
  History,
  Inbox,
  Landmark,
  Menu,
  NotebookPen,
  Radar,
  Search,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AtlasMark } from "./atlas-mark";
import { cn } from "@/lib/utils";

const destinations = {
  today: { href: "/dashboard", label: "Today", icon: Gauge },
  capture: { href: "/capture", label: "Capture", icon: Inbox },
  analyst: { href: "/analyst", label: "Analyst", icon: ChartNoAxesCombined },
  signals: { href: "/signals", label: "Signals", icon: Radar },
  money: { href: "/money/accounts", label: "Money", icon: WalletCards },
  debts: { href: "/debts", label: "Debts", icon: Landmark },
  tasks: { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  goals: { href: "/goals", label: "Goals", icon: Goal },
  history: { href: "/history", label: "History", icon: History },
  career: { href: "/career", label: "Career", icon: BriefcaseBusiness },
  reviews: { href: "/reviews", label: "Reviews", icon: NotebookPen },
  timeline: { href: "/timeline", label: "Timeline", icon: CalendarRange },
  knowledge: { href: "/knowledge", label: "Knowledge", icon: BookOpen },
} as const;

const navigationGroups = [
  {
    label: "Daily",
    destinations: [
      destinations.today,
      destinations.capture,
      destinations.analyst,
      destinations.tasks,
    ],
  },
  {
    label: "Plan",
    destinations: [
      destinations.money,
      destinations.debts,
      destinations.goals,
      destinations.career,
    ],
  },
  {
    label: "Reflect",
    destinations: [
      destinations.reviews,
      destinations.history,
      destinations.timeline,
      destinations.knowledge,
      destinations.signals,
    ],
  },
] as const;

const mobilePrimaryNavigation = [
  destinations.today,
  destinations.money,
  destinations.tasks,
  destinations.goals,
] as const;

const mobileMoreNavigation = [
  destinations.capture,
  destinations.analyst,
  destinations.debts,
  destinations.signals,
  destinations.career,
  destinations.reviews,
  destinations.history,
  destinations.timeline,
  destinations.knowledge,
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const moreSheetRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/money/accounts") {
      return pathname?.startsWith("/money/") === true;
    }

    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  };

  const moreDestinationActive = mobileMoreNavigation.some(({ href }) =>
    isActive(href),
  );

  useEffect(() => {
    const openGlobalDestination = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "/" && pathname !== "/search") {
        event.preventDefault();
        router.push("/search");
      }
      if (event.key.toLowerCase() === "n" && !pathname?.startsWith("/tasks")) {
        event.preventDefault();
        router.push("/tasks?create=true");
      }
    };

    window.addEventListener("keydown", openGlobalDestination);
    return () => window.removeEventListener("keydown", openGlobalDestination);
  }, [pathname, router]);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
      if (event.key !== "Tab") return;

      const focusable = moreSheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      setKeyboardOpen(window.innerHeight - viewport.height > 160);
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    return () => viewport.removeEventListener("resize", updateKeyboardState);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-dvh w-full max-w-full min-w-0">
      <a
        href="#main-content"
        className="bg-primary-solid text-primary-solid-foreground sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <aside className="border-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:flex lg:flex-col">
        <Link
          href="/dashboard"
          className="border-border focus-visible:ring-ring flex h-18 shrink-0 items-center gap-3 border-b px-6 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <AtlasMark />
          <div>
            <p className="text-sm font-semibold">ATLAS</p>
            <p className="text-muted-foreground text-[11px]">
              Personal operating system
            </p>
          </div>
        </Link>
        <nav
          aria-label="Primary navigation"
          className="flex-1 space-y-5 overflow-y-auto px-3 py-5"
        >
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="text-muted-foreground/75 mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.destinations.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "group text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-ring relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      isActive(href) &&
                        "bg-primary/10 text-foreground hover:bg-primary/12 before:bg-primary before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "text-muted-foreground group-hover:text-primary size-[17px]",
                        isActive(href) && "text-primary",
                      )}
                    />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-border space-y-0.5 border-t p-3">
          {(
            [
              { href: "/search", label: "Search", icon: Search, shortcut: "/" },
              {
                href: "/settings",
                label: "Settings",
                icon: Settings,
                shortcut: undefined,
              },
            ] as const
          ).map(({ href, label, icon: Icon, shortcut }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "group text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-ring relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive(href) &&
                  "bg-primary/10 text-foreground hover:bg-primary/12 before:bg-primary before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground group-hover:text-primary size-[17px]",
                  isActive(href) && "text-primary",
                )}
              />
              {label}
              {shortcut && (
                <kbd className="border-border bg-background text-muted-foreground ml-auto rounded-md border px-1.5 py-px text-[10px]">
                  {shortcut}
                </kbd>
              )}
            </Link>
          ))}
        </div>
      </aside>
      <main
        id="main-content"
        className={cn(
          "min-h-dvh w-full max-w-full min-w-0 lg:ml-64 lg:w-auto lg:pb-0",
          keyboardOpen
            ? "pb-0"
            : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      <nav
        aria-label="Primary navigation"
        className={cn(
          "border-border bg-background/97 fixed inset-x-0 bottom-0 z-40 h-[calc(4.75rem+env(safe-area-inset-bottom))] w-full max-w-full grid-cols-5 items-start border-t px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] backdrop-blur lg:hidden",
          keyboardOpen ? "hidden" : "grid",
        )}
      >
        {mobilePrimaryNavigation.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "text-muted-foreground focus-visible:ring-ring relative flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none",
              isActive(href) && "text-primary font-semibold",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl transition-colors",
                isActive(href) && "bg-primary/12",
              )}
            >
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        ))}
        <div className="flex min-w-0 justify-center">
          <button
            ref={moreButtonRef}
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-controls="mobile-more-sheet"
            aria-label="More navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "text-muted-foreground focus-visible:ring-ring flex min-h-[4.5rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              (moreOpen || moreDestinationActive) &&
                "text-primary font-semibold",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl border border-transparent transition-colors",
                (moreOpen || moreDestinationActive) &&
                  "bg-primary/12 text-primary",
              )}
            >
              <Menu className="size-5" />
            </span>
            More
          </button>
        </div>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Dismiss more navigation"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              setMoreOpen(false);
              moreButtonRef.current?.focus();
            }}
          />
          <section
            ref={moreSheetRef}
            id="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="border-border bg-card text-card-foreground absolute inset-x-0 bottom-0 max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="bg-border mx-auto mb-3 h-1 w-10 rounded-full" />
            <div className="flex min-h-11 items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p
                    id="mobile-more-title"
                    className="text-base font-semibold tracking-tight"
                  >
                    More destinations
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Everything beyond today’s core route.
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close more navigation"
                onClick={() => {
                  setMoreOpen(false);
                  moreButtonRef.current?.focus();
                }}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 place-items-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav
              aria-label="More destinations"
              className="border-border mt-4 grid grid-cols-1 overflow-hidden rounded-2xl border min-[360px]:grid-cols-2"
            >
              {mobileMoreNavigation.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "border-border hover:bg-muted/60 focus-visible:ring-ring flex min-h-16 min-w-0 items-center gap-3 border-b px-3 text-sm font-medium transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset min-[360px]:odd:border-r min-[360px]:odd:last:col-span-2 min-[360px]:odd:last:border-r-0",
                    isActive(href) && "bg-primary/10 text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl",
                      isActive(href) && "bg-primary/15 text-primary",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  {label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
