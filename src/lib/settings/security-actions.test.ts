import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  deleteUser: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { changePasswordAction, deleteAccountAction } from "./security-actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "kai@example.com" } },
  });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
  });
  mocks.createAdminClient.mockReturnValue({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  });
});

describe("security settings actions", () => {
  it("reconfirms the current password before changing it", async () => {
    const formData = new FormData();
    formData.set("currentPassword", "old-password");
    formData.set("newPassword", "new-password-123");
    formData.set("confirmation", "new-password-123");

    await expect(
      changePasswordAction({ success: false, message: "" }, formData),
    ).resolves.toEqual({
      success: true,
      message: "Password changed successfully.",
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "kai@example.com",
      password: "old-password",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: "new-password-123",
    });
  });

  it("rejects deletion before server access when the phrase is wrong", async () => {
    const formData = new FormData();
    formData.set("currentPassword", "old-password");
    formData.set("confirmation", "DELETE");

    await expect(
      deleteAccountAction({ success: false, message: "" }, formData),
    ).resolves.toMatchObject({ success: false });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("deletes through the isolated admin client after reconfirmation", async () => {
    const formData = new FormData();
    formData.set("currentPassword", "old-password");
    formData.set("confirmation", "DELETE MY ATLAS");

    await expect(
      deleteAccountAction({ success: false, message: "" }, formData),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.redirect).toHaveBeenCalledWith("/login?account=deleted");
  });
});
