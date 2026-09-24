import { z } from "zod";
import { pesoInputToCentavos } from "@/lib/money/money";

export const captureInputSchema = z.string().trim().min(8).max(500);

const nullableText = z.string().trim().max(300).nullable();

export const modelCaptureSchema = z.strictObject({
  kind: z.enum([
    "expense",
    "income",
    "task",
    "career_application",
    "knowledge_item",
    "unsupported",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  amountText: nullableText,
  currency: z.enum(["PHP", "other"]).nullable(),
  dateText: nullableText,
  date: z.iso.date().nullable(),
  dateRole: z
    .enum(["transaction", "scheduled", "applied", "next_action"])
    .nullable(),
  title: nullableText,
  description: nullableText,
  accountText: nullableText,
  merchantOrSource: nullableText,
  categorySuggestion: nullableText,
  companyName: nullableText,
  roleTitle: nullableText,
  notes: nullableText,
  ambiguities: z.array(z.string().trim().min(1).max(160)).max(5),
});

export type ModelCapture = z.infer<typeof modelCaptureSchema>;
export type CaptureProposal = ModelCapture & {
  amount: string | null;
  accountHint: string | null;
  warnings: string[];
};

export const captureJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "confidence",
    "amountText",
    "currency",
    "dateText",
    "date",
    "dateRole",
    "title",
    "description",
    "accountText",
    "merchantOrSource",
    "categorySuggestion",
    "companyName",
    "roleTitle",
    "notes",
    "ambiguities",
  ],
  properties: {
    kind: {
      type: "string",
      enum: [
        "expense",
        "income",
        "task",
        "career_application",
        "knowledge_item",
        "unsupported",
      ],
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    amountText: { type: ["string", "null"] },
    currency: { type: ["string", "null"], enum: ["PHP", "other", null] },
    dateText: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    dateRole: {
      type: ["string", "null"],
      enum: ["transaction", "scheduled", "applied", "next_action", null],
    },
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    accountText: { type: ["string", "null"] },
    merchantOrSource: { type: ["string", "null"] },
    categorySuggestion: { type: ["string", "null"] },
    companyName: { type: ["string", "null"] },
    roleTitle: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    ambiguities: { type: "array", items: { type: "string" } },
  },
} as const;

function groundedSpan(source: string, phrase: string): boolean {
  const haystack = source.toLowerCase();
  const needle = phrase.toLowerCase();
  let index = haystack.indexOf(needle);
  while (index >= 0) {
    const before = haystack[index - 1] ?? "";
    const after = haystack[index + needle.length] ?? "";
    if (
      !(/\d/.test(before) && /^\d/.test(needle)) &&
      !(/\d$/.test(needle) && /\d/.test(after))
    )
      return true;
    index = haystack.indexOf(needle, index + 1);
  }
  return false;
}

function isGroundedAccount(source: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(source);
}

function groundedDate(
  source: string,
  phrase: string | null,
  today: string,
): string | null {
  if (!phrase || !groundedSpan(source, phrase)) return null;
  const lower = phrase.toLowerCase().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;
  if (
    lower === "earlier" &&
    /\bearlier\b.{0,20}\b(?:week|month|year)\b/i.test(source)
  )
    return null;
  const offset =
    lower === "yesterday"
      ? -1
      : lower === "tomorrow"
        ? 1
        : lower === "today" || lower === "earlier"
          ? 0
          : null;
  if (offset === null) return null;
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

export function prepareCaptureProposal(
  sourceText: string,
  raw: unknown,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
): CaptureProposal {
  const value = modelCaptureSchema.parse(raw);
  const warnings = [...value.ambiguities];
  let amount: string | null = null;
  const expectedRoles =
    value.kind === "expense" || value.kind === "income"
      ? ["transaction"]
      : value.kind === "task"
        ? ["scheduled"]
        : value.kind === "career_application"
          ? ["applied", "next_action"]
          : [];
  const date =
    value.dateRole && expectedRoles.includes(value.dateRole)
      ? groundedDate(sourceText, value.dateText, today)
      : null;

  if (value.kind === "expense" || value.kind === "income") {
    const amountCandidates =
      sourceText
        .replace(value.dateText ?? "\u0000", " ")
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
        .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
        .match(/\b\d[\d,]*(?:\.\d{1,2})?\b/g) ?? [];
    if (value.currency === "other") {
      warnings.push(
        "Only PHP amounts are supported. Enter the peso amount yourself.",
      );
    } else if (amountCandidates.length > 1) {
      warnings.push(
        "Multiple numbers appear in this entry. Choose the amount yourself.",
      );
    } else if (value.amountText && groundedSpan(sourceText, value.amountText)) {
      try {
        const normalized = value.amountText
          .replace(/^(?:₱|PHP\s*)/i, "")
          .trim();
        const centavos = pesoInputToCentavos(normalized);
        if (centavos > 0) amount = (centavos / 100).toFixed(2);
      } catch {
        // Leave the amount empty for the user to supply.
      }
    }
    if (!amount) warnings.push("Enter the exact PHP amount before saving.");
  }

  if (value.date && !date)
    warnings.push(
      "Choose a date; the proposed date was not grounded in a supported date phrase.",
    );
  if ((value.kind === "expense" || value.kind === "income") && !date) {
    warnings.push("Choose the transaction date before saving.");
  }
  if (value.confidence !== "high")
    warnings.push(
      "Review all fields; ATLAS found uncertainty in this capture.",
    );

  let companyName = value.companyName;
  if (companyName && !groundedSpan(sourceText, companyName)) {
    companyName = null;
    warnings.push(
      "Enter the company name; the suggestion was not in your text.",
    );
  }
  let merchantOrSource = value.merchantOrSource;
  if (merchantOrSource && !groundedSpan(sourceText, merchantOrSource)) {
    merchantOrSource = null;
    warnings.push(
      "Review the merchant or source; the suggestion was not in your text.",
    );
  }
  const groundedAccount =
    value.accountText && isGroundedAccount(sourceText, value.accountText)
      ? value.accountText
      : null;
  const accountHint =
    groundedAccount ??
    (/(?:\busing|\bwith|\bvia|\bfrom|\bout of)\s+cash\b/i.test(sourceText)
      ? "cash"
      : null);
  let notes = value.notes;
  if (notes && !groundedSpan(sourceText, notes)) {
    notes = null;
    warnings.push("Add learning notes in your own words before saving.");
  }

  let roleTitle = value.roleTitle;
  if (roleTitle && !groundedSpan(sourceText, roleTitle)) {
    roleTitle = null;
    warnings.push("Enter the role title; the suggestion was not in your text.");
  }
  let title = value.title;
  if (title && !groundedSpan(sourceText, title)) {
    title = null;
    warnings.push(
      "Enter the title or next action; the suggestion was not in your text.",
    );
  }

  return {
    ...value,
    amount,
    date,
    companyName,
    merchantOrSource,
    accountHint,
    notes,
    roleTitle,
    title,
    warnings: [...new Set(warnings)],
  };
}
