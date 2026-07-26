import { cn } from "@/lib/utils";

export function AtlasMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-primary/35 bg-primary/10 relative grid size-9 place-items-center rounded-xl border",
        className,
      )}
    >
      <span className="bg-primary absolute h-5 w-px rotate-45" />
      <span className="bg-primary/50 absolute h-5 w-px -rotate-45" />
      <span className="bg-primary ring-primary/15 size-1.5 rounded-full ring-4" />
    </div>
  );
}
