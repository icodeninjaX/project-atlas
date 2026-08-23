import { render as testingLibraryRender } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function renderWithProviders(ui: ReactElement) {
  return testingLibraryRender(
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      {ui}
    </TooltipProvider>,
  );
}
