"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyMode } from "@/components/privacy/privacy-provider";
import { SettingRow } from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";

export function PrivacySettings() {
  const { hidden, setHidden } = usePrivacyMode();

  return (
    <SettingRow
      icon={hidden ? EyeOff : Eye}
      tone={hidden ? "primary" : "muted"}
      title="Sensitive values"
      detail={
        <>
          Mask balances, spending, debt, and salary figures on this device. The
          setting is local to this browser.
          <span
            aria-hidden="true"
            className="bg-muted/80 text-foreground/80 ml-1.5 inline-flex rounded-md px-1.5 align-middle font-mono text-[11px]"
          >
            {hidden ? "₱ ••••••" : "₱ 48,250.00"}
          </span>
        </>
      }
    >
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
    </SettingRow>
  );
}
