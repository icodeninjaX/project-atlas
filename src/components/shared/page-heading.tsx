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
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-primary mb-3 text-xs font-semibold tracking-[0.1em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[2rem] leading-none font-semibold tracking-[-0.045em] sm:text-[2.4rem]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 min-[380px]:flex-row min-[380px]:flex-wrap sm:w-auto [&>*]:w-full min-[380px]:[&>*]:w-auto min-[380px]:[&>*]:grow min-[380px]:[&>*]:basis-[calc(50%-0.25rem)] sm:[&>*]:grow-0 sm:[&>*]:basis-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
