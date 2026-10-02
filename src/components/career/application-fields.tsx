import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Shared look for the create and edit application forms. Labels wrap their
 * controls, so the controls set their own text color rather than inherit
 * the label's muted one.
 */
export const fieldLabelClass =
  "text-muted-foreground block text-xs font-medium [&_input]:text-foreground [&_select]:text-foreground [&_textarea]:text-foreground";

export const fieldSelectClass =
  "border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 sm:text-sm";

export const fieldTextareaClass =
  "border-border bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2 sm:text-sm";

/**
 * A titled group of fields on a quiet tile. The legend floats so it sits
 * inside the tile like a heading rather than on its edge.
 */
export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="bg-card/70 ring-border/80 min-w-0 rounded-2xl p-4 ring-1 sm:p-5">
      <legend className="float-left flex w-full items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-primary/10 text-primary ring-primary/15 grid size-8 shrink-0 place-items-center rounded-lg ring-1"
        >
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-[-0.01em]">
          {title}
        </span>
      </legend>
      <p className="text-muted-foreground clear-both pt-2 text-xs leading-5 sm:pl-11">
        {description}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** A peso amount field with the sign set inside it. */
export function PesoField({
  label,
  className,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <span className="relative mt-1.5 block">
        <span
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold"
        >
          ₱
        </span>
        <Input
          inputMode="decimal"
          autoComplete="off"
          className={cn("pl-7 font-mono", className)}
          {...props}
        />
      </span>
    </label>
  );
}
