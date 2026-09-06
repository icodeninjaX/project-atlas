import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgeWorkspace } from "./knowledge-workspace";

vi.mock("@/lib/knowledge/actions", () => ({
  createKnowledgeConceptAction: vi.fn(),
  reviewKnowledgeConceptAction: vi.fn(),
  updateKnowledgeConceptAction: vi.fn(),
  setKnowledgeConceptArchivedAction: vi.fn(),
}));

afterEach(cleanup);

const concept = {
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

describe("KnowledgeWorkspace", () => {
  it("requires active recall before exposing notes and rating controls", () => {
    render(
      <KnowledgeWorkspace
        concepts={[concept]}
        reviews={[]}
        initialView="due"
        nowIso="2026-09-06T04:00:00.000Z"
      />,
    );
    expect(screen.queryByText(concept.notes)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reveal notes" }));
    expect(screen.getByText(concept.notes)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good/ })).toBeEnabled();
  });

  it("shows a clear empty state for a filtered queue", () => {
    render(
      <KnowledgeWorkspace
        concepts={[{ ...concept, next_review_at: "2026-09-07T04:00:00.000Z" }]}
        reviews={[]}
        initialView="due"
        nowIso="2026-09-06T04:00:00.000Z"
      />,
    );
    expect(screen.getByText("Nothing matches this view.")).toBeInTheDocument();
    expect(screen.queryByText("Active recall")).not.toBeInTheDocument();
  });

  it("shows review history and supports the archived library view", () => {
    render(
      <KnowledgeWorkspace
        concepts={[{ ...concept, review_count: 1 }]}
        reviews={[
          {
            id: "99200000-0000-4000-8000-000000000001",
            concept_id: concept.id,
            outcome: "good",
            reviewed_at: "2026-09-06T03:30:00.000Z",
            next_review_at: "2026-09-09T03:30:00.000Z",
            next_interval_days: 3,
          },
        ]}
        initialView="library"
        nowIso="2026-09-06T04:00:00.000Z"
      />,
    );
    expect(screen.getByText("Review history")).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();

    cleanup();
    render(
      <KnowledgeWorkspace
        concepts={[{ ...concept, archived_at: "2026-09-06T04:00:00.000Z" }]}
        reviews={[]}
        initialView="archived"
        nowIso="2026-09-06T04:00:00.000Z"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Restore concept" }),
    ).toBeInTheDocument();
  });
});
