import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { PageHeading } from "./page-heading";
import { PageShell } from "./page-shell";

export function ModuleEmptyPage({
  eyebrow,
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel: string;
}) {
  return (
    <PageShell>
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Button>{actionLabel}</Button>}
      />
      <div className="mt-8">
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
          action={<Button variant="secondary">{actionLabel}</Button>}
        />
      </div>
    </PageShell>
  );
}
