import {
  BadgePercent,
  Briefcase,
  Building,
  Bus,
  CircleEllipsis,
  Film,
  Gift,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Users,
  Utensils,
  WalletCards,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Seeded categories store an icon key in `transaction_categories.icon`. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "badge-percent": BadgePercent,
  bolt: Zap,
  briefcase: Briefcase,
  building: Building,
  bus: Bus,
  "circle-ellipsis": CircleEllipsis,
  film: Film,
  gift: Gift,
  "hand-heart": HandHeart,
  "heart-pulse": HeartPulse,
  house: House,
  landmark: Landmark,
  laptop: Laptop,
  "piggy-bank": PiggyBank,
  "shopping-bag": ShoppingBag,
  "trending-up": TrendingUp,
  users: Users,
  utensils: Utensils,
  "wallet-cards": WalletCards,
  receipt: ReceiptText,
};

/** Custom categories have no icon; their names still often say what they are. */
const NAME_HINTS: Array<[RegExp, keyof typeof CATEGORY_ICONS]> = [
  [/food|grocer|meal|dining|coffee|restaurant/i, "utensils"],
  [/transport|fare|gas|fuel|grab|commute|parking/i, "bus"],
  [/util|electric|water|internet|phone|bill/i, "bolt"],
  [/rent|house|home/i, "house"],
  [/health|medic|doctor|pharma/i, "heart-pulse"],
  [/shop|clothes|apparel/i, "shopping-bag"],
  [/salary|payroll|wage/i, "briefcase"],
  [/gift/i, "gift"],
  [/family|kids|parent/i, "users"],
  [/debt|loan|credit/i, "landmark"],
  [/saving/i, "piggy-bank"],
];

function categoryIconKey(
  icon: string | null | undefined,
  name?: string | null,
): string {
  if (icon && CATEGORY_ICONS[icon]) return icon;
  const hinted = name
    ? NAME_HINTS.find(([pattern]) => pattern.test(name))?.[1]
    : undefined;
  return hinted ?? "receipt";
}

export function CategoryIcon({
  icon,
  categoryName,
  ...props
}: LucideProps & { icon?: string | null; categoryName?: string | null }) {
  const Icon =
    CATEGORY_ICONS[categoryIconKey(icon, categoryName)] ?? ReceiptText;
  return <Icon {...props} />;
}

/**
 * A category's icon in a rounded well. Money in wears the positive tint;
 * money out stays neutral so the list reads calm.
 */
export function CategoryBadge({
  icon,
  name,
  direction,
  size = "md",
  className,
}: {
  icon?: string | null;
  name?: string | null;
  direction: "in" | "out";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        size === "md" ? "size-10" : "size-8",
        direction === "in"
          ? "bg-positive/12 text-positive"
          : "bg-muted text-foreground/80",
        className,
      )}
    >
      <CategoryIcon
        icon={icon}
        categoryName={name}
        className={size === "md" ? "size-[1.125rem]" : "size-4"}
        aria-hidden="true"
      />
    </span>
  );
}
