import { describe, expect, it } from "vitest";
import {
  getDailyGratitude,
  GRATITUDE_COLLECTION_SIZE,
} from "./daily-gratitude";

describe("daily gratitude", () => {
  it("provides hundreds of distinct curated wordings", () => {
    expect(GRATITUDE_COLLECTION_SIZE).toBe(365);
  });

  it("matches the selected design wording on August 24, 2026", () => {
    expect(getDailyGratitude("2026-08-24")).toEqual({
      collectionSize: 365,
      dayOfYear: 236,
      daysInYear: 365,
      message:
        "I’m grateful for a body that carries me, a mind that keeps learning, and another day to care.",
    });
  });

  it("does not repeat a wording across 365 consecutive days", () => {
    const messages = Array.from({ length: 365 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 0, 1 + offset));
      return getDailyGratitude(date.toISOString().slice(0, 10)).message;
    });

    expect(new Set(messages)).toHaveLength(365);
  });

  it("reports leap-year progress correctly", () => {
    expect(getDailyGratitude("2028-12-31")).toMatchObject({
      dayOfYear: 366,
      daysInYear: 366,
    });
  });

  it.each(["2026-2-01", "2026-02-30", "not-a-date"])(
    "rejects invalid ISO date %s",
    (isoDate) => {
      expect(() => getDailyGratitude(isoDate)).toThrow("Invalid ISO date");
    },
  );
});
