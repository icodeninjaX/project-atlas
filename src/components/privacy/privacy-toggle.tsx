"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { usePrivacyMode } from "./privacy-provider";

export function PrivacyToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { hidden, toggle } = usePrivacyMode();
  const label = hidden ? "Show sensitive values" : "Hide sensitive values";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      className={showLabel ? "w-full justify-start" : undefined}
      aria-pressed={hidden}
      aria-label={label}
      onClick={toggle}
    >
      {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      {showLabel && label}
    </Button>
  );

  return showLabel ? button : <TooltipHint label={label}>{button}</TooltipHint>;
}
