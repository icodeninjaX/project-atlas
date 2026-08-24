"use client";

import { useEffect, useState } from "react";

const DIALOGUE_STORAGE_KEY = "atlas-launch-dialogue";
const LAUNCH_DURATION_MS = 4500;
const LAUNCH_MEDIA_QUERY =
  "(max-width: 767px) and (prefers-reduced-motion: no-preference)";

export const BRAND_LAUNCH_DIALOGUES = [
  {
    prompt: "Where are you now?",
    response: "Let’s find the next move.",
  },
  {
    prompt: "What matters today?",
    response: "Bring it into focus.",
  },
  {
    prompt: "Ready to move?",
    response: "Your route is waiting.",
  },
  {
    prompt: "A lot on your mind?",
    response: "Let’s make it clear.",
  },
  {
    prompt: "Looking ahead?",
    response: "Start with what matters.",
  },
] as const;

function getRandomUnit() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return (value[0] ?? 0) / 2 ** 32;
  }

  return Math.random();
}

export function chooseLaunchDialogueIndex(
  previousIndex: number | null,
  randomUnit = getRandomUnit(),
) {
  const count = BRAND_LAUNCH_DIALOGUES.length;
  const normalizedRandom = Math.min(
    Math.max(randomUnit, 0),
    1 - Number.EPSILON,
  );

  if (
    previousIndex === null ||
    previousIndex < 0 ||
    previousIndex >= count ||
    count < 2
  ) {
    return Math.floor(normalizedRandom * count);
  }

  const candidate = Math.floor(normalizedRandom * (count - 1));
  return candidate >= previousIndex ? candidate + 1 : candidate;
}

export function BrandLaunchDialogue() {
  const [dialogueIndex, setDialogueIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!window.matchMedia?.(LAUNCH_MEDIA_QUERY).matches) {
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    let previousIndex: number | null = null;

    root.style.overflow = "hidden";

    try {
      const storedIndex = window.sessionStorage.getItem(DIALOGUE_STORAGE_KEY);
      previousIndex = storedIndex === null ? null : Number(storedIndex);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }

    const nextIndex = chooseLaunchDialogueIndex(previousIndex);

    try {
      window.sessionStorage.setItem(DIALOGUE_STORAGE_KEY, String(nextIndex));
    } catch {
      // The launch experience still works when storage is unavailable.
    }

    const revealDialogue = window.setTimeout(
      () => setDialogueIndex(nextIndex),
      0,
    );
    const unlockPage = window.setTimeout(() => {
      root.style.overflow = previousOverflow;
    }, LAUNCH_DURATION_MS);

    return () => {
      window.clearTimeout(revealDialogue);
      window.clearTimeout(unlockPage);
      root.style.overflow = previousOverflow;
    };
  }, []);

  if (dialogueIndex === null) {
    return null;
  }

  const dialogue =
    BRAND_LAUNCH_DIALOGUES[dialogueIndex] ?? BRAND_LAUNCH_DIALOGUES[0];

  return (
    <p className="atlas-launch-dialogue">
      <span className="atlas-launch-dialogue-prompt">{dialogue.prompt}</span>
      <span className="atlas-launch-dialogue-response">
        {dialogue.response}
      </span>
    </p>
  );
}
