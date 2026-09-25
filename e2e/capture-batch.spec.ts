import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.E2E_LOCAL_SERVICE_ROLE_KEY ?? "";
test.skip(
  process.env.ATLAS_CAPTURE_BATCH_BROWSER !== "1" ||
    !localUrl.startsWith("http://127.0.0.1:") ||
    !serviceKey ||
    !process.env.OPENAI_API_KEY,
  "A disposable local Supabase account and live Capture model are required.",
);

const email = `capture-batch-${randomUUID()}@example.test`;
const password = `${randomUUID()}aA!`;
const admin = createClient(
  localUrl || "http://127.0.0.1:54321",
  serviceKey || "placeholder",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
let userId: string | undefined;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw error ?? new Error("Could not create test user.");
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("reviews and confirms two actions at desktop and narrow mobile widths", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Skip optional details" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto("/capture");
  await page
    .getByLabel("What happened?")
    .fill(
      "Add a task to call Acme tomorrow. Add a task to review my portfolio tomorrow.",
    );
  await page.getByRole("button", { name: "Preview actions" }).click();
  await expect(
    page.getByRole("heading", { name: "Review all 2 proposals" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm this action" }),
  ).toHaveCount(2);
  await page.setViewportSize({ width: 320, height: 750 });
  await expect(
    page.getByRole("heading", { name: "Review all 2 proposals" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Confirm all 2 remaining" }).focus();
  await expect(
    page.getByRole("button", { name: "Confirm all 2 remaining" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("2 reviewed actions saved.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Saved: Task added\./)).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.goto("/capture");
  await page.getByLabel("What happened?").fill("Move call Acme to today");
  await page.getByRole("button", { name: "Preview actions" }).click();
  await expect(page.getByText("1. Move task")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Task" })).not.toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Confirm this action" }).click();
  await expect(page.getByText(/Saved: Task rescheduled\./)).toBeVisible();
});

test("corrects and saves a mixed expense and task batch", async ({ page }) => {
  test.setTimeout(90_000);
  const owner = createClient(
    localUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "placeholder",
  );
  const { error: signInError } = await owner.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  const { data: account, error: accountError } = await owner
    .from("financial_accounts")
    .insert({
      user_id: userId,
      name: "GCash",
      account_type: "e_wallet",
      opening_balance_centavos: 100000,
    })
    .select("id")
    .single();
  if (accountError || !account)
    throw accountError ?? new Error("Could not create account.");
  const { data: existingCategory, error: categoryError } = await owner
    .from("transaction_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Food")
    .eq("category_type", "expense")
    .maybeSingle();
  if (categoryError) throw categoryError;
  let category = existingCategory;
  if (!category) {
    const created = await owner
      .from("transaction_categories")
      .insert({ user_id: userId, name: "Food", category_type: "expense" })
      .select("id")
      .single();
    if (created.error || !created.data)
      throw created.error ?? new Error("Could not create category.");
    category = created.data;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  await page.goto("/capture");
  await page
    .getByLabel("What happened?")
    .fill(
      "Spent ₱380 on groceries using GCash today. Add a task to buy detergent tomorrow.",
    );
  await page.getByRole("button", { name: "Preview actions" }).click();
  await expect(
    page.getByRole("heading", { name: "Review all 2 proposals" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Account" })).toHaveValue(
    account.id,
  );
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption(category.id);
  await expect(
    page.getByRole("textbox", { name: "Amount in PHP" }),
  ).toHaveValue("380.00");
  await page.getByRole("button", { name: "Confirm all 2 remaining" }).click();
  await expect(page.getByText("2 reviewed actions saved.")).toBeVisible({
    timeout: 30_000,
  });
  const { data: transaction, error: transactionError } = await owner
    .from("transactions")
    .select("amount_centavos")
    .eq("user_id", userId)
    .eq("account_id", account.id)
    .maybeSingle();
  if (transactionError) throw transactionError;
  expect(transaction?.amount_centavos).toBe(38000);
});
