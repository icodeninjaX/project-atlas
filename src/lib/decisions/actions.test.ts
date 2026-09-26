import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteDecisionAction,
  saveDecisionAction,
  saveObservationAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const decisionId = "b1200000-0000-4000-8000-000000000001";
const ownerId = "b1000000-0000-4000-8000-000000000001";

function decisionForm() {
  const form = new FormData();
  form.set("title", "Study daily");
  form.set("decisionOn", "2026-09-01");
  form.set("intent", "Read one lesson");
  form.set("expectedOutcome", "Finish a project");
  form.set("reviewOn", "2026-10-01");
  return form;
}

beforeEach(() => vi.clearAllMocks());

describe("decision actions", () => {
  it("rejects invalid chronology before any database access", async () => {
    const form = decisionForm();
    form.set("reviewOn", "2026-08-31");
    const result = await saveDecisionAction(
      { success: false, message: "" },
      form,
    );
    expect(result.success).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("scopes edits to the signed-in owner and refuses a missing row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const ownerFilter = vi.fn().mockReturnValue({ select });
    const idFilter = vi.fn().mockReturnValue({ eq: ownerFilter });
    const update = vi.fn().mockReturnValue({ eq: idFilter });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: ownerId } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ update }),
    });
    const form = decisionForm();
    form.set("decisionId", decisionId);
    const result = await saveDecisionAction(
      { success: false, message: "" },
      form,
    );
    expect(result.success).toBe(false);
    expect(idFilter).toHaveBeenCalledWith("id", decisionId);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", ownerId);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not claim a foreign decision was deleted", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const ownerFilter = vi.fn().mockReturnValue({ select });
    const idFilter = vi.fn().mockReturnValue({ eq: ownerFilter });
    const remove = vi.fn().mockReturnValue({ eq: idFilter });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: ownerId } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ delete: remove }),
    });
    const form = new FormData();
    form.set("decisionId", decisionId);
    expect((await deleteDecisionAction(form)).success).toBe(false);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", ownerId);
  });

  it("refuses an observation on an unavailable decision", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const ownerFilter = vi.fn().mockReturnValue({ maybeSingle });
    const idFilter = vi.fn().mockReturnValue({ eq: ownerFilter });
    const select = vi.fn().mockReturnValue({ eq: idFilter });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: ownerId } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ select }),
    });
    const form = new FormData();
    form.set("decisionId", decisionId);
    form.set("observedOn", "2026-09-10");
    form.set("note", "Finished three lessons");
    const result = await saveObservationAction(
      { success: false, message: "" },
      form,
    );
    expect(result.success).toBe(false);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", ownerId);
  });
});
