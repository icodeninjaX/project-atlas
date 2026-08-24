"use client";

import { Sunrise } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getRandomGratitude,
  type GratitudeReflection,
} from "@/lib/gratitude/gratitude-reflections";

export const GRATITUDE_ROTATION_INTERVAL_MS = 60 * 60 * 1_000;

const GRATITUDE_SESSION_KEY = "atlas-gratitude-reflection";

function readRememberedIndex() {
  try {
    const storedIndex = window.sessionStorage.getItem(GRATITUDE_SESSION_KEY);
    if (storedIndex === null) return undefined;

    const index = Number(storedIndex);
    return Number.isInteger(index) ? index : undefined;
  } catch {
    return undefined;
  }
}

function rememberIndex(index: number) {
  try {
    window.sessionStorage.setItem(GRATITUDE_SESSION_KEY, String(index));
  } catch {
    // The rotation still works when browser storage is unavailable.
  }
}

export function GratitudeCard({
  className = "",
  initialGratitude,
}: {
  className?: string;
  initialGratitude: GratitudeReflection;
}) {
  const [gratitude, setGratitude] = useState(initialGratitude);
  const didResolveRefresh = useRef(false);

  useEffect(() => {
    if (didResolveRefresh.current) return;
    didResolveRefresh.current = true;

    setGratitude((current) => {
      const rememberedIndex = readRememberedIndex();
      const next =
        rememberedIndex === current.index
          ? getRandomGratitude(current.index)
          : current;

      rememberIndex(next.index);
      return next;
    });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGratitude((current) => {
        const next = getRandomGratitude(current.index);
        rememberIndex(next.index);
        return next;
      });
    }, GRATITUDE_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Card
      aria-label="Gratitude reminder"
      className={`relative overflow-hidden border-[#9a795f]/80 bg-[#172236] text-white ${className}`}
      style={{
        backgroundImage: 'url("/gratitude/atlas-gratitude-card-surface.webp")',
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <CardContent className="relative flex h-full min-h-44 flex-col justify-between p-4 sm:min-h-52 sm:p-6 lg:min-h-56 lg:p-7">
        <div className="pr-16 sm:pr-20 lg:pr-24">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#a9c5ff] uppercase">
            Pause and appreciate
          </p>
          <p
            aria-live="polite"
            className="mt-3 max-w-xl font-serif text-lg leading-6 text-[#f8fafc] sm:mt-4 sm:text-2xl sm:leading-[1.45] lg:text-[1.7rem] lg:leading-[1.35]"
          >
            {gratitude.message}
          </p>
        </div>

        <p className="mt-4 text-xs leading-5 text-[#aab6c8] sm:mt-5">
          Fresh on refresh · Changes hourly · {gratitude.collectionSize}{" "}
          reflections
        </p>

        <Sunrise
          aria-hidden="true"
          className="absolute top-5 right-5 size-11 text-[#dce6f5]/85 sm:top-6 sm:right-6 sm:size-14 lg:top-1/2 lg:right-7 lg:size-16 lg:-translate-y-1/2"
          strokeWidth={1.25}
        />
      </CardContent>
    </Card>
  );
}
