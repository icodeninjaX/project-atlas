"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-destructive font-mono text-xs font-semibold tracking-wider uppercase">
          Route interrupted
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          This view could not load.
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Check your connection and try again. Your saved records were not
          changed.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
