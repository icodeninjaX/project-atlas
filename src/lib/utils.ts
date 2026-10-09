import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * `value` when it is an http(s) URL, else null. Stored links are rendered as
 * hrefs, and rows written before validation or straight through the API may
 * hold javascript: or data: URLs.
 */
export function safeExternalHref(value: string | null | undefined) {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}
