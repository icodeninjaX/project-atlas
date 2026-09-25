import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, "A disposable local E2E account is required.");

test("recorded history remains readable at phone and desktop widths", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Skip optional details" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "Recorded history" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(6);
    await expect(page.getByText("No source records yet")).toHaveCount(6);
    await page
      .locator("#main-content")
      .getByLabel("Group by")
      .selectOption("week");
    await page
      .locator("#main-content")
      .getByLabel("Lookback")
      .selectOption("3");
    await page.getByRole("button", { name: "Update view" }).click();
    await expect(page).toHaveURL(/grain=week.*months=3/);
    await expect(page.getByRole("table")).toHaveCount(6);
    await page
      .locator("#main-content")
      .getByLabel("Group by")
      .selectOption("day");
    await expect(
      page.locator("#main-content").getByLabel("Lookback").locator("option"),
    ).toHaveText(["30 days"]);
    await page.getByRole("button", { name: "Update view" }).click();
    await expect(page).toHaveURL(/grain=day.*months=1/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.getByRole("link", { name: "Explore recorded patterns" }).click();
    await expect(page).toHaveURL(/\/history\/patterns/);
    await expect(page.getByRole("heading", { name: "Patterns" })).toBeVisible();
    await expect(
      page.getByText("No reliable pattern to show yet"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
