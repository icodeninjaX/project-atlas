import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const itemClass =
  "group focus-visible:ring-ring flex min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1 text-center [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:outline-none";

function Disc({ icon: Icon, primary }: { icon: LucideIcon; primary: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-12 place-items-center rounded-full transition-transform duration-150 group-active:scale-95 motion-reduce:transition-none",
        primary
          ? "bg-primary-solid text-primary-solid-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_color-mix(in_srgb,var(--primary-solid)_70%,transparent)]"
          : "border-border bg-secondary text-foreground border shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]",
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-foreground/85 w-full text-xs leading-4 font-medium break-words">
      {children}
    </span>
  );
}

/**
 * A row of round actions, as in a banking app's home screen. Columns are
 * sized in rem, so four fit from 320px up at normal text size and larger
 * text gets fewer, wider columns instead of overlapping discs.
 */
export function QuickActions({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,3.25rem),1fr))] gap-2">
      {children}
    </div>
  );
}

export function QuickActionLink({
  href,
  icon,
  label,
  primary = false,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link href={href} className={itemClass}>
      <Disc icon={icon} primary={primary} />
      <Label>{label}</Label>
    </Link>
  );
}

/** A quick action that opens something, e.g. as a dialog trigger. */
export function QuickActionButton({
  icon,
  label,
  primary = false,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <button type="button" className={cn(itemClass, className)} {...props}>
      <Disc icon={icon} primary={primary} />
      <Label>{label}</Label>
    </button>
  );
}
