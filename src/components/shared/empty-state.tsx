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
    <div className="border-border bg-card/40 grid min-h-72 place-items-center rounded-2xl border border-dashed p-8 text-center">
      <div className="max-w-sm">
        <div className="border-primary/20 bg-primary/10 text-primary mx-auto grid size-11 place-items-center rounded-xl border">
          <Icon className="size-5" />
        </div>
        <h2 className="mt-5 text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
