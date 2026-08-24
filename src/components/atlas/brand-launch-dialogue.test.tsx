import { describe, expect, it } from "vitest";
import {
  BRAND_LAUNCH_DIALOGUES,
  chooseLaunchDialogueIndex,
} from "./brand-launch-dialogue";

describe("BrandLaunchDialogue", () => {
  it("offers at least three unique two-line dialogues", () => {
    const dialogueText = BRAND_LAUNCH_DIALOGUES.map(
      ({ prompt, response }) => `${prompt} ${response}`,
    );

    expect(BRAND_LAUNCH_DIALOGUES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(dialogueText).size).toBe(BRAND_LAUNCH_DIALOGUES.length);
    expect(
      BRAND_LAUNCH_DIALOGUES.every(
        ({ prompt, response }) => prompt && response,
      ),
    ).toBe(true);
  });

  it("does not immediately repeat the previous dialogue", () => {
    for (
      let previousIndex = 0;
      previousIndex < BRAND_LAUNCH_DIALOGUES.length;
      previousIndex += 1
    ) {
      expect(chooseLaunchDialogueIndex(previousIndex, 0)).not.toBe(
        previousIndex,
      );
      expect(chooseLaunchDialogueIndex(previousIndex, 0.999)).not.toBe(
        previousIndex,
      );
    }
  });

  it("can choose every dialogue when there is no previous selection", () => {
    const lastIndex = BRAND_LAUNCH_DIALOGUES.length - 1;

    expect(chooseLaunchDialogueIndex(null, 0)).toBe(0);
    expect(chooseLaunchDialogueIndex(null, 0.999)).toBe(lastIndex);
  });
});
