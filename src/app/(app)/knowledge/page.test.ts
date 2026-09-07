import { describe, expect, it } from "vitest";
import { resolveKnowledgeBrowseState } from "./page";

describe("resolveKnowledgeBrowseState", () => {
  it("defaults to all concepts and accepts current browsing parameters", () => {
    expect(
      resolveKnowledgeBrowseState({
        query: "compound",
        category: "Finance",
        sort: "title",
      }),
    ).toEqual({
      initialView: "all",
      initialSort: "title",
      initialQuery: "compound",
      initialCategory: "Finance",
    });
  });

  it("keeps legacy knowledge links working", () => {
    expect(resolveKnowledgeBrowseState({ view: "recent" })).toMatchObject({
      initialView: "all",
      initialSort: "newest",
    });
    expect(resolveKnowledgeBrowseState({ view: "weak" })).toMatchObject({
      initialView: "weak",
    });
    expect(resolveKnowledgeBrowseState({ view: "due" })).toMatchObject({
      initialView: "due",
    });
    expect(resolveKnowledgeBrowseState({ view: "archived" })).toMatchObject({
      initialView: "archived",
    });
  });
});
