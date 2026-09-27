import { SensitiveValue } from "@/components/privacy/privacy-provider";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { formatCentavos } from "@/lib/money/money";

/** Hides peso figures in claim prose when privacy mode is on. */
export function ClaimText({ text }: { text: string }) {
  return text
    .split(
      /((?:[-−]\s?)?(?:₱|\bPHP\b)\s?[-−]?[\d,]*\d(?:\.\d+)?|[-−]?[\d,]*\d(?:\.\d+)?\s?pesos\b)/i,
    )
    .map((part, index) =>
      index % 2 === 1 ? (
        <SensitiveValue key={index}>{part}</SensitiveValue>
      ) : (
        part
      ),
    );
}

/** Formats an evidence value with its unit. */
export function evidenceDisplayValue(item: ToolEvidence) {
  if (item.unit === "centavos" && typeof item.value === "number")
    return formatCentavos(item.value);
  if (item.unit === "percent") return `${item.value}%`;
  if (item.unit === "score") return `${item.value} / 10`;
  if (item.unit === "correlation") return `r = ${item.value}`;
  return `${item.value}${item.unit === "count" ? "" : ` ${item.unit}`}`;
}
