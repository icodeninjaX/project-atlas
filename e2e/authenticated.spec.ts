import { expect, test, type Page, type Locator } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function syncClick(page: Page, button: Locator) {
  const synced = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/offline-sync") &&
      response.request().method() === "POST",
  );
  await button.click();
  const response = await synced;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.results.length).toBeGreaterThan(0);
  for (const result of body.results) expect(result.success).toBe(true);
}

test.describe("authenticated ATLAS workflows", () => {
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
    await page.getByRole("button", { name: "Add account" }).click();
    await page.getByLabel("Account name").fill(`E2E Cash ${unique}`);
    await page.getByLabel("Opening balance in pesos").fill("2500.00");
    await syncClick(page, page.getByRole("button", { name: "Add account" }));
    await expect(page.getByText(`E2E Cash ${unique}`)).toBeVisible();
    await expect(page.getByText(/^Syncing \d/)).toHaveCount(0);

    await page.goto("/money/transactions");
    await page
      .getByRole("button", { name: "Record a transaction" })
      .and(page.locator("[aria-pressed]"))
      .click();
    await page.getByLabel("Amount in pesos").fill("125.50");
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Food" }).click();
    await page.getByRole("radio", { name: `E2E Cash ${unique}` }).check();
    await page.getByLabel("Merchant or source").fill(`E2E canteen ${unique}`);
    await syncClick(page, page.getByRole("button", { name: /Record expense/ }));
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByText(`E2E canteen ${unique}`)).toBeVisible();
  });

  test("adds a debt and records a payment", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/debts");
    await page.getByRole("button", { name: "Add debt" }).click();
    await page
      .locator("#debt-create-form")
      .getByLabel("Creditor name")
      .fill(`E2E debt ${unique}`);
    await page
      .locator("#debt-create-form")
      .getByLabel("Original balance in pesos")
      .fill("1000.00");
    await page
      .locator("#debt-create-form")
      .getByLabel("Minimum payment in pesos")
      .fill("100.00");
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
    await page.locator('button[aria-controls="quick-task-form"]').click();
    await page.getByLabel("Task title").fill(title);
    await syncClick(
      page,
      page
        .locator("#quick-task-form")
        .getByRole("button", { name: "Add task", exact: true }),
    );
    await expect(page.getByText(title)).toBeVisible();
    await syncClick(
      page,
      page.getByRole("button", { name: `Complete ${title}` }),
    );
    await page.goto("/tasks?view=completed");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("shows meaningful events in Timeline on a 320px phone", async ({
    page,
  }) => {
    const title = `E2E timeline task ${Date.now()}`;
    await page.goto("/tasks?view=inbox");
    await page.locator('button[aria-controls="quick-task-form"]').click();
    await page.getByLabel("Task title").fill(title);
    await syncClick(
      page,
      page
        .locator("#quick-task-form")
        .getByRole("button", { name: "Add task", exact: true }),
    );
    await syncClick(
      page,
      page.getByRole("button", { name: `Complete ${title}` }),
    );

    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/timeline?q=${encodeURIComponent(title)}`);
    await expect(
      page.getByRole("heading", { name: "Life timeline" }),
    ).toBeVisible();
    const completedEvent = page
      .getByRole("article")
      .filter({ hasText: title })
      .filter({ hasText: "Task completed" });
    await expect(
      completedEvent.getByRole("heading", { name: title }),
    ).toBeVisible();
    await expect(
      completedEvent.getByRole("link", { name: "Open source" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test("separates unfinished tasks from prior days into Overdue", async ({
    page,
  }) => {
    const title = `E2E overdue task ${Date.now()}`;
    const yesterday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() - 24 * 60 * 60 * 1000));

    await page.goto("/tasks?view=today");
    await page.locator('button[aria-controls="quick-task-form"]').click();
    await page.getByLabel("Task title").fill(title);
    await page.getByLabel("Scheduled date").fill(yesterday);
    await syncClick(
      page,
      page
        .locator("#quick-task-form")
        .getByRole("button", { name: "Add task", exact: true }),
    );

    await expect(page.getByText("Task added.")).toBeVisible();
    await expect(page.getByText(title)).toHaveCount(0);

    await page.goto("/tasks?view=overdue");
    await expect(page.getByText(title)).toBeVisible();
    const overdueDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).format(new Date(yesterday + "T00:00:00+08:00"));
    await expect(
      page
        .getByText(title, { exact: true })
        .locator("xpath=ancestor::section[1]")
        .getByText(`Overdue · ${overdueDate}`),
    ).toBeVisible();
  });

  test("schedules an exact time and opens Focus mode", async ({ page }) => {
    const title = `E2E focus task ${Date.now()}`;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    await page.goto("/tasks?view=today");
    await page.locator('button[aria-controls="quick-task-form"]').click();
    await page.getByLabel("Task title").fill(title);
    await page.getByLabel("Scheduled date").fill(today);
    await page.getByRole("button", { name: "Planning details" }).click();
    await page.getByLabel("Exact time").fill("09:30");
    await page.getByLabel("Estimated minutes").fill("25");
    await syncClick(
      page,
      page
        .locator("#quick-task-form")
        .getByRole("button", { name: "Add task", exact: true }),
    );

    await expect(page.getByText(title)).toBeVisible();
    await expect(
      page
        .getByText(title, { exact: true })
        .locator("xpath=ancestor::section[1]")
        .getByText(/at 9:30 AM/),
    ).toBeVisible();

    await page
      .getByRole("button", { name: `Open actions for ${title}` })
      .click();
    await page.getByRole("menuitem", { name: `Focus on ${title}` }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText("25:00");
    await expect(page.getByText("25-minute focus session")).toBeVisible();
  });

  test("adds a job application and saves a weekly review", async ({ page }) => {
    const company = `E2E Company ${Date.now()}`;
    await page.goto("/career");
    const createApplication = page.getByRole("button", {
      name: "Add application",
      exact: true,
    });
    await expect(createApplication).toHaveAttribute("aria-expanded", "false");
    await createApplication.click();
    await page.getByLabel("Company name").fill(company);
    await page.getByLabel("Role title").fill("Full-stack Developer");
    await page.getByRole("button", { name: "Add application" }).click();
    const applicationCard = page.getByRole("row").filter({ hasText: company });
    await expect(applicationCard).toBeVisible();
    await applicationCard
      .locator("xpath=following-sibling::tr[1]")
      .getByRole("button", { name: "Edit application" })
      .click();
    await page
      .getByLabel(`Edit ${company} role title`)
      .fill("Senior Developer");
    await page.getByLabel(`Edit ${company} notes`).fill("Updated from E2E.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(applicationCard.getByText("Senior Developer")).toBeVisible();

    await page.goto("/reviews");
    await page
      .getByRole("textbox", { name: "What went well?", exact: true })
      .fill("Completed the E2E workflow.");
    await page
      .getByRole("spinbutton", { name: "Energy", exact: true })
      .fill("7");
    await page
      .getByRole("spinbutton", { name: "Stress", exact: true })
      .fill("4");
    await page
      .getByRole("spinbutton", { name: "Overall", exact: true })
      .fill("7");
    await syncClick(page, page.getByRole("button", { name: "Submit review" }));
    await expect(page.getByText(/submitted/)).toBeVisible();
  });

  test("dashboard loads combined information", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /route|moves|day, mapped/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.locator("#main-content").getByText("Available balance"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your route through today" }),
    ).toBeVisible();
  });

  test("runway is usable on a 320px phone without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/money/runway");

    await expect(
      page.getByRole("heading", { name: "Personal runway" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Saved assumptions", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save assumptions" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test("mobile shell fits and exposes every destination", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/dashboard");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    await page.getByRole("button", { name: "More navigation" }).click();
    const sheet = page.getByRole("dialog", { name: "More destinations" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Career" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Reviews" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Settings" })).toBeVisible();
  });
});
