"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const readPlatformState = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(standalone);
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    };
    queueMicrotask(readPlatformState);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setInstalled(false);
    };
    const markInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (installed || (!prompt && !isIOS)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Install Project Atlas"
      title="Install Project Atlas"
      onClick={async () => {
        if (prompt) {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
          setPrompt(null);
          return;
        }
        toast.info(
          "In Safari, tap Share, then choose Add to Home Screen to install Atlas.",
          { duration: 7000 },
        );
      }}
    >
      <Download className="size-4" />
    </Button>
  );
}
