import { LogOut, Plus, Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

export function AppHeader({ displayName }: { displayName?: string | null }) {
  return (
    <header className="border-border flex min-h-18 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
      <div>
        <p className="text-muted-foreground text-xs">Signed in as</p>
        <p className="mt-0.5 text-sm font-semibold">
          {displayName || "Atlas user"}
        </p>
      </div>
      <div className="flex items-center gap-1">
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
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
