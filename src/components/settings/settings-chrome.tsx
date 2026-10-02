import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

/** Shared pieces of the Settings page. */

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

/** A glass surface for the page's cards. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** An inset tile inside a card. */
export const tileClass =
  "bg-background/55 ring-border/80 min-w-0 rounded-2xl p-3.5 ring-1 min-[360px]:p-4";

/** A native select dressed like the page's inputs, with its own chevron. */
export const selectClass =
  "border-border bg-background/70 focus-visible:ring-ring hover:border-primary/40 min-h-11 w-full appearance-none rounded-xl border bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 pl-3 text-sm transition-colors outline-none focus-visible:ring-2";

/** A field's label above it. */
export const fieldLabelClass = "text-foreground/90 text-xs font-semibold";

/** A small help line below a field. */
export const fieldHelpClass = "text-muted-foreground text-[11px] leading-4";

/**
 * The icon in a section's or row's corner: a soft tile with a highlight on
 * top. `tone` follows the section's purpose.
 */
export function IconTile({
  icon: Icon,
  tone = "primary",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: "primary" | "danger" | "muted";
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center ring-1 ring-inset",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
        size === "md" ? "size-11 rounded-2xl" : "size-9 rounded-xl",
        tone === "primary" &&
          "from-primary/22 to-primary/6 text-primary ring-primary/20 bg-gradient-to-br",
        tone === "danger" &&
          "from-destructive/20 to-destructive/5 text-destructive ring-destructive/25 bg-gradient-to-br",
        tone === "muted" && "bg-muted/80 text-muted-foreground ring-border/80",
      )}
    >
      <Icon className={size === "md" ? "size-[1.15rem]" : "size-4"} />
    </span>
  );
}

/**
 * One section of the page: a glass card with an index, an icon, a title,
 * and a sentence on what it controls. The `id` is the jump target.
 */
export function SettingsSection({
  id,
  index,
  icon,
  title,
  description,
  tone = "primary",
  aside,
  children,
}: {
  id?: string;
  index?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "danger";
  aside?: ReactNode;
  children: ReactNode;
}) {
  const titleId = `${id ?? title.toLowerCase().replace(/\W+/g, "-")}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      data-spotlight
      className={cn(
        glassCardClass,
        "scroll-mt-36 overflow-hidden lg:scroll-mt-8",
        tone === "danger" && "ring-destructive/15 ring-1",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          tone === "danger" ? "via-destructive/50" : "via-primary/45",
        )}
      />
      <header className="flex items-start gap-3.5 p-4 pb-0 min-[360px]:p-5 min-[360px]:pb-0 sm:gap-4 sm:p-6 sm:pb-0">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          {index ? <p className={eyebrowClass}>{index}</p> : null}
          <h2
            id={titleId}
            className="mt-0.5 text-[1.0625rem] leading-6 font-semibold tracking-[-0.02em] sm:text-lg"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-[13px] leading-5 text-pretty">
            {description}
          </p>
        </div>
        {aside ? <div className="hidden shrink-0 sm:block">{aside}</div> : null}
      </header>
      <div className="p-4 min-[360px]:p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** A labelled group inside a section, separated by a fading rule. */
export function SettingsGroup({
  title,
  description,
  icon: Icon,
  children,
  className,
  titleIsLegend = false,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** The fieldset's own legend already names the group for assistive tech. */
  titleIsLegend?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        aria-hidden={titleIsLegend || undefined}
        className="flex items-center gap-3"
      >
        {Icon ? (
          <Icon aria-hidden="true" className="text-primary size-3.5" />
        ) : null}
        <p className={eyebrowClass}>{title}</p>
        <span
          aria-hidden="true"
          className="from-border h-px min-w-6 flex-1 bg-gradient-to-r to-transparent"
        />
      </div>
      {description ? (
        <p className="text-muted-foreground mt-1.5 text-xs leading-5">
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
  tone?: "primary" | "danger" | "muted";
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

/** A status chip: a dot and a word or two. */
export function StatusChip({
  tone,
  children,
}: {
  tone: "positive" | "caution" | "neutral" | "primary";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold whitespace-nowrap ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
        tone === "primary" &&
          "bg-primary/10 ring-primary/20 dark:text-primary text-blue-700",
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
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-5 ring-1",
        success
          ? "bg-positive/10 text-positive ring-positive/25"
          : "bg-destructive/10 text-destructive ring-destructive/25",
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
 * A checkbox drawn as a switch. It stays a real checkbox, so forms submit
 * it as before; the track and knob follow `:checked`.
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
        "group bg-background/55 ring-border/80 hover:ring-primary/35 has-[:checked]:bg-primary/[0.06] has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-ring flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 ring-1 transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {detail ? (
          <span className="text-muted-foreground mt-0.5 block text-[11px] leading-4">
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
        className="bg-muted ring-border peer-checked:bg-primary-solid peer-checked:ring-primary-solid relative inline-flex h-6 w-10 shrink-0 rounded-full ring-1 transition-colors ring-inset"
      >
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(7_10_15/0.3)] transition-transform duration-200 group-has-[:checked]:translate-x-4 motion-reduce:transition-none" />
      </span>
    </label>
  );
}
