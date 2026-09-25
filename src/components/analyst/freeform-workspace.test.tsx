import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreeformWorkspace } from "./freeform-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Freeform Analyst workspace", () => {
  it("stacks a source-linked scenario comparison with assumptions", async () => {
    const user = userEvent.setup();
    const evidence = ["Current", "Option 1", "Option 2"].map(
      (label, index) => ({
        id: `scenario.${index}`,
        metric: `${label} · Runway estimate`,
        value: 6 - index,
        unit: "months",
        period: { from: "2026-09-01", through: "2026-09-24" },
        comparisonBasis: `${label}: stated assumptions`,
        completeness: "complete",
        source: { description: "Runway", recordIds: [], href: "/money/runway" },
        claimType: index === 0 ? "FACT" : "SCENARIO",
        provenance: {
          tool: "compareFinancialScenarios",
          calculationVersion: "1",
          retrievedAt: "2026-09-24T00:00:00Z",
          textTrust: "untrusted_data",
        },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fallback",
            message: "Calculated comparison available.",
            evidence,
            limitations: [],
          }),
          { status: 200 },
        ),
      ),
    );
    render(<FreeformWorkspace />);
    await user.type(
      screen.getByRole("textbox", { name: "Ask your own question" }),
      "What if monthly income falls by 20%?",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Ask Analyst" }));
    const comparison = await screen.findByLabelText(
      "Runway scenario comparison",
    );
    expect(comparison).toHaveTextContent("Current: stated assumptions");
    expect(comparison).toHaveTextContent("Option 1: stated assumptions");
    expect(comparison).toHaveTextContent("Option 2: stated assumptions");
    expect(
      screen.getByRole("link", { name: "Review or edit runway assumptions" }),
    ).toHaveAttribute("href", "/money/runway");
  });
  it("sends the selected active debt with a monthly scenario", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: "fallback", evidence: [], limitations: [] }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    render(
      <FreeformWorkspace
        debts={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            creditor_name: "Test debt",
          },
        ]}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Ask your own question" }),
      "What if I pay an extra 100 pesos monthly?",
    );
    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Active debt for a monthly payment scenario (optional)",
      }),
      "11111111-1111-4111-8111-111111111111",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Ask Analyst" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({
      debtId: "11111111-1111-4111-8111-111111111111",
    });
  });
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
              relationship: {
                source: {
                  type: "task",
                  id: "11111111-1111-4111-8111-111111111111",
                },
                target: {
                  type: "goal",
                  id: "22222222-2222-4222-8222-222222222222",
                },
                origin: "native",
              },
            },
          ],
          limitations: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <FreeformWorkspace
        goals={[
          { id: "22222222-2222-4222-8222-222222222222", title: "Career goal" },
        ]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Ask Analyst" });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Ask your own question" }),
      "What needs my attention in money?",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Specific goal (optional)" }),
      "22222222-2222-4222-8222-222222222222",
    );
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
    expect(sent.goalId).toBe("22222222-2222-4222-8222-222222222222");
    const citation = screen.getByRole("link", { name: "Recorded expenses" });
    expect(citation).toHaveAttribute("href", "#evidence-money.current");
    const details = screen
      .getByText(/How this was answered/)
      .closest("details")!;
    expect(details.open).toBe(false);
    await user.click(citation);
    expect(details.open).toBe(true);
    expect(
      screen.getByText(/Current native path: task → goal/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View ATLAS records" }),
    ).toHaveAttribute("href", "/money/transactions");
  });
});
