import { describe, expect, it } from "vitest";
import {
  getGratitudeReflection,
  getRandomGratitude,
  GRATITUDE_COLLECTION_SIZE,
} from "./gratitude-reflections";

describe("gratitude reflections", () => {
  it("provides hundreds of distinct curated wordings", () => {
    const messages = Array.from(
      { length: GRATITUDE_COLLECTION_SIZE },
      (_, index) => getGratitudeReflection(index).message,
    );

    expect(GRATITUDE_COLLECTION_SIZE).toBe(365);
    expect(new Set(messages)).toHaveLength(365);
  });

  it("selects across the full collection", () => {
    expect(getRandomGratitude(undefined, 0).index).toBe(0);
    expect(getRandomGratitude(undefined, 0.999_999).index).toBe(364);
  });

  it("never immediately repeats an excluded reflection", () => {
    const sampleRandomValues = [0, 0.25, 0.5, 0.75, 0.999_999];

    for (
      let previousIndex = 0;
      previousIndex < GRATITUDE_COLLECTION_SIZE;
      previousIndex += 1
    ) {
      for (const randomValue of sampleRandomValues) {
        expect(getRandomGratitude(previousIndex, randomValue).index).not.toBe(
          previousIndex,
        );
      }
    }
  });

  it("wraps valid integer indexes around the collection", () => {
    expect(getGratitudeReflection(-1).index).toBe(364);
    expect(getGratitudeReflection(365).index).toBe(0);
  });

  it.each([-0.01, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid random value of %s",
    (randomValue) => {
      expect(() => getRandomGratitude(undefined, randomValue)).toThrow(
        "Random value must be between 0",
      );
    },
  );
});
