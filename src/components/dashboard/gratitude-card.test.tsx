import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GratitudeCard,
  GRATITUDE_ROTATION_INTERVAL_MS,
} from "./gratitude-card";
import { getGratitudeReflection } from "@/lib/gratitude/gratitude-reflections";

describe("GratitudeCard", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("explains its refresh and hourly rotation", () => {
    render(<GratitudeCard initialGratitude={getGratitudeReflection(0)} />);

    expect(
      screen.getByText("Fresh on refresh · Changes hourly · 365 reflections"),
    ).toBeInTheDocument();
  });

  it("changes to a different reflection after one hour", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const initialGratitude = getGratitudeReflection(0);
    render(<GratitudeCard initialGratitude={initialGratitude} />);

    expect(screen.getByText(initialGratitude.message)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(GRATITUDE_ROTATION_INTERVAL_MS);
    });

    expect(
      screen.queryByText(initialGratitude.message),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(getGratitudeReflection(1).message),
    ).toBeInTheDocument();
  });

  it("avoids repeating the reflection remembered from the previous refresh", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const initialGratitude = getGratitudeReflection(0);
    window.sessionStorage.setItem("atlas-gratitude-reflection", "0");

    render(<GratitudeCard initialGratitude={initialGratitude} />);

    expect(
      screen.queryByText(initialGratitude.message),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(getGratitudeReflection(1).message),
    ).toBeInTheDocument();
  });
});
