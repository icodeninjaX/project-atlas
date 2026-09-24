import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreeformWorkspace } from "./freeform-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Freeform Analyst workspace", () => {
  it("requires disclosure and opens cited evidence on narrow layouts", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "answered",
          claims: [
            {
              kind: "interpretation",
              text: "This may warrant a closer look at expenses.",
              evidenceIds: ["money.current"],
            },
          ],
          evidence: [
            {
              id: "money.current",
              metric: "Recorded expenses",
              value: 12000,
              unit: "centavos",
              period: { from: "2026-09-01", through: "2026-09-24" },
              comparisonBasis: "Recorded transactions",
              completeness: "complete",
              source: {
                description: "Transactions",
                recordIds: [],
                href: "/money/transactions",
              },
              claimType: "FACT",
              provenance: {
                tool: "getMoneySummary",
                calculationVersion: "1",
                retrievedAt: "2026-09-24T00:00:00Z",
                textTrust: "untrusted_data",
              },
            },
          ],
          limitations: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(<FreeformWorkspace />);
    const submit = screen.getByRole("button", { name: "Ask Analyst" });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Ask your own question" }),
      "What needs my attention in money?",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(submit);
    await waitFor(() =>
      expect(
        screen.getByText("This may warrant a closer look at expenses."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Inspected records span 2026-09-01 to 2026-09-24/),
    ).toBeInTheDocument();
    const sent = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(sent.dataSharingAcknowledged).toBe(true);
    const citation = screen.getByRole("link", { name: "Recorded expenses" });
    expect(citation).toHaveAttribute("href", "#evidence-money.current");
    const details = screen
      .getByText(/How this was answered/)
      .closest("details")!;
    expect(details.open).toBe(false);
    await user.click(citation);
    expect(details.open).toBe(true);
    expect(
      screen.getByRole("link", { name: "View ATLAS records" }),
    ).toHaveAttribute("href", "/money/transactions");
  });
});
