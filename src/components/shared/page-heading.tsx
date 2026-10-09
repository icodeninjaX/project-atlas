import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one page title every ATLAS screen opens with: an eyebrow pill, the
 * gradient title, a short description, and the page's own actions. Keeping
 * it in one place is what makes moving between pages feel like one app.
 */
export function PageHeading({
  eyebrow,
  icon: Icon,
  meta,
  title,
  description,
  actions,
  aside,
  compactOnMobile = false,
  titleId,
}: {
  eyebrow?: string;
  /** Shown inside the eyebrow pill. */
  icon?: LucideIcon;
  /** Quiet context beside the eyebrow, such as today's date. */
  meta?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Buttons. They share the row evenly on phones. */
  actions?: ReactNode;
  /** A status pill or companion link, kept at its own size. */
  aside?: ReactNode;
  /**
   * Below `sm`, drop the description and the actions so the page's own
   * content starts sooner. Only for pages that offer those actions
   * elsewhere on phones.
   */
  compactOnMobile?: boolean;
  titleId?: string;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
      <div className="max-w-2xl min-w-0">
        {eyebrow || meta ? (
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs font-medium">
            {eyebrow ? (
              <span className="bg-card/60 text-primary ring-border/70 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
                {Icon ? (
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                ) : null}
                <span className="truncate">{eyebrow}</span>
              </span>
            ) : null}
            {meta ? (
              <span className="text-muted-foreground">{meta}</span>
            ) : null}
          </p>
        ) : null}
        <h1
          id={titleId}
          className={cn(
            "from-foreground via-foreground to-foreground/60 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[1.875rem] leading-[1.04] font-semibold tracking-[-0.05em] break-words text-transparent min-[360px]:text-[2.125rem] sm:text-[2.75rem] lg:text-[3.25rem]",
            (eyebrow || meta) && "mt-4",
          )}
        >
          {title}
        </h1>
        {description ? (
          // The smallest phones skip the description so content starts higher.
          <p
            className={cn(
              "text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 text-pretty max-[359px]:hidden sm:text-[0.9375rem]",
              compactOnMobile && "max-sm:hidden",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions || aside ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {aside}
          {actions ? (
            <div
              className={cn(
                "flex w-full flex-col gap-2 min-[380px]:flex-row min-[380px]:flex-wrap sm:w-auto [&>*]:w-full min-[380px]:[&>*]:w-auto min-[380px]:[&>*]:grow min-[380px]:[&>*]:basis-[calc(50%-0.25rem)] sm:[&>*]:grow-0 sm:[&>*]:basis-auto",
                compactOnMobile && "max-sm:hidden",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

const headerPillClass =
  "bg-card/60 ring-border/80 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-4 text-xs font-semibold ring-1 backdrop-blur";

/** A companion page linked from a page title, such as Activity history. */
export function PageHeadingLink({
  href,
  icon: Icon,
  children,
}: {
  href: Route;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        headerPillClass,
        "text-foreground hover:bg-card focus-visible:ring-ring min-h-11 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
      )}
    >
      <Icon aria-hidden="true" className="text-primary size-4" />
      {children}
    </Link>
  );
}

/** A short promise or status beside a page title. */
export function PageHeadingNote({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <p className={cn(headerPillClass, "text-foreground")}>
      <Icon aria-hidden="true" className="text-primary size-4" />
      {children}
    </p>
  );
}

/** The way back from a detail page to its list. */
export function BackLink({
  href,
  children,
}: {
  href: Route;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        headerPillClass,
        "text-foreground hover:bg-card focus-visible:ring-ring mb-5 min-h-11 pl-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:mb-6 sm:min-h-9",
      )}
    >
      <ArrowLeft aria-hidden="true" className="text-primary size-4" />
      {children}
    </Link>
  );
}
