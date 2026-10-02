import type { ComponentProps } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KnowledgeWorkspace,
  type KnowledgeConcept,
} from "./knowledge-workspace";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  review: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/knowledge",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/knowledge/actions", () => ({
  createKnowledgeConceptAction: vi.fn(),
  reviewKnowledgeConceptAction: mocks.review,
  updateKnowledgeConceptAction: vi.fn(),
  setKnowledgeConceptArchivedAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  mocks.review.mockReset();
});

const concept: KnowledgeConcept = {
  id: "99100000-0000-4000-8000-000000000001",
  title: "Compound interest",
  notes: "Interest earns interest over time.",
  category: "Finance",
  tags: ["money"],
  example: null,
  personal_explanation: null,
  confidence: 1,
  review_count: 0,
  interval_days: 0,
  last_reviewed_at: null,
  next_review_at: "2026-09-06T03:00:00.000Z",
  archived_at: null,
  created_at: "2026-09-06T02:00:00.000Z",
};

const second: KnowledgeConcept = {
  ...concept,
  id: "99100000-0000-4000-8000-000000000002",
  title: "Map the system",
  notes: "Plan from the outcome backwards.",
  category: "Career",
  tags: ["planning"],
  confidence: 4,
};

function renderWorkspace(
  concepts = [concept],
  props: Partial<ComponentProps<typeof KnowledgeWorkspace>> = {},
) {
  return render(
    <KnowledgeWorkspace
      concepts={concepts}
      reviews={[]}
      initialView="all"
      initialQuery=""
      initialCategory="all"
      initialSort="next-review"
      nowIso="2026-09-06T04:00:00.000Z"
      {...props}
    />,
  );
}

const library = () => screen.getByRole("region", { name: "Knowledge library" });
const panel = () =>
  screen.getByRole("complementary", { name: "Selected concept" });

