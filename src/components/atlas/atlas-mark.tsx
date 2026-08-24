import Image from "next/image";
import { cn } from "@/lib/utils";

export function AtlasMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid size-9 place-items-center", className)}
    >
      <Image
        src="/brand/atlas-system-core.png"
        alt=""
        width={36}
        height={36}
        className="size-full object-contain"
        draggable={false}
        unoptimized
      />
    </span>
  );
}
