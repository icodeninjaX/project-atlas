import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApplicationAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const applicationId = "60000000-0000-4000-8000-000000000001";
const ownerId = "b1000000-0000-4000-8000-000000000001";

function deletingClient(row: { id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const ownerFilter = vi.fn().mockReturnValue({ select });
  const idFilter = vi.fn().mockReturnValue({ eq: ownerFilter });
  const remove = vi.fn().mockReturnValue({ eq: idFilter });
  const from = vi.fn().mockReturnValue({ delete: remove });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: ownerId } }, error: null }),
    },
    from,
  });
  return { from, idFilter, ownerFilter };
}

beforeEach(() => vi.clearAllMocks());

describe("deleteApplicationAction", () => {
  it("rejects a malformed id before any database access", async () => {
    const result = await deleteApplicationAction("not-an-id");
    expect(result.success).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("deletes only the signed-in owner's application", async () => {
    const { from, idFilter, ownerFilter } = deletingClient({
      id: applicationId,
    });
    const result = await deleteApplicationAction(applicationId);
    expect(result).toEqual({ success: true, message: "Application deleted." });
    expect(from).toHaveBeenCalledWith("job_applications");
    expect(idFilter).toHaveBeenCalledWith("id", applicationId);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", ownerId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/career");
  });

  it("does not claim a foreign or missing application was deleted", async () => {
    deletingClient(null);
    const result = await deleteApplicationAction(applicationId);
    expect(result.success).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
