import type { AnalysisBrief } from "./contracts";

/**
 * Language and requested format for Analyst V2 answers (AI-06). Detection is
 * a presentation choice only: claims are verified structurally (cited
 * values, comparisons, periods), and English and Filipino wording checks are
 * a second line, never the main safety boundary.
 */

const filipino =
  /\b(?:ang|ng|mga|ko|ako|ba|naman|kaysa|ngayong|noong|nakaraang|buwan|linggo|magkano|gastos|kita|utang|paano|bakit|ano|saan|sa|yung|kasi|lang|po|opo|na|pa)\b/gi;

/** "en" or "fil-en" (Filipino or Taglish), from the question's wording. */
export function detectLanguage(question: string): "en" | "fil-en" {
  const words = question.toLowerCase().match(/\p{L}+/gu) ?? [];
  const hits = question.match(filipino)?.length ?? 0;
  return words.length > 0 && hits >= 2 && hits / words.length >= 0.2
    ? "fil-en"
    : "en";
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  isa: 1,
  dalawa: 2,
  tatlo: 3,
  tatlong: 3,
  apat: 4,
  lima: 5,
};

export type StyleRequest = {
  style: AnalysisBrief["responseStyle"];
  /** A requested sentence cap, when the user asked for one. */
  maxSentences: number | null;
};

/** The response style the user asked for, or a default that fits the intent. */
/** The style the person asked for in words, or null when they did not say. */
export function explicitStyle(question: string): StyleRequest | null {
  const text = question.toLowerCase();
  const count = text.match(
    /\b(?:in|within|sa)\s+(\d|one|two|three|four|five|isa|dalawa|tatlo|tatlong|apat|lima)\s*(?:-|na)?\s*(?:sentences?|pangungusap)\b/,
  );
  if (count) {
    const raw = count[1]!;
    const value = /^\d$/.test(raw) ? Number(raw) : numberWords[raw]!;
    return { style: "concise", maxSentences: Math.max(1, Math.min(value, 5)) };
  }
  if (/\b(?:table|tabular|talahanayan)\b/.test(text))
    return { style: "table", maxSentences: null };
  if (
    /\b(?:in detail|detailed|explain fully|full breakdown|step by step|detalyado)\b/.test(
      text,
    )
  )
    return { style: "detailed", maxSentences: null };
  if (/\b(?:briefly|short answer|quick|tl;?dr|maikli)\b/.test(text))
    return { style: "concise", maxSentences: 2 };
  return null;
}

export function detectStyle(
  question: string,
  intent: AnalysisBrief["intent"],
): StyleRequest {
  return (
    explicitStyle(question) ?? {
      style: intent === "lookup" ? "concise" : "standard",
      maxSentences: null,
    }
  );
}

const pesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

/** Money from integer centavos, formatted the same in both languages. */
export function formatMoney(centavos: number) {
  return pesos.format(centavos / 100);
}

const englishMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const filipinoMonths = [
  "Ene",
  "Peb",
  "Mar",
  "Abr",
  "May",
  "Hun",
  "Hul",
  "Ago",
  "Set",
  "Okt",
  "Nob",
  "Dis",
];

/** An ISO calendar date as "Sep 24, 2026" or "Set 24, 2026". */
export function formatDay(iso: string, language: "en" | "fil-en") {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const names = language === "fil-en" ? filipinoMonths : englishMonths;
  return `${names[month - 1]} ${day}, ${year}`;
}

/** Replaces ISO dates in verified text with readable ones for display only. */
export function readableText(text: string, language: "en" | "fil-en") {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match) =>
    formatDay(match, language),
  );
}

/** UI strings for the two supported languages. */
export const UI_TEXT = {
  en: {
    answered: "Answered",
    partial: "Partial answer",
    clarify: "Needs clarification",
    insufficient: "Not enough evidence",
    unsupported: "Not supported yet",
    facts: "Facts only",
    error: "Unavailable",
    notAnswered: "Not answered",
    limits: "What this cannot show",
    options: "Options",
    tradeoff: "Trade-off",
    sources: "Sources",
    shortened: "Shortened as you asked.",
    showAll: "Show the full answer",
  },
  "fil-en": {
    answered: "May sagot",
    partial: "Bahagyang sagot",
    clarify: "Kailangang linawin",
    insufficient: "Kulang ang ebidensya",
    unsupported: "Hindi pa suportado",
    facts: "Mga datos lang",
    error: "Hindi available",
    notAnswered: "Hindi nasagot",
    limits: "Hindi maipapakita nito",
    options: "Mga opsyon",
    tradeoff: "Kapalit",
    sources: "Pinagmulan",
    shortened: "Pinaikli ayon sa hiling mo.",
    showAll: "Ipakita ang buong sagot",
  },
} as const;
