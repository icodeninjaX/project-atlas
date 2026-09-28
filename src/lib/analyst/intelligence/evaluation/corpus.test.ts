import { describe, expect, it } from "vitest";
import { toolInputs } from "@/lib/analyst/tools/contracts";
import {
  CORPUS_CAPABILITIES,
  DEVELOPMENT_CASES,
  EVALUATION_CORPUS,
  FAILURE_CATEGORIES,
  HOLDOUT_CASES,
  RESULT_STATES,
} from "./corpus";
import { EXPECTED_FACTS } from "./expected";
import { FIXTURE_DATASETS, OWNER_A, OWNER_B } from "./fixtures";

describe("Analyst intelligence evaluation corpus", () => {
  it("has the 60 base cases split 40 development and 20 holdout", () => {
    expect(EVALUATION_CORPUS).toHaveLength(60);
    expect(EVALUATION_CORPUS.map((item) => item.id)).toEqual(
      Array.from(
        { length: 60 },
        (_, i) => `Q${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(DEVELOPMENT_CASES).toHaveLength(40);
    expect(HOLDOUT_CASES).toHaveLength(20);
  });

  it("references only registered tools, known facts and known vocabulary", () => {
    const tools = new Set(Object.keys(toolInputs));
    for (const item of EVALUATION_CORPUS) {
      for (const tool of item.legacy.tools) expect(tools).toContain(tool);
      for (const key of item.requiredFacts)
        expect(EXPECTED_FACTS).toHaveProperty(key);
      for (const status of item.expectedStatus)
        expect(RESULT_STATES).toContain(status);
      for (const risk of item.legacy.risks)
        expect(FAILURE_CATEGORIES).toContain(risk);
      for (const req of item.requirements)
        for (const capability of req.capabilities)
          expect(CORPUS_CAPABILITIES).toContain(capability);
      for (const { pattern } of item.forbidden)
        expect(() => new RegExp(pattern, "i")).not.toThrow();
    }
  });

  it("gives every case an essential requirement with a unique ID", () => {
    for (const item of EVALUATION_CORPUS) {
      const ids = item.requirements.map((req) => req.id);
      expect(new Set(ids).size, item.id).toBe(ids.length);
      expect(
        item.requirements.some((req) => req.essential),
        item.id,
      ).toBe(true);
    }
  });

  it("keeps each required fact on the case's owner and fixture variant", () => {
    for (const item of EVALUATION_CORPUS)
      for (const key of item.requiredFacts) {
        const fact = EXPECTED_FACTS[key]!;
        expect(fact.owner, `${item.id} ${key}`).toBe(item.owner);
        expect(fact.variant, `${item.id} ${key}`).toBe(item.variant);
      }
  });

  it("covers the dimensions the release gates measure", () => {
    const tagged = (tag: string) =>
      EVALUATION_CORPUS.filter((item) => item.tags.includes(tag as never));
    expect(tagged("hard").length).toBeGreaterThanOrEqual(10);
    expect(tagged("conversation").length).toBeGreaterThanOrEqual(9);
    expect(tagged("security").length).toBeGreaterThanOrEqual(4);
    expect(tagged("operational").length).toBeGreaterThanOrEqual(4);
    expect(EVALUATION_CORPUS.some((item) => item.owner === OWNER_B)).toBe(true);
    expect(EVALUATION_CORPUS.some((item) => item.language === "fil-en")).toBe(
      true,
    );
    // Holdout still exercises hard, conversation and security behavior.
    for (const tag of ["hard", "conversation", "security"])
      expect(
        HOLDOUT_CASES.some((item) => item.tags.includes(tag as never)),
        tag,
      ).toBe(true);
  });
});

describe("Analyst intelligence fixtures", () => {
  it("keep every record on its own owner", () => {
    for (const variant of Object.values(FIXTURE_DATASETS))
      for (const [owner, data] of Object.entries(variant))
        for (const records of Object.values(data))
          for (const record of records as Array<{ ownerId?: string }>)
            if (typeof record === "object" && record && "ownerId" in record)
              expect(record.ownerId).toBe(owner);
  });

  it("use only integer centavos and unique IDs", () => {
    const ids = new Set<string>();
    for (const variant of ["rich"] as const)
      for (const owner of [OWNER_A, OWNER_B] as const) {
        const data = FIXTURE_DATASETS[variant][owner];
        for (const row of data.transactions) {
          expect(
            Number.isSafeInteger(row.amountCentavos) && row.amountCentavos > 0,
          ).toBe(true);
          expect(ids.has(row.id)).toBe(false);
          ids.add(row.id);
        }
      }
  });
});
