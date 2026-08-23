"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const actionLabel = `Use ${nextTheme} theme`;

  return (
    <TooltipHint label={actionLabel}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Toggle color theme"
        onClick={() => setTheme(nextTheme)}
      >
        <Sun className="hidden size-4 dark:block" />
        <Moon className="size-4 dark:hidden" />
      </Button>
    </TooltipHint>
  );
}
