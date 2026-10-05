export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    Array.from(candidate).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    })
  ) {
    return fallback;
  }

  const base = "https://atlas.invalid";
  try {
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base || parsed.pathname.startsWith("//")) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * `path` with a validated `next` destination attached, so a detour through
 * sign-up, onboarding, or password recovery can still return the user to
 * the page they first asked for. Unsafe or missing destinations are dropped.
 */
export function pathWithNext(
  path: string,
  next: string | null | undefined,
): string {
  const destination = safeRedirectPath(next, "");
  // A destination that is this page itself would only bring the user back.
  const samePage =
    destination &&
    new URL(destination, "https://atlas.invalid").pathname === path;
  return destination && !samePage
    ? `${path}?next=${encodeURIComponent(destination)}`
    : path;
}
