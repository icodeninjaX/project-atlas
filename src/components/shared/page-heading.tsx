import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one page title every ATLAS screen opens with: an optional trail or
 * context line, the title, a short description, and the page's own
 * actions. Sized for a tool, not a landing page, so the page's content
 * starts high. Keeping it in one place makes every page feel like one app.
 */
export function PageHeading({
  eyebrow,
  meta,
  title,
  description,
  actions,
  aside,
  compactOnMobile = false,
  titleId,
}: {
  /** Where this page sits, such as "Money / Budget". */
  eyebrow?: string;
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
    <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
      <div className="max-w-2xl min-w-0">
        {eyebrow || meta ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
            {eyebrow ? (
              <span className="text-foreground/80 max-w-full truncate font-medium">
                {eyebrow}
              </span>
            ) : null}
            {eyebrow && meta ? <span aria-hidden="true">·</span> : null}
            {meta ? <span>{meta}</span> : null}
          </p>
        ) : null}
        <h1
          id={titleId}
          className={cn(
            "text-foreground text-2xl leading-tight font-semibold tracking-[-0.02em] break-words sm:text-[1.75rem]",
            (eyebrow || meta) && "mt-1.5",
          )}
        >
          {title}
        </h1>
        {description ? (
          // The smallest phones skip the description so content starts higher.
          <p
            className={cn(
              "text-muted-foreground mt-1.5 max-w-xl text-sm leading-6 text-pretty max-[359px]:hidden",
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
  "inline-flex min-h-9 items-center gap-2 self-start rounded-lg text-[0.8125rem] font-medium";

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
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-11 px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
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
    <p className={cn(headerPillClass, "text-muted-foreground")}>
      <Icon aria-hidden="true" className="size-4" />
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
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-4 -ml-1 min-h-11 px-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
