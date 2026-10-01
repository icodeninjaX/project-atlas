import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  send: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: mocks.send },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/lib/notifications/server-config", () => ({
  getPushServerConfig: () => ({
    subject: "mailto:test@example.test",
    publicKey: "test",
    privateKey: "test",
  }),
}));
import { GET } from "@/app/api/cron/reminders/route";
import { POST } from "@/app/api/cron/task-reminders/route";

function query(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "gte",
    "lte",
    "not",
    "limit",
    "insert",
    "delete",
  ])
    chain[method] = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-24T01:01:00Z"));
  vi.stubEnv("CRON_SECRET", "test-cron");
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.send.mockResolvedValue({ statusCode: 201 });
  mocks.from.mockImplementation((table: string) =>
    query(
      {
        user_preferences: [
          {
            user_id: "owner-a",
            task_reminders: true,
            quiet_hours_start: "22:00",
            quiet_hours_end: "07:00",
          },
        ],
        push_subscriptions: [
          {
            id: "bad-local",
            user_id: "owner-a",
            endpoint: "https://127.0.0.1/private",
            p256dh: "key",
            auth: "auth",
          },
          {
            id: "bad-host",
            user_id: "owner-a",
            endpoint: "https://fcm.googleapis.com.attacker.invalid/private",
            p256dh: "key",
            auth: "auth",
          },
          {
            id: "valid",
            user_id: "owner-a",
            endpoint: "https://fcm.googleapis.com/fcm/send/token",
            p256dh: "key",
            auth: "auth",
          },
        ],
        tasks: [
          {
            id: "private-task-id",
            user_id: "owner-a",
            title: "Private task title",
            scheduled_for: "2026-08-24",
            scheduled_time: "09:00:00",
            estimated_minutes: 25,
          },
        ],
        debts: [],
        financial_accounts: [],
        profiles: [],
        weekly_reviews: [],
        notification_deliveries: [],
      }[table] ?? [],
    ),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe.each([
  ["daily", GET],
  ["task", POST],
] as const)("%s stored push delivery", (_name, handler) => {
  it("blocks stored SSRF destinations, delivers valid providers, and excludes private data", async () => {
    const response = await handler(
      new Request("https://atlas.example/api/cron/reminders", {
        method: _name === "daily" ? "GET" : "POST",
        headers: { authorization: "Bearer test-cron" },
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledOnce();
    const [subscription, body, options] = mocks.send.mock.calls[0]!;
    expect(subscription.endpoint).toBe(
      "https://fcm.googleapis.com/fcm/send/token",
    );
    expect(options.timeout).toBe(10_000);
    expect(body).not.toContain("Private task title");
    expect(body).not.toContain("private-task-id");
    expect(body).not.toContain("owner-a");
    expect(JSON.parse(body).body).toMatch(/^Open ATLAS to see/);
  });
});
