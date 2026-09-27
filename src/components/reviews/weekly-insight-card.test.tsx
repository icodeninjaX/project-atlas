import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyProvider } from "@/components/privacy/privacy-provider";
import { WeeklyInsightCard } from "./weekly-insight-card";

const action = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reviews/insight-actions", () => ({
  setWeeklyInsightAutoAction: action,
}));
const thisWeekConsent = () =>
  screen.getByRole("checkbox", { name: /These weekly totals/ });

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
    await user.click(thisWeekConsent());
    await user.click(button);
    const claim = await screen.findByText(/Recorded expenses were/);
    expect(claim).not.toHaveTextContent("1,234.50");
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      mode: "current",
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
    await user.click(thisWeekConsent());
    await user.click(screen.getByRole("button", { name: "Generate insight" }));
    expect(
      await screen.findByText("An AI insight is unavailable."),
    ).toBeVisible();
    expect(screen.getByText("Weekly facts (1)")).toBeVisible();
  });

  it("shows last week's stored insight without a request", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <WeeklyInsightCard
        autoEnabled
        lastWeek={{
          status: "answered",
          claims: [
            {
              kind: "observation",
              text: "Last week had four completed tasks recorded.",
              evidenceIds: [evidence.id],
              comparison: null,
            },
          ],
          evidence: [evidence as never],
          limitations: [],
        }}
      />,
    );
    expect(
      screen.getByText("Last week had four completed tasks recorded."),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("prepares last week automatically once when opted in", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "answered",
          claims: [
            {
              kind: "observation",
              text: "Recorded income was steady last week.",
              evidenceIds: [evidence.id],
              comparison: null,
            },
          ],
          evidence: [evidence],
          limitations: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(<WeeklyInsightCard autoEnabled />);
    expect(screen.getByRole("status")).toHaveTextContent("Preparing");
    expect(
      await screen.findByText("Recorded income was steady last week."),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      mode: "previous",
    });
  });
  it("saves the opt-in and then prepares last week", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({ success: true, message: "On" });
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "fallback",
          message: "Not enough records.",
          evidence: [],
          limitations: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(<WeeklyInsightCard />);
    expect(fetch).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /Prepare last week’s insight automatically/,
      }),
    );
    expect(action).toHaveBeenCalledWith(true);
    expect(await screen.findByText("Not enough records.")).toBeVisible();
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      mode: "previous",
    });
  });
});
