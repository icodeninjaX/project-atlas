import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Shared look for the create and edit application forms. Labels wrap their
 * controls, so the controls set their own text color rather than inherit
 * the label's muted one.
 */
export const fieldLabelClass =
  "block text-sm font-medium [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal";

export const fieldSelectClass =
  "border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 sm:text-sm";

export const fieldTextareaClass =
  "border-border bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2 sm:text-sm";

/**
 * A titled group of fields, set off from the one above by a hairline. The
 * legend floats so it lays out like a heading rather than on the edge.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  /** Only when it tells the user something the fields do not. */
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 border-t pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left w-full text-sm font-semibold">
        {title}
      </legend>
      {description ? (
        <p className="text-muted-foreground clear-both pt-1 text-xs leading-5">
          {description}
        </p>
      ) : null}
      <div className="clear-both grid gap-4 pt-4 sm:grid-cols-2">
        {children}
      </div>
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
