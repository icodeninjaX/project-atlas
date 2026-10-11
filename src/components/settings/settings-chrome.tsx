import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared pieces of the Settings page. */

export const eyebrowClass = "text-muted-foreground text-xs font-semibold";

/** The page's cards: one flat, opaque surface with a hairline. */
export const cardClass =
  "bg-card border-border @container relative min-w-0 rounded-2xl border";

/** A tonal well inside a card. */
export const tileClass =
  "bg-background/55 min-w-0 rounded-xl p-3.5 min-[360px]:p-4";

/** A native select dressed like `Input`, with its own chevron. */
export const selectClass =
  "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-11 w-full appearance-none rounded-xl border bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238d99aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 pl-3 text-base transition-colors outline-none focus-visible:ring-2 sm:text-sm";

/** A field's label above it. */
export const fieldLabelClass = "text-sm font-medium";

/** A small help line below a field. */
export const fieldHelpClass = "text-muted-foreground text-xs leading-5";

/**
 * The icon at the start of a row: a small neutral square with a muted
 * glyph, red only for the destructive row.
 */
export function IconTile({
  icon: Icon,
  tone = "muted",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: "danger" | "muted";
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted/60 grid shrink-0 place-items-center rounded-lg",
        size === "md" ? "size-9" : "size-8",
        tone === "danger" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

/**
 * One section of the page: a card with a muted icon, a title, and a
 * sentence on what it controls. The `id` is the jump target.
 */
export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = `${id ?? title.toLowerCase().replace(/\W+/g, "-")}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(cardClass, "scroll-mt-36 lg:scroll-mt-8")}
    >
      <header className="p-4 pb-0 min-[360px]:p-5 min-[360px]:pb-0 sm:p-6 sm:pb-0">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-base leading-6 font-semibold tracking-[-0.01em]"
        >
          <Icon
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-xl text-[0.8125rem] leading-5 text-pretty">
          {description}
        </p>
      </header>
      <div className="p-4 min-[360px]:p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** A labelled group inside a section. */
export function SettingsGroup({
  title,
  description,
  icon: Icon,
  tone = "muted",
  children,
  className,
  titleIsLegend = false,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "danger" | "muted";
  children: ReactNode;
  className?: string;
  /** The fieldset's own legend already names the group for assistive tech. */
  titleIsLegend?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        aria-hidden={titleIsLegend || undefined}
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          tone === "danger" && "text-destructive",
        )}
      >
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              tone === "danger" ? "text-destructive" : "text-muted-foreground",
            )}
          />
        ) : null}
        {title}
      </p>
      {description ? (
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          {description}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * A setting as a row: an icon, a title and detail, and its control at the
 * end (below on phones).
 */
export function SettingRow({
  icon,
  title,
  detail,
  tone = "muted",
  children,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  detail?: ReactNode;
  tone?: "danger" | "muted";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {detail ? (
            <div className="text-muted-foreground mt-0.5 max-w-lg text-xs leading-5">
              {detail}
            </div>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="flex shrink-0 sm:justify-end">{children}</div>
      ) : null}
    </div>
  );
}

/** A status pill: a dot and a word or two. */
export function StatusChip({
  tone,
  children,
}: {
  tone: "positive" | "caution" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold whitespace-nowrap ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "neutral" && "bg-muted/60 text-muted-foreground ring-border",
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

/** A saved or failed message under a form. */
export function FormFeedback({
  success,
  children,
  className,
}: {
  success: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 text-xs leading-5 font-medium",
        success ? "text-positive" : "text-destructive",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-current"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * A checkbox drawn as a switch, on a plain row; the switch carries the
 * state. It stays a real checkbox, so forms submit it as before.
 */
export function SwitchField({
  name,
  label,
  detail,
  defaultChecked,
  disabled,
  className,
}: {
  name: string;
  label: ReactNode;
  detail?: ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group flex min-h-11 cursor-pointer items-center gap-3 py-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {detail ? (
          <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
            {detail}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="bg-muted ring-border peer-checked:bg-primary-solid peer-checked:ring-primary-solid peer-focus-visible:outline-ring/50 relative inline-flex h-6 w-10 shrink-0 rounded-full ring-1 transition-colors ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
      >
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(7_10_15/0.3)] transition-transform duration-200 group-has-[:checked]:translate-x-4 motion-reduce:transition-none" />
      </span>
    </label>
  );
}
