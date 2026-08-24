import { AppHeaderActions } from "./app-header-actions";
import { AtlasMark } from "./atlas-mark";

export function AppHeader({ displayName }: { displayName?: string | null }) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 flex min-h-16 items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-6 lg:static lg:min-h-18 lg:px-8 lg:pt-0">
      <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
        <AtlasMark className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">ATLAS</p>
          <p className="text-muted-foreground truncate text-[11px]">
            {displayName || "ATLAS user"}
          </p>
        </div>
      </div>
      <div className="hidden lg:block">
        <p className="text-muted-foreground text-xs">Signed in as</p>
        <p className="mt-0.5 text-sm font-semibold">
          {displayName || "ATLAS user"}
        </p>
      </div>
      <AppHeaderActions />
    </header>
  );
}
