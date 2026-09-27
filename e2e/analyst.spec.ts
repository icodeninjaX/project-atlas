import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, "A disposable local E2E account is required.");

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Skip optional details" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }
});

for (const width of [390, 1280]) {
  test(`Analyst asks once for consent and answers a suggested question at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/analyst");
    await expect(
      page.getByRole("heading", { name: "ATLAS Analyst" }),
    ).toBeVisible();
    await expect(page.getByLabel("AI model")).toHaveCount(0);
    await page.route("**/api/analyst/freeform", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "answered",
          claims: [
            {
              kind: "observation",
              text: "Recorded expenses were ₱123.45 this month.",
              evidenceIds: ["money.current"],
              comparison: null,
            },
          ],
          evidence: [
            {
              id: "money.current",
              metric: "Recorded expenses",
              value: 12345,
              unit: "centavos",
              period: { from: "2026-09-01", through: "2026-09-24" },
              comparisonBasis: "Recorded transactions",
              source: {
                description: "Transactions",
                recordIds: [],
                href: "/money/transactions",
              },
              completeness: "complete",
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
      }),
    );
    // Without consent a suggestion only fills the box.
    const suggestion = page.getByRole("button", {
      name: "How did my spending compare to my income last month?",
    });
    await suggestion.click();
    await expect(
      page.getByRole("button", { name: "Ask Analyst" }),
    ).toBeDisabled();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Ask Analyst" }).click();
    await expect(
      page.getByText("Recorded expenses were ₱123.45 this month."),
    ).toBeVisible();
    // Consent is remembered on this device.
    await page.reload();
    await expect(page.getByText(/Data sharing on/)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  });
}

for (const width of [390, 1280]) {
  test(`Freeform Analyst keeps citations and sources usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/analyst");
    const ask = page.getByRole("button", { name: "Ask Analyst" });
    await expect(ask).toBeDisabled();
    await page
      .getByRole("textbox", { name: "Ask about your ATLAS records" })
      .fill("What needs attention in my finances?");
    await page.getByRole("checkbox").first().check();
    await page.route("**/api/analyst/freeform", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "answered",
          claims: [
            {
              kind: "interpretation",
              text: "This may warrant a closer look at recorded expenses.",
              evidenceIds: ["money.current"],
              comparison: null,
            },
          ],
          evidence: [
            {
              id: "money.current",
              metric: "Recorded expenses",
              value: 12345,
              unit: "centavos",
              period: { from: "2026-09-01", through: "2026-09-24" },
              comparisonBasis: "Recorded transactions",
              source: {
                description: "Transactions",
                recordIds: [],
                href: "/money/transactions",
              },
              completeness: "complete",
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
      }),
    );
    await ask.click();
    await expect(
      page.getByText("This may warrant a closer look at recorded expenses."),
    ).toBeVisible();
    const citation = page.getByRole("link", { name: "Recorded expenses" });
    await citation.click();
    await expect(page.getByText("₱123.45")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View ATLAS records" }),
    ).toHaveAttribute("href", "/money/transactions");
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  });
}

for (const width of [320, 1280]) {
  test(`Scenario comparison stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/analyst");
    await page
      .getByRole("textbox", { name: "Ask about your ATLAS records" })
      .fill("What if monthly income falls by 20%?");
    await page.getByRole("checkbox").first().check();
    const evidence = ["Current", "Option 1", "Option 2"].flatMap(
      (label, index) =>
        ["Runway estimate", "Monthly income"].map((metric) => ({
          id: `scenario.${index}.${metric}`,
          metric: `${label} · ${metric}`,
          value:
            metric === "Runway estimate" ? 6 - index : 400000 - index * 50000,
          unit: metric === "Runway estimate" ? "months" : "centavos",
          period: { from: "2026-09-01", through: "2026-09-25" },
          comparisonBasis: `${label}: stated assumptions`,
          source: {
            description: "Runway",
            recordIds: [],
            href: "/money/runway",
          },
          completeness: "complete",
          claimType: index === 0 ? "FACT" : "SCENARIO",
          provenance: {
            tool: "compareFinancialScenarios",
            calculationVersion: "1",
            retrievedAt: "2026-09-25T00:00:00Z",
            textTrust: "untrusted_data",
          },
        })),
    );
    await page.route("**/api/analyst/freeform", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "fallback",
          message: "Calculated comparison available.",
          evidence,
          limitations: ["Estimates are not guaranteed outcomes."],
        }),
      }),
    );
    await page.getByRole("button", { name: "Ask Analyst" }).click();
    const comparison = page.getByLabel("Runway scenario comparison");
    await expect(comparison).toBeVisible();
    await expect(
      comparison.getByRole("heading", { name: "Current" }),
    ).toBeVisible();
    await expect(
      comparison.getByRole("heading", { name: "Option 1" }),
    ).toBeVisible();
    await expect(
      comparison.getByRole("heading", { name: "Option 2" }),
    ).toBeVisible();
    await expect(
      comparison.getByRole("link", {
        name: "Review or edit runway assumptions",
      }),
    ).toHaveAttribute("href", "/money/runway");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("selected goal reaches freeform Analyst and shows its current path", async ({
  page,
}) => {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const login = await client.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  expect(login.error).toBeNull();
  const goalId = randomUUID();
  const title = `Analyst goal ${Date.now()}`;
  const inserted = await client.from("goals").insert({
    id: goalId,
    user_id: login.data.user!.id,
    title,
    area: "personal",
  });
  expect(inserted.error).toBeNull();
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/analyst");
  const selector = page.getByLabel("Focus on a goal or debt");
  await selector.selectOption(`goal:${goalId}`);
  let submittedGoalId: string | undefined;
  await page.route("**/api/analyst/freeform", async (route) => {
    submittedGoalId = route.request().postDataJSON().goalId;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "fallback",
        message: "A linked task was completed in the selected period.",
        evidence: [
          {
            id: "goal.task",
            metric: "Linked task completion",
            value: 1,
            unit: "count",
            period: { from: "2026-09-01", through: "2026-09-25" },
            comparisonBasis: "Current Graph path to selected goal",
            source: { description: "Tasks", recordIds: [], href: "/tasks" },
            completeness: "complete",
            relationship: {
              source: { type: "task", id: goalId },
              target: { type: "goal", id: goalId },
              origin: "native",
            },
          },
        ],
        limitations: ["Historical goal progress is unavailable."],
      }),
    });
  });
  await page
    .getByRole("textbox", { name: "Ask about your ATLAS records" })
    .fill("What changed around this goal?");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Ask Analyst" }).click();
  await expect(page.getByText("Linked task completion")).toBeVisible();
  await expect(
    page.getByText("Current native path: task → goal"),
  ).toBeVisible();
  expect(submittedGoalId).toBe(goalId);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const removed = await client.from("goals").delete().eq("id", goalId);
  expect(removed.error).toBeNull();
});
