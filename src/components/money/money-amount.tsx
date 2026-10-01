import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { splitFormattedMoney } from "@/lib/money/history";
import { formatCentavos } from "@/lib/money/money";
import { cn } from "@/lib/utils";

/**
 * A peso amount that respects privacy mode.
 *
 * - `sign="always"` prefixes + or − (money in or out); `"negative"` shows
 *   − only for a negative balance.
 * - `quietCentavos` sets the centavos smaller and dimmer so the whole-peso
 *   figure leads, for headline numbers.
 */
export function MoneyAmount({
  centavos,
  sign = "negative",
  quietCentavos = false,
  className,
}: {
  centavos: number;
  sign?: "always" | "negative";
  quietCentavos?: boolean;
  className?: string;
}) {
  const prefix = centavos < 0 ? "−" : sign === "always" ? "+" : "";
  const formatted = formatCentavos(Math.abs(centavos));

  if (!quietCentavos) {
    return (
      <SensitiveValue className={className}>
        {prefix}
        {formatted}
      </SensitiveValue>
    );
  }

  const { whole, fraction } = splitFormattedMoney(formatted);
  return (
    <SensitiveValue className={className}>
      {prefix}
      {whole}
      <span className="text-[0.6em] font-medium tracking-normal opacity-60">
        {fraction}
      </span>
    </SensitiveValue>
  );
}

/** "+₱1.00" in the positive color for money in; "−₱1.00" for money out. */
export function FlowAmount({
  centavos,
  direction,
  className,
}: {
  centavos: number;
  direction: "in" | "out";
  className?: string;
}) {
  return (
    <MoneyAmount
      centavos={direction === "in" ? centavos : -centavos}
      sign="always"
      className={cn(direction === "in" && "text-positive", className)}
    />
  );
}
