import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-md place-items-center px-5 py-12">
      <div className="w-full">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.2em] uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {description}
        </p>
        <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-6">
          {children}
        </div>
        {footer && (
          <p className="text-muted-foreground mt-5 text-center text-sm">
            {footer}
          </p>
        )}
        <p className="text-muted-foreground mt-8 text-center text-xs">
          <Link href="/" className="hover:text-foreground">
            Your personal operating system.
          </Link>
        </p>
      </div>
    </main>
  );
}
