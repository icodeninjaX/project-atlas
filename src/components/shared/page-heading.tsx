import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-primary mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