describe("KnowledgeWorkspace", () => {
  it("requires active recall before exposing notes and rating controls", () => {
    renderWorkspace([concept], { initialView: "due" });
    expect(screen.queryByText(concept.notes)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reveal notes" }));
    expect(screen.getByText(concept.notes)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeEnabled();
  });

  it("previews the interval each rating would set", () => {
    renderWorkspace([{ ...concept, interval_days: 7, review_count: 3 }]);
    const ratings = within(panel());
    expect(
      ratings.getByRole("button", { name: /Again.*10 min/ }),
    ).toBeInTheDocument();
    expect(
      ratings.getByRole("button", { name: /Hard.*8 days/ }),
    ).toBeInTheDocument();
    expect(
      ratings.getByRole("button", { name: /Good.*15 days/ }),
    ).toBeInTheDocument();
    expect(
      ratings.getByRole("button", { name: /Easy.*25 days/ }),
    ).toBeInTheDocument();
  });

  it("confirms a rating in place with the schedule it set", async () => {
    mocks.review.mockResolvedValue({
      success: true,
      message: "Review recorded.",
      review: {
        conceptId: concept.id,
        outcome: "good",
        intervalDays: 3,
        nextReviewAt: "2026-09-09T04:00:00.000Z",
        confidence: 2,
      },
    });
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Reveal notes" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Good/ }));
    });
    const status = (await screen.findByText(/^Rated Good/)).closest(
      '[role="status"]',
    );
    expect(status).toHaveTextContent(
      /Rated Good\. Next review in 3 days\.\s*Spaced 3 days out\. Strength up to Learning\./,
    );
    expect(mocks.review.mock.calls[0]![1].get("outcome")).toBe("good");
  });

  it("shows a clear empty state for a filtered queue", () => {
    renderWorkspace(
      [{ ...concept, next_review_at: "2026-09-07T04:00:00.000Z" }],
      {
        initialView: "due",
      },
    );
    expect(
      screen.getByText("Nothing is due for review right now."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your next review is tomorrow."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Active recall")).not.toBeInTheDocument();
  });

  it("shows review history and supports the archived library view", () => {
    renderWorkspace([{ ...concept, review_count: 1 }], {
      reviews: [
        {
          id: "99200000-0000-4000-8000-000000000001",
          concept_id: concept.id,
          outcome: "good",
          reviewed_at: "2026-09-06T03:30:00.000Z",
          next_review_at: "2026-09-09T03:30:00.000Z",
          next_interval_days: 3,
        },
      ],
    });
    const history = within(panel())
      .getByRole("heading", { name: "Review history" })
      .closest("section")!;
    expect(within(history).getByText("3 days")).toBeInTheDocument();
    expect(within(history).getByText("Good")).toBeInTheDocument();

    cleanup();
    renderWorkspace([{ ...concept, archived_at: "2026-09-06T04:00:00.000Z" }], {
      initialView: "archived",
    });
    expect(
      screen.getByRole("button", { name: "Restore concept" }),
    ).toBeInTheDocument();
  });

  it("opens the archive for a link to an archived concept", () => {
    renderWorkspace(
      [concept, { ...second, archived_at: "2026-09-06T03:00:00.000Z" }],
      { initialConceptId: second.id },
    );
    expect(
      screen.getByRole("button", { name: /Archived, 1 concept/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(panel()).getByRole("heading", { name: second.title }),
    ).toBeInTheDocument();
  });

  it("combines case-insensitive search and category filtering, then clears them", () => {
    renderWorkspace([concept, second]);

    fireEvent.change(screen.getByLabelText("Search concepts"), {
      target: { value: "MONEY" },
    });
    expect(
      within(library()).getByText("Compound interest"),
    ).toBeInTheDocument();
    expect(
      within(library()).queryByText("Map the system"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove search: MONEY" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Career" },
    });
    expect(
      screen.getByText("No concepts match these filters."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      within(library()).getByText("Compound interest"),
    ).toBeInTheDocument();
    expect(within(library()).getByText("Map the system")).toBeInTheDocument();
  });

  it("shows view counts and records browse state in the URL", () => {
    mocks.replace.mockClear();
    renderWorkspace([
      concept,
      {
        ...concept,
        id: "99100000-0000-4000-8000-000000000003",
        title: "Future concept",
        next_review_at: "2026-09-07T04:00:00.000Z",
        confidence: 5,
      },
    ]);

    expect(
      screen.getByRole("button", { name: /All concepts, 2 concepts/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Due for review, 1 concept/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Needs practice, 1 concept/ }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Needs practice, 1 concept/ }),
    );
    expect(mocks.replace).toHaveBeenLastCalledWith("/knowledge?view=weak");
  });

  it("sorts by title and does not reveal notes for a replacement selection", () => {
    renderWorkspace([concept, { ...second, title: "Alpha planning" }]);

    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "title" },
    });
    const rows = within(library());
    const alpha = rows.getByRole("button", { name: /Alpha planning/ });
    const compound = rows.getByRole("button", { name: /Compound interest/ });
    expect(
      alpha.compareDocumentPosition(compound) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(compound);
    fireEvent.click(screen.getByRole("button", { name: "Reveal notes" }));
    expect(screen.getByText(concept.notes)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search concepts"), {
      target: { value: "planning" },
    });
    expect(screen.queryByText(concept.notes)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Plan from the outcome backwards."),
    ).not.toBeInTheDocument();
  });

  it("walks the due queue in a review session and sums it up", async () => {
    mocks.review.mockImplementation(async (_state, formData: FormData) => ({
      success: true,
      message: "Review recorded.",
      review: {
        conceptId: formData.get("conceptId"),
        outcome: formData.get("outcome"),
        intervalDays: 3,
        nextReviewAt: "2026-09-09T04:00:00.000Z",
        confidence: 2,
      },
    }));
    renderWorkspace([
      concept,
      { ...second, next_review_at: concept.next_review_at },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Start review" }));
    const session = screen.getByRole("dialog", { name: "Concept 1 of 2" });
    fireEvent.click(
      within(session).getByRole("button", { name: "Reveal notes" }),
    );
    await act(async () => {
      fireEvent.click(within(session).getByRole("button", { name: /Easy/ }));
    });

    expect(
      await screen.findByRole("dialog", { name: "Concept 2 of 2" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    const summary = await screen.findByRole("dialog", { name: "Summary" });
    expect(
      within(summary).getByRole("heading", { name: "Session complete" }),
    ).toBeInTheDocument();
    expect(summary).toHaveTextContent(
      "You reviewed 1 concept and recalled 1 well. 1 skipped stays due.",
    );
    fireEvent.click(within(summary).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains the method and holds the only add button before anything is saved", () => {
    renderWorkspace([]);
    expect(screen.getAllByRole("button", { name: "Add concept" })).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("list", { name: "How Knowledge works" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Knowledge library" }),
    ).not.toBeInTheDocument();
  });
});
