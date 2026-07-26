import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { PageHeading } from "./page-heading";

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
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
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
    </div>
  );
}
