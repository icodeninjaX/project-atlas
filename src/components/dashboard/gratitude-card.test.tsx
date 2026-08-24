import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GratitudeCard,
  GRATITUDE_ROTATION_INTERVAL_MS,
} from "./gratitude-card";
import { getWisdomQuote } from "@/lib/gratitude/gratitude-reflections";

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

  it("shows the quote category, author, and rotation details", () => {
    const initialQuote = getWisdomQuote(0);
    render(<GratitudeCard initialQuote={initialQuote} />);

    expect(screen.getByText(initialQuote.category)).toBeInTheDocument();
    expect(screen.getByText(`— ${initialQuote.author}`)).toBeInTheDocument();
    expect(
      screen.getByText("New on refresh · Changes hourly · 90 famous quotes"),
    ).toBeInTheDocument();
  });

  it("changes to a different quote after one hour", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const initialQuote = getWisdomQuote(0);
    render(<GratitudeCard initialQuote={initialQuote} />);

    expect(screen.getByText(/Gratitude is not only/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(GRATITUDE_ROTATION_INTERVAL_MS);
    });

    expect(screen.queryByText(/Gratitude is not only/)).not.toBeInTheDocument();
    expect(screen.getByText(/Gratitude is the sign/)).toBeInTheDocument();
  });

  it("avoids repeating the quote remembered from the previous refresh", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const initialQuote = getWisdomQuote(0);
    window.sessionStorage.setItem("atlas-wisdom-quote-v1", "0");

    render(<GratitudeCard initialQuote={initialQuote} />);

    expect(screen.queryByText(/Gratitude is not only/)).not.toBeInTheDocument();
    expect(screen.getByText(/Gratitude is the sign/)).toBeInTheDocument();
  });
});
