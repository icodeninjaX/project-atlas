"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "bg-foreground text-background z-[80] max-w-64 rounded-lg px-2.5 py-1.5 text-center text-xs leading-4 font-medium shadow-xl",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-foreground" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

type TooltipHintProps = {
  children: React.ReactElement;
  label: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Content
  >["side"];
  align?: React.ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Content
  >["align"];
};

function TooltipHint({
  children,
  label,
  side = "top",
  align = "center",
}: TooltipHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipContent,
  TooltipHint,
  TooltipProvider,
  TooltipTrigger,
};
