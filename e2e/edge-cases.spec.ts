import { expect, test } from "@playwright/test";

test.describe("production-safe edge cases", () => {
  test("protected deep links redirect to login and preserve the destination", async ({
    page,
  }) => {
    await page.goto("/tasks?view=completed&highlight=missing");

    await expect(page).toHaveURL(
      /\/login\?next=%2Ftasks%3Fview%3Dcompleted%26highlight%3Dmissing$/,
    );
    await expect(
      page.getByRole("heading", { name: "Continue your route." }),
    ).toBeVisible();
    await expect(page.locator('input[name="next"]')).toHaveValue(
      "/tasks?view=completed&highlight=missing",
    );
  });

  test("protected exports reject anonymous requests", async ({ request }) => {
    const response = await request.get("/api/export/csv");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  test("unknown API routes retain their not-found status", async ({
    request,
  }) => {
    const response = await request.get("/api/this-route-does-not-exist");

    expect(response.status()).toBe(404);
  });

  test("login rejects external redirect destinations", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fexample.com%2Fphishing");
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");

    await page.goto("/login?next=%2F%2Fexample.com%2Fphishing");
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
  });

  test("login uses native validation for malformed input", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/login$/);
    const validationMessage = await page
      .getByLabel("Email")
      .evaluate((input: HTMLInputElement) => input.validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });

  test("login failure does not reveal whether an account exists", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.invalid");
    await page.getByLabel("Password").fill("not-a-real-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("status")).toHaveText(
      "Email or password is incorrect.",
    );
  });

  test("a reset page without an auth session fails safely", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await page
      .getByLabel("New password", { exact: true })
      .fill("valid-password-123");
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill("valid-password-123");
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page.getByRole("status")).toHaveText(
      "The reset link is invalid or expired. Request a new one.",
    );
  });

  test("unknown routes render a useful not-found state", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "That place is not on this map." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to Today" }),
    ).toBeVisible();
  });
});
