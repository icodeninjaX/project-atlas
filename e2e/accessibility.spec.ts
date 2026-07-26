import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password"];

test.describe("public accessibility", () => {
  for (const route of publicRoutes) {
    test(`${route} has no detectable accessibility violations`, async ({
      page,
    }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
