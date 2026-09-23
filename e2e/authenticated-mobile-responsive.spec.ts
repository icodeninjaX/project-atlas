import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const phoneViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Complete setup" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `document width mismatch: ${JSON.stringify(dimensions)}`,
  ).toBe(dimensions.clientWidth);
  expect(
    dimensions.bodyScrollWidth,
    `body width mismatch: ${JSON.stringify(dimensions)}`,
  ).toBe(dimensions.bodyClientWidth);
}

test.describe("authenticated mobile responsive hardening", () => {
  test.skip(
    !email || !password,
    "Dedicated E2E Supabase credentials are required.",
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard remains stable at every required phone width", async ({
    page,
  }) => {
    for (const viewport of phoneViewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: /route|mapped/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Primary navigation" }).last(),
      ).toBeVisible();
      await expect(page.getByText("Available balance")).toBeVisible();
      await expectNoDocumentOverflow(page);

      const rects = await page.evaluate(() => {
        const section = (id: string) => {
          const element = document.querySelector<HTMLElement>(
            `section[aria-labelledby="${id}"]`,
          );
          const rect = element?.getBoundingClientRect();
          return rect ? { top: rect.top, bottom: rect.bottom } : null;
        };
        return {
          dayline: section("dayline-title"),
          situation: section("situation-title"),
          financial: section("financial-snapshot"),
          signals: section("dashboard-signals"),
          review: section("week-position"),
        };
      });

      expect(rects.dayline!.bottom).toBeLessThanOrEqual(rects.situation!.top);
      expect(rects.situation!.bottom).toBeLessThanOrEqual(rects.financial!.top);
      expect(rects.financial!.bottom).toBeLessThanOrEqual(rects.signals!.top);
      expect(rects.signals!.bottom).toBeLessThanOrEqual(rects.review!.top);
    }
  });

  test("Money, Tasks, and Signals fit at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of ["/money/accounts", "/tasks", "/signals"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });

  test("More destinations stay inside the short phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "More navigation" }).click();
    const sheet = page.getByRole("dialog", { name: "More destinations" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Settings" })).toBeVisible();

    const rect = await sheet.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
      };
    });
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(320);
    expect(rect.bottom).toBeLessThanOrEqual(568);
  });

  test("key mobile flows tolerate 200 percent text sizing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of [
      "/dashboard",
      "/money/accounts",
      "/tasks",
      "/signals",
    ]) {
      await page.goto(route);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await expect(page.locator("h1")).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });

  test("desktop and tablet shells remain intact", async ({ page }) => {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard");
      await expect(page.locator("h1")).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });
});
