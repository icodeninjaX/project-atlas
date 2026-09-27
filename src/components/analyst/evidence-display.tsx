import { SensitiveValue } from "@/components/privacy/privacy-provider";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import { formatCentavos } from "@/lib/money/money";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Rewrites ISO dates in prose ("2026-09-27") as "Sep 27, 2026". */
export function readableDates(text: string) {
  return text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, year, month, day) => {
      const name = monthNames[Number(month) - 1];
      return name && Number(day) >= 1 && Number(day) <= 31
        ? `${name.slice(0, 3)} ${Number(day)}, ${year}`
        : match;
    })
    .replace(/\b(\d{4})-(\d{2})\b/g, (match, year, month) => {
      const name = monthNames[Number(month) - 1];
      return name ? `${name} ${year}` : match;
    });
}

/** Hides peso figures in claim prose when privacy mode is on. */
export function ClaimText({ text }: { text: string }) {
  return readableDates(text)
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
