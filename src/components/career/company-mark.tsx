import { companyHueIndex, companyInitials } from "@/lib/career/view";
import { cn } from "@/lib/utils";

// The app's tinted-tile language: a soft wash with the initials in the same
// hue, deep enough in light mode and light enough in dark mode for AA.
const palette = [
  "bg-blue-500/12 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  "bg-amber-500/12 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  "bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  "bg-sky-500/12 text-sky-800 ring-sky-500/25 dark:text-sky-300",
  "bg-teal-500/12 text-teal-700 ring-teal-500/25 dark:text-teal-300",
  "bg-orange-500/12 text-orange-700 ring-orange-500/25 dark:text-orange-300",
  "bg-slate-500/12 text-slate-700 ring-slate-500/25 dark:text-slate-300",
];

const sizes = {
  sm: "size-9 rounded-[0.7rem] text-[0.75rem]",
  md: "size-10 rounded-xl text-[0.8125rem]",
  lg: "size-12 rounded-2xl text-base",
};

/**
 * A company's initials on a color picked from its name, standing in for a
 * logo. Decorative: the name is always written beside it.
 */
export function CompanyMark({
  name,
  size = "md",
  muted = false,
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  /** Closed applications fade to gray. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center leading-none font-semibold tracking-[-0.02em] ring-1 select-none ring-inset",
        palette[companyHueIndex(name, palette.length)],
        sizes[size],
        muted && "opacity-70 grayscale",
        className,
      )}
    >
      {companyInitials(name)}
    </span>
  );
}
