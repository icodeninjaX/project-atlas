import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = process.env.E2E_LOCAL_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const enabled = Boolean(
  localUrl?.startsWith("http://127.0.0.1:") && adminKey && publishableKey,
);

test.describe("Next Best Action local browser flow", () => {
  test.skip(!enabled, "A disposable local Supabase instance is required.");

  test("reviews a follow-up at desktop and mobile widths before creating one task", async ({
    page,
  }) => {
    const admin = createClient(localUrl!, adminKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `phase16-${crypto.randomUUID()}@example.test`;
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
      const { error: signInError } = await owner.auth.signInWithPassword({
        email,
        password,
      });
      expect(signInError).toBeNull();
      const { data: application, error: applicationError } = await owner
        .from("job_applications")
        .insert({
          user_id: userId,
          company_name: "Phase 16 Acme",
          role_title: "Engineer",
          stage: "applied",
          next_action: "Check the application update",
          next_action_at: new Date(Date.now() - 86_400_000).toISOString(),
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

      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 800 });
        const card = page.getByRole("heading", {
          name: "A follow-up worth reviewing",
        });
        await expect(card).toBeVisible();
        await expect(
          page.getByRole("link", { name: "View Phase 16 Acme application" }),
        ).toHaveAttribute("href", `/career?highlight=${application!.id}`);
        const bounds = await card.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      }

      await page.getByRole("button", { name: "Review task proposal" }).click();
      await expect(page.getByText("No message will be sent.")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      const before = await owner
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source_module", "next_best_action");
      expect(before.count).toBe(0);

      await page.getByRole("button", { name: "Review task proposal" }).click();
      await page
        .getByRole("button", { name: "Confirm and create task" })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Follow-up task created.",
      );
      const after = await owner
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source_module", "next_best_action");
      expect(after.count).toBe(1);
    } finally {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      expect(deleteError).toBeNull();
    }
  });
});
