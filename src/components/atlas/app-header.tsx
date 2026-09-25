import { AppHeaderActions } from "./app-header-actions";
import { AppHeaderTitle } from "./app-header-title";
import { AtlasMark } from "./atlas-mark";

export function AppHeader({ displayName }: { displayName?: string | null }) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 flex min-h-16 w-full max-w-full min-w-0 items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-6 lg:relative lg:h-18 lg:px-8 lg:pt-0">
      <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
        <AtlasMark className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] font-medium tracking-[0.12em] uppercase">
            ATLAS
          </p>
          <AppHeaderTitle className="truncate text-sm font-semibold" />
        </div>
      </div>
      <AppHeaderTitle className="hidden truncate text-base font-semibold tracking-tight lg:block" />
      <AppHeaderActions displayName={displayName} />
    </header>
  );
}
