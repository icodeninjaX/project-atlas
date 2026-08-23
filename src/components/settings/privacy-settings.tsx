"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacyMode } from "@/components/privacy/privacy-provider";

export function PrivacySettings() {
  const { hidden, setHidden } = usePrivacyMode();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">Sensitive values</p>
        <p className="text-muted-foreground mt-1 max-w-lg text-xs leading-5">
          Mask balances, spending, debt, and salary figures on this device. The
          setting is local to this browser.
        </p>
      </div>
      <Button
        type="button"
        variant={hidden ? "default" : "secondary"}
        size="sm"
        aria-pressed={hidden}
        onClick={() => setHidden(!hidden)}
      >
        {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {hidden ? "Values hidden" : "Hide values"}
      </Button>
    </div>
  );
}
