import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KnowledgeWorkspace,
  type KnowledgeConcept,
} from "./knowledge-workspace";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/knowledge",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/knowledge/actions", () => ({
  createKnowledgeConceptAction: vi.fn(),
  reviewKnowledgeConceptAction: vi.fn(),
  updateKnowledgeConceptAction: vi.fn(),
  setKnowledgeConceptArchivedAction: vi.fn(),
}));

afterEach(cleanup);

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

describe("KnowledgeWorkspace", () => {
  it("requires active recall before exposing notes and rating controls", () => {
    renderWorkspace([concept], { initialView: "due" });
    expect(screen.queryByText(concept.notes)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reveal notes" }));
    expect(screen.getByText(concept.notes)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeEnabled();
  });

  it("shows a clear empty state for a filtered queue", () => {
    renderWorkspace(
      [{ ...concept, next_review_at: "2026-09-07T04:00:00.000Z" }],
      { initialView: "due" },
    );
    expect(
      screen.getByText("Nothing is due for review right now."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Active recall")).not.toBeInTheDocument();
  });

  it("shows review history and supports the archived library view", () => {
    renderWorkspace([{ ...concept, review_count: 1 }], {
      initialView: "all",
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
    expect(screen.getByText("Review history")).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();

    cleanup();
    renderWorkspace([{ ...concept, archived_at: "2026-09-06T04:00:00.000Z" }], {
      initialView: "archived",
    });
    expect(
      screen.getByRole("button", { name: "Restore concept" }),
    ).toBeInTheDocument();
  });

  it("combines case-insensitive search and category filtering, then clears them", () => {
    renderWorkspace([
      concept,
      {
        ...concept,
        id: "99100000-0000-4000-8000-000000000002",
        title: "Map the system",
        category: "Career",
        tags: ["planning"],
        confidence: 4,
      },
    ]);

    fireEvent.change(screen.getByLabelText("Search concepts"), {
      target: { value: "MONEY" },
    });
    expect(screen.getByText("Compound interest")).toBeInTheDocument();
    expect(screen.queryByText("Map the system")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Career" },
    });
    expect(
      screen.getByText("No concepts match these filters."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Compound interest")).toBeInTheDocument();
    expect(screen.getByText("Map the system")).toBeInTheDocument();
  });

  it("shows view counts and records browse state in the URL", () => {
    mocks.replace.mockClear();
    renderWorkspace([
      concept,
      {
        ...concept,
        id: "99100000-0000-4000-8000-000000000002",
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
    renderWorkspace([
      concept,
      {
        ...concept,
        id: "99100000-0000-4000-8000-000000000002",
        title: "Alpha planning",
        notes: "Plan from the outcome backwards.",
        category: "Career",
        tags: ["planning"],
        confidence: 4,
      },
    ]);

    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "title" },
    });
    const alpha = screen.getByRole("button", { name: /Alpha planning/ });
    const compound = screen.getByRole("button", { name: /Compound interest/ });
    expect(
      alpha.compareDocumentPosition(compound) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

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
});
