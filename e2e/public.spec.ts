import { expect, test } from "@playwright/test";

test("public landing page explains Atlas and reaches authentication", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /See where you are/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start your Atlas" }),
  ).toHaveAttribute("href", "/signup");
  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Continue your route." }),
  ).toBeVisible();
});

test("health endpoint is non-cacheable and identifies the service", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("no-store");
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "project-atlas",
  });
});
