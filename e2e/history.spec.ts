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
    // A disposable account has no records yet: each series says where its
    // records come from instead of drawing empty charts.
    await expect(page.getByText("Nothing recorded yet")).toBeVisible();
    await expect(page.getByText("No source records yet")).toHaveCount(6);
    await expect(
      page
        .getByRole("list", { name: "Where each series comes from" })
        .getByRole("link"),
    ).toHaveCount(6);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    // Any grain and lookback in the address still loads.
    await page.goto("/history?grain=day&months=12");
    await expect(page.getByText("Nothing recorded yet")).toBeVisible();
    await page.getByRole("link", { name: "Explore recorded patterns" }).click();
    await expect(page).toHaveURL(/\/history\/patterns/);
    await expect(page.getByRole("heading", { name: "Patterns" })).toBeVisible();
    await expect(
      page.getByText("No reliable pattern to show yet"),
    ).toBeVisible();
    await expect(
      page.getByText("Not enough history", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
