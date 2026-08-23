import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password"];

test.describe("mobile responsive layout", () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const route of publicRoutes) {
    test(`${route} fits a narrow phone viewport`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
    });
  }
});
