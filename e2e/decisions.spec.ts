import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = process.env.E2E_LOCAL_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const enabled = Boolean(
  localUrl?.startsWith("http://127.0.0.1:") && adminKey && publishableKey,
);

function manilaDay(offset: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test.describe("Decision journal local browser flow", () => {
  test.skip(!enabled, "A disposable local Supabase instance is required.");

  test("records, links, revises, and deletes a decision at desktop and 320px", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const admin = createClient(localUrl!, adminKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `phase19-${crypto.randomUUID()}@example.test`;
    const password = `Atlas-${crypto.randomUUID()}!`;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    const userId = created.user!.id;
    const owner = createClient(localUrl!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    try {
      expect(
        (await owner.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      const { data: goal, error: goalError } = await owner
        .from("goals")
        .insert({ user_id: userId, title: "Find a role", area: "career" })
        .select("id")
        .single();
      expect(goalError).toBeNull();
      const { data: task, error: taskError } = await owner
        .from("tasks")
        .insert({ user_id: userId, title: "Apply to roles", status: "inbox" })
        .select("id")
        .single();
      expect(taskError).toBeNull();
      const { data: application, error: applicationError } = await owner
        .from("job_applications")
        .insert({
          user_id: userId,
          company_name: "Phase 19 Acme",
          role_title: "Engineer",
        })
        .select("id")
        .single();
      expect(applicationError).toBeNull();

      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
      if (page.url().includes("/onboarding")) {
        await page.getByRole("button", { name: "Complete setup" }).click();
        await expect(page).toHaveURL(/\/dashboard/);
      }

      await page.goto("/decisions");
      await expect(
        page.getByRole("heading", { name: "Decision journal" }),
      ).toBeVisible();
      await page
        .getByRole("textbox", { name: "Decision", exact: true })
        .fill("Apply weekly");
      await page.getByLabel("Date decided").fill(manilaDay(-1));
      await page.getByLabel("Review on").fill(manilaDay(1));
      await page.getByLabel("What will you do?").fill("Apply each week");
      await page
        .getByLabel("What do you hope will happen?")
        .fill("Get interviews");
      await page.getByLabel("Related goal (optional)").selectOption(goal!.id);
      await page.getByLabel("Search task").fill("Apply to roles");
      await page.getByRole("button", { name: "Find", exact: true }).click();
      await page
        .getByRole("list", { name: "Matching records" })
        .getByRole("button", { name: /Apply to roles/ })
        .click();
      await page.getByRole("button", { name: "Record decision" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Decision recorded." }),
      ).toBeVisible();
      const { data: saved, error: saveError } = await owner
        .from("decisions")
        .select("id,goal_id,action_task_id")
        .eq("user_id", userId)
        .single();
      expect(saveError).toBeNull();
      expect(saved).toMatchObject({
        goal_id: goal!.id,
        action_task_id: task!.id,
      });
      await page.goto("/goals");
      await page
        .locator("[id^=goal-]")
        .filter({ hasText: "Find a role" })
        .getByRole("link", { name: /View relationships/ })
        .click();
      await expect(page.getByRole("link", { name: "Apply weekly" })).toBeVisible();
      await page.goto(`/decisions/${saved!.id}`);
      await expect(page.getByText("Action task: Apply to roles")).toBeVisible();
      await page
        .getByLabel("What did you observe?")
        .first()
        .fill("I applied to Acme");
      await page.getByLabel("Record type").selectOption("job_application");
      await page.getByLabel("Search records").fill("Phase 19 Acme");
      await page
        .getByRole("button", { name: "Find", exact: true })
        .first()
        .click();
      await page
        .getByRole("list", { name: "Matching records" })
        .getByRole("button", { name: /Phase 19 Acme/ })
        .click();
      await page.getByRole("button", { name: "Add observation" }).click();
      await expect(
        page.getByRole("link", { name: "Open supporting record" }),
      ).toHaveAttribute("href", `/career?highlight=${application!.id}`);

      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 800 });
        const heading = page.getByRole("heading", {
          name: "What the records show",
        });
        await expect(heading).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      }
      await page.getByLabel("What will you do?").fill("Apply selectively");
      await page
        .getByLabel("Assumptions or other factors (optional)")
        .fill("The job market may change");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(
        page.getByRole("heading", { name: "Earlier plans" }),
      ).toBeVisible();
      await expect(page.getByText("Apply each week")).toBeVisible();

      await page.goto("/timeline?module=decisions");
      await expect(page.getByText("Apply weekly").first()).toBeVisible();
      await page.goto(`/decisions/${saved!.id}`);
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Delete decision" }).click();
      await expect(page).toHaveURL(/\/decisions$/);
      const { count } = await owner
        .from("decisions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      expect(count).toBe(0);
    } finally {
      expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
    }
  });
});
