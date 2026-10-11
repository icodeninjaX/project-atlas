"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyMode } from "@/components/privacy/privacy-provider";
import { SettingRow } from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";

export function PrivacySettings({ className }: { className?: string }) {
  const { hidden, setHidden } = usePrivacyMode();

  return (
    <SettingRow
      icon={hidden ? EyeOff : Eye}
      title="Sensitive amounts"
      detail="Mask balances, spending, debt, and salary figures on this device. The setting is local to this browser."
      className={className}
    >
      <Button
        type="button"
        variant={hidden ? "default" : "secondary"}
        size="sm"
        aria-pressed={hidden}
        onClick={() => setHidden(!hidden)}
      >
        {hidden ? "Amounts hidden" : "Hide amounts"}
      </Button>
    </SettingRow>
  );
}
