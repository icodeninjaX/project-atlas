"use client";

import { Moon, MoreHorizontal, Plus, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InstallAppButton } from "@/components/offline/install-app-button";
import { SignOutButton } from "@/components/offline/sign-out-button";
import { SyncStatus } from "@/components/offline/sync-status";
import { PrivacyToggle } from "@/components/privacy/privacy-toggle";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";

export function AppHeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOnPointerAway = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnPointerAway);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnPointerAway);
    };
  }, [menuOpen]);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="hidden xl:block">
        <SyncStatus />
      </div>
      <div className="hidden min-[360px]:block">
        <TooltipHint label="Search ATLAS">
          <Button asChild variant="ghost" size="icon">
            <Link href="/search" aria-label="Search ATLAS">
              <Search className="size-4" />
            </Link>
          </Button>
        </TooltipHint>
      </div>

      <div className="hidden lg:block">
        <Button asChild size="sm">
          <Link href="/tasks?create=true">
            <Plus className="size-4" />
            Quick task
          </Link>
        </Button>
      </div>

      <div ref={menuRef} className="relative">
        <TooltipHint label="Account controls">
          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open account controls"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-controls="mobile-account-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </TooltipHint>
        {menuOpen && (
          <div
            id="mobile-account-menu"
            role="dialog"
            aria-label="Account controls"
            className="border-border bg-card text-card-foreground absolute top-12 right-0 z-50 max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] w-[min(15rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-2 shadow-xl"
          >
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start min-[360px]:hidden"
            >
              <Link href="/search" onClick={() => setMenuOpen(false)}>
                <Search className="size-4" />
                Search ATLAS
              </Link>
            </Button>
            <div className="border-border mb-1 border-b px-2 py-2 xl:hidden">
              <SyncStatus showLabel />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setTheme(nextTheme);
                setMenuOpen(false);
              }}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              {resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
            </Button>
            <PrivacyToggle showLabel />
            <InstallAppButton showLabel />
            <SignOutButton showLabel />
          </div>
        )}
      </div>
    </div>
  );
}
