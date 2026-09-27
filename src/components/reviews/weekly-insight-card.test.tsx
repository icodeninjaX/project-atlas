import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { WeeklyInsightCard } from "./weekly-insight-card";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const evidence = {
  id: "expense_centavos.2026-09-21",
  metric: "Recorded expenses",
  value: 123450,
  unit: "centavos",
  period: { from: "2026-09-21", through: "2026-09-24" },
};

describe("Weekly insight card", () => {
  it("requires consent, then shows checked claims with masked pesos", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("atlas:privacy-mode:owner-a", "hidden");
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "answered",
          claims: [
            {
              kind: "observation",
              text: "Recorded expenses were ₱1,234.50 so far this week.",
              evidenceIds: [evidence.id],
              comparison: null,
            },
          ],
          evidence: [evidence],
          limitations: ["Compared through 2026-09-24."],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <PrivacyProvider userId="owner-a">
        <WeeklyInsightCard />
      </PrivacyProvider>,
    );
    const button = screen.getByRole("button", { name: "Generate insight" });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(button);
    const claim = await screen.findByText(/Recorded expenses were/);
    expect(claim).not.toHaveTextContent("1,234.50");
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      dataSharingAcknowledged: true,
    });
    expect(screen.getByText("Compared through 2026-09-24.")).toBeVisible();
  });
  it("shows the fallback message and facts", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fallback",
            message: "An AI insight is unavailable.",
            evidence: [evidence],
            limitations: [],
          }),
          { status: 200 },
        ),
      ),
    );
    render(<WeeklyInsightCard />);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Generate insight" }));
    expect(
      await screen.findByText("An AI insight is unavailable."),
    ).toBeVisible();
    expect(screen.getByText("Weekly facts (1)")).toBeVisible();
  });
});
