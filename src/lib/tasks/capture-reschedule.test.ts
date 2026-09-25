import { beforeEach, describe, expect, it, vi } from "vitest";
import { rescheduleTaskFromCaptureAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const taskId = "c2300000-0000-4000-8000-000000000001";
const version = "2026-09-25T00:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.maybeSingle = mocks.maybeSingle;
  mocks.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "owner-a" } } }) },
    from: (table: string) => (table === "tasks" ? chain : null),
  });
});

describe("Capture task rescheduling", () => {
  it("refuses a stale or deleted task without reporting success", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await rescheduleTaskFromCaptureAction(
      taskId,
      version,
      "2026-09-26",
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/changed or is no longer available/);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid calendar dates before reaching the database", async () => {
    const result = await rescheduleTaskFromCaptureAction(
      taskId,
      version,
      "2026-02-30",
    );
    expect(result.success).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns success only after the conditional owner and version update matches", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: taskId }, error: null });
    const result = await rescheduleTaskFromCaptureAction(
      taskId,
      version,
      "2026-09-26",
    );
    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/tasks");
  });
});
