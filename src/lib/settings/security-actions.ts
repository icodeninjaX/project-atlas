"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SecurityState = { success: boolean; message: string };

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters for your new password.")
      .max(72, "Keep your password under 72 characters."),
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "The new passwords do not match.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

const emailSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newEmail: z.string().trim().email("Enter a valid new email address."),
});

const deletionSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  confirmation: z.literal("DELETE MY ATLAS", {
    error: "Type DELETE MY ATLAS exactly to confirm.",
  }),
});

async function verifiedPasswordClient(currentPassword: string) {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: "Connect Supabase before changing account security.",
      supabase: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Your session expired. Log in again.", supabase: null };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (error) {
    return { error: "Your current password is incorrect.", supabase: null };
  }

  return { error: null, supabase };
}

export async function changePasswordAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const values = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your passwords.",
    };
  }

  const verified = await verifiedPasswordClient(values.data.currentPassword);
  if (!verified.supabase) {
    return { success: false, message: verified.error };
  }

  const { error } = await verified.supabase.auth.updateUser({
    password: values.data.newPassword,
  });
  if (error) {
    return {
      success: false,
      message: "Your password could not be changed. Try again.",
    };
  }

  return { success: true, message: "Password changed successfully." };
}

export async function changeEmailAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const values = emailSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newEmail: String(formData.get("newEmail") ?? ""),
  });
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your email.",
    };
  }

  const verified = await verifiedPasswordClient(values.data.currentPassword);
  if (!verified.supabase) {
    return { success: false, message: verified.error };
  }

  const { error } = await verified.supabase.auth.updateUser({
    email: values.data.newEmail,
  });
  if (error) {
    return {
      success: false,
      message: "Your email could not be changed. Try another address.",
    };
  }

  return {
    success: true,
    message:
      "Email change requested. Follow the confirmation links Supabase sends before the address changes.",
  };
}

export async function deleteAccountAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const values = deletionSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Confirm permanent deletion.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      success: false,
      message:
        "Account deletion is unavailable until the server service role is configured.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { success: false, message: "Your session expired. Log in again." };
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: values.data.currentPassword,
  });
  if (passwordError) {
    return { success: false, message: "Your current password is incorrect." };
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) {
    return {
      success: false,
      message: "Your account could not be deleted. Try again.",
    };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?account=deleted");
}
