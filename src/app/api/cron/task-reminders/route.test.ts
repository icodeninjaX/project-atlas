import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  setVapidDetails: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: vi.fn(),
  },
}));

vi.mock("@/lib/notifications/server-config", () => ({
  getPushServerConfig: () => ({
    subject: "mailto:test@example.com",
    publicKey: "public-key",
    privateKey: "private-key",
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));

import { POST } from "./route";

function resolvedQuery<T>(result: T) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (
      resolve: (value: T) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("task reminder cron route", () => {
  it("rejects requests without the private scheduler token", async () => {
    const response = await POST(
      new Request("https://atlas.example/api/cron/task-reminders", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("accepts the scheduler token without exposing it to browser roles", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.from.mockReturnValue(
      resolvedQuery({
        data: [],
        error: null,
      }),
    );

    const response = await POST(
      new Request("https://atlas.example/api/cron/task-reminders", {
        method: "POST",
        headers: { authorization: "Bearer private-scheduler-token" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      due: 0,
      sent: 0,
      skipped: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "validate_task_reminder_scheduler_secret",
      { p_secret: "private-scheduler-token" },
    );
    expect(mocks.setVapidDetails).toHaveBeenCalledOnce();
  });
});
