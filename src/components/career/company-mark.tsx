import { companyHueIndex, companyInitials } from "@/lib/career/view";
import { cn } from "@/lib/utils";

// Deep enough at the bottom right for white initials to stay legible.
const palette = [
  "from-blue-500 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-sky-500 to-cyan-700",
  "from-fuchsia-500 to-violet-700",
  "from-slate-500 to-slate-700",
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
        "grid shrink-0 place-items-center bg-gradient-to-br leading-none font-semibold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_0_0_1px_rgb(255_255_255/0.08),0_1px_2px_rgb(7_10_15/0.22),0_8px_18px_-10px_rgb(7_10_15/0.55)] select-none",
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
