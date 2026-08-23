import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import {
  signOutAction,
  signOutEverywhereAction,
  signOutOtherSessionsAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({ auth: { signOut: mocks.signOut } });
});

describe("session actions", () => {
  it("logs out only the current session from the standard control", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("revokes other sessions without ending the current one", async () => {
    await expect(
      signOutOtherSessionsAction({ success: false, message: "" }),
    ).resolves.toMatchObject({ success: true });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses global scope for the explicit everywhere control", async () => {
    await expect(signOutEverywhereAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
});
