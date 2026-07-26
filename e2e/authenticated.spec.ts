import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("authenticated Atlas workflows", () => {
  test.skip(
    !email || !password,
    "Dedicated E2E Supabase credentials are required.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    if (page.url().includes("/onboarding")) {
      await page.getByRole("button", { name: "Complete setup" }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test("adds an account and records an expense", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/money/accounts");
    await page.getByLabel("Account name").fill(`E2E Cash ${unique}`);
    await page.getByLabel("Opening balance in pesos").fill("2500.00");
    await page.getByRole("button", { name: "Add account" }).click();
    await expect(page.getByText(`E2E Cash ${unique}`)).toBeVisible();

    await page.goto("/money/transactions");
    await page
      .getByLabel("Account")
      .selectOption({ label: `E2E Cash ${unique}` });
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Amount in pesos").fill("125.50");
    await page.getByLabel("Merchant or source").fill(`E2E canteen ${unique}`);
    await page.getByRole("button", { name: "Record transaction" }).click();
    await expect(page.getByText(`E2E canteen ${unique}`)).toBeVisible();
  });

  test("adds a debt and records a payment", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/debts");
    await page.getByLabel("Creditor name").fill(`E2E debt ${unique}`);
    await page.getByLabel("Original balance in pesos").fill("1000.00");
    await page.getByLabel("Minimum payment in pesos").fill("100.00");
    await page.getByRole("button", { name: "Add debt" }).click();
    await page
      .getByRole("link", { name: new RegExp(`E2E debt ${unique}`) })
      .click();
    await page.getByLabel("Payment amount in pesos").fill("250.00");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("₱750.00")).toBeVisible();
  });

  test("captures and completes a task", async ({ page }) => {
    const title = `E2E task ${Date.now()}`;
    await page.goto("/tasks?view=inbox");
    await page.getByLabel("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole("button", { name: `Complete ${title}` }).click();
    await page.goto("/tasks?view=completed");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("adds a job application and saves a weekly review", async ({ page }) => {
    const company = `E2E Company ${Date.now()}`;
    await page.goto("/career");
    await page.getByLabel("Company name").fill(company);
    await page.getByLabel("Role title").fill("Full-stack Developer");
    await page.getByRole("button", { name: "Add application" }).click();
    await expect(page.getByText(company)).toBeVisible();

    await page.goto("/reviews");
    await page
      .getByLabel("What went well?")
      .fill("Completed the E2E workflow.");
    await page.getByLabel("energy · 1–10").fill("7");
    await page.getByLabel("stress · 1–10").fill("4");
    await page.getByLabel("overall · 1–10").fill("7");
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByText(/submitted/)).toBeVisible();
  });

  test("dashboard loads combined information", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /route|moves/i }),
    ).toBeVisible();
    await expect(page.getByText("Available balance")).toBeVisible();
    await expect(page.getByText("Today’s priorities")).toBeVisible();
  });
});
