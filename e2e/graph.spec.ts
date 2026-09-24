import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("ATLAS Graph", () => {
  test.skip(!email || !password, "Dedicated E2E credentials are required.");

  test("links knowledge and a native task from a goal at phone and desktop widths", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const unique = Date.now();
    const goalTitle = `Graph goal with a long readable title ${unique}`;
    const conceptTitle = `Graph concept ${unique}`;
    const taskTitle = `Graph task ${unique}`;
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    if (page.url().includes("/onboarding")) {
      await page.getByRole("button", { name: "Complete setup" }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    await page.goto("/goals");
    await page.getByRole("button", { name: "Create goal" }).click();
    await page.getByLabel("Goal title").fill(goalTitle);
    await page.getByRole("button", { name: "Create goal" }).last().click();
    await expect(page.getByText(goalTitle)).toBeVisible();

    await page.goto("/knowledge");
    await page.getByRole("button", { name: "Add concept" }).click();
    await page.getByLabel("Concept title").fill(conceptTitle);
    await page.locator('form input[name="category"]').fill("Technology");
    await page.getByLabel("Learning notes").fill("One-hop Graph verification.");
    await page.getByRole("button", { name: "Save concept" }).click();
    await expect(page.getByText(conceptTitle).first()).toBeVisible();

    await page.goto("/tasks?view=inbox");
    await page.getByRole("button", { name: "Add task" }).first().click();
    await page.getByLabel("Task title").fill(taskTitle);
    await page
      .locator("#quick-task-form")
      .getByRole("button", { name: "Add task" })
      .click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/goals");
    await page
      .locator("[id^=goal-]")
      .filter({ hasText: goalTitle })
      .getByRole("link", { name: /View relationships/ })
      .click();
    await expect(page.getByText("Nothing connected yet.")).toBeVisible();
    await page.getByRole("button", { name: "Add related item" }).click();
    await page.getByLabel("Search knowledge").fill(conceptTitle);
    await page.getByRole("button", { name: "Search related items" }).click();
    await page.getByRole("button", { name: conceptTitle }).click();
    await page.getByRole("button", { name: "Link item" }).click();
    await expect(page.getByRole("link", { name: conceptTitle })).toBeVisible();
    await page.getByRole("button", { name: "Add related item" }).click();
    await page.getByLabel("Item type").selectOption({ label: "Tasks" });
    await page.getByLabel("Search tasks").fill(taskTitle);
    await page.getByRole("button", { name: "Search related items" }).click();
    await page.getByRole("button", { name: new RegExp(taskTitle) }).click();
    await page.getByRole("button", { name: "Link item" }).click();
    await expect(page.getByRole("link", { name: taskTitle })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole("heading", { name: goalTitle })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(1280);
    await page.getByRole("button", { name: "Unlink from goal" }).click();
    await page.getByRole("button", { name: "Confirm unlink" }).click();
    await expect(page.getByRole("link", { name: taskTitle })).toHaveCount(0);
    await page.getByRole("button", { name: "Remove relationship" }).click();
    await page.getByRole("button", { name: "Confirm removal" }).click();
    await expect(page.getByText("Nothing connected yet.")).toBeVisible();
  });
});
