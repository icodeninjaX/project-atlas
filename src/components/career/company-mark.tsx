import { companyInitials } from "@/lib/career/view";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-9 text-xs",
  md: "size-10 text-[0.8125rem]",
  lg: "size-12 text-base",
};

/**
 * A company's initials on a neutral square, standing in for a logo. Every
 * company gets the same look. Decorative: the name is always written
 * beside it.
 */
export function CompanyMark({
  name,
  size = "md",
  muted = false,
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  /** Closed applications fade back. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted/60 text-foreground/75 grid shrink-0 place-items-center rounded-lg leading-none font-semibold tracking-[-0.02em] select-none",
        sizes[size],
        muted && "opacity-70",
        className,
      )}
    >
      {companyInitials(name)}
    </span>
  );
}
