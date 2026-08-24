import { describe, expect, it } from "vitest";
import {
  getRandomWisdomQuote,
  getWisdomQuote,
  WISDOM_CATEGORIES,
  WISDOM_COLLECTION_SIZE,
} from "./gratitude-reflections";

describe("famous wisdom quotes", () => {
  it("provides a large, balanced collection of attributed quotes", () => {
    const quotes = Array.from({ length: WISDOM_COLLECTION_SIZE }, (_, index) =>
      getWisdomQuote(index),
    );

    expect(WISDOM_COLLECTION_SIZE).toBe(90);
    expect(new Set(quotes.map((quote) => quote.message))).toHaveLength(90);
    expect(quotes.every((quote) => quote.author.length > 0)).toBe(true);
    expect(
      Math.max(
        ...quotes.map((quote) => quote.message.trim().split(/\s+/).length),
      ),
    ).toBeLessThanOrEqual(24);

    for (const category of WISDOM_CATEGORIES) {
      expect(
        quotes.filter((quote) => quote.category === category),
      ).toHaveLength(30);
    }
  });

  it("selects across the full collection", () => {
    expect(getRandomWisdomQuote(undefined, 0).index).toBe(0);
    expect(getRandomWisdomQuote(undefined, 0.999_999).index).toBe(89);
  });

  it("never immediately repeats an excluded quote", () => {
    const sampleRandomValues = [0, 0.25, 0.5, 0.75, 0.999_999];

    for (
      let previousIndex = 0;
      previousIndex < WISDOM_COLLECTION_SIZE;
      previousIndex += 1
    ) {
      for (const randomValue of sampleRandomValues) {
        expect(getRandomWisdomQuote(previousIndex, randomValue).index).not.toBe(
          previousIndex,
        );
      }
    }
  });

  it("wraps valid integer indexes around the collection", () => {
    expect(getWisdomQuote(-1).index).toBe(89);
    expect(getWisdomQuote(90).index).toBe(0);
  });

  it.each([-0.01, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid random value of %s",
    (randomValue) => {
      expect(() => getRandomWisdomQuote(undefined, randomValue)).toThrow(
        "Random value must be between 0",
      );
    },
  );
});
