import { expect, test } from "@playwright/test";

const productionServer =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes("start") === true;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Complete setup" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }
}

test("publishes valid mobile installation metadata", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBe("/manifest.webmanifest");

  const response = await request.get(manifestHref!);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest.name).toBe("Project Atlas");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/dashboard");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test("serves cached pages and the offline fallback from its service worker", async ({
  context,
  page,
}) => {
  test.skip(!productionServer, "Service workers are disabled during next dev.");

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          {
            once: true,
          },
        ),
      );
    }
  });
  await page.reload();
  await expect(page.locator("body")).not.toHaveText("");

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("body")).not.toHaveText("");

  await page.goto("/not-previously-cached", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "You’re offline" }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("queues a signed-in change offline and syncs it after reconnecting", async ({
  context,
  page,
}) => {
  test.skip(!productionServer, "Service workers are disabled during next dev.");
  test.skip(
    !email || !password,
    "Dedicated E2E Supabase credentials are required.",
  );

  await signIn(page);
  await page.goto("/tasks?view=inbox");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  const title = `Offline E2E task ${Date.now()}`;
  await context.setOffline(true);
  await page.getByLabel("Task title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText(/Saved offline/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/offline change synced/i)).toBeVisible({
    timeout: 15_000,
  });
  await page.reload();
  await expect(page.getByText(title)).toHaveCount(1);
});
