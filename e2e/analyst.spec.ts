import { expect, test } from "@playwright/test";

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
  test(`Analyst shows consent, evidence, and record links at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/analyst");
    await expect(
      page.getByRole("heading", { name: "ATLAS Analyst" }),
    ).toBeVisible();
    await expect(page.getByLabel("AI model").locator("option")).toHaveCount(9);
    await expect(page.getByRole("option", { name: "GPT-6 Astra" })).toHaveCount(
      1,
    );
    const analyze = page.getByRole("button", { name: "Analyze" });
    await expect(analyze).toBeDisabled();
    await page.getByRole("checkbox").nth(1).check();
    await expect(analyze).toBeEnabled();
    await page.route("**/api/analyst", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          evidence: {
            type: "spending_change",
            status: "ready",
            note: "Recorded expenses only.",
            evidence: [
              {
                id: "spending.current",
                metric: "Recorded spending this month",
                value: 12345,
                unit: "centavos",
                period: { from: "2026-09-01", through: "2026-09-24" },
                comparisonBasis: "Days 1–24 of each month",
                source: {
                  description: "Expense transactions",
                  recordIds: ["a"],
                  href: "/money/transactions",
                },
                completeness: "complete",
              },
            ],
          },
          explanation: "Recorded spending increased.",
          uncertainty: "Recorded expenses only.",
          providerStatus: "success",
        }),
      }),
    );
    await analyze.click();
    await expect(page.getByText("₱123.45")).toBeVisible();
    await expect(
      page.getByText("2026-09-01 to 2026-09-24 · complete"),
    ).toBeVisible();
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

for (const width of [390, 1280]) {
  test(`Freeform Analyst keeps citations and sources usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/analyst");
    const ask = page.getByRole("button", { name: "Ask Analyst" });
    await expect(ask).toBeDisabled();
    await page
      .getByRole("textbox", { name: "Ask your own question" })
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
