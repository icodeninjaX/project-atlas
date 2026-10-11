import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border bg-card/40 grid min-h-44 place-items-center rounded-2xl border border-dashed p-6 text-center sm:min-h-52 sm:p-8">
      <div className="max-w-sm">
        <div className="bg-muted/60 text-muted-foreground mx-auto grid size-9 place-items-center rounded-lg">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
