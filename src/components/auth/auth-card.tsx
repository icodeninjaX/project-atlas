import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  notice,
  children,
  footer,
}: {
  /** Only when it carries information, such as a step count. */
  eyebrow?: string;
  title: string;
  description: string;
  /** A message shown above the form, such as why the visitor landed here. */
  notice?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-md place-items-center px-5 py-12">
      <div className="w-full">
        {eyebrow && (
          <p className="text-muted-foreground mb-3 text-[0.8125rem] font-medium">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {description}
        </p>
        <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-6">
          {notice}
          {children}
        </div>
        {footer && (
          <p className="text-muted-foreground mt-5 text-center text-sm">
            {footer}
          </p>
        )}
        <p className="mt-8 text-center text-xs">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            Back to ATLAS home
          </Link>
        </p>
      </div>
    </main>
  );
}
