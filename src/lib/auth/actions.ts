"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation/schemas";

export type AuthState = { message: string; success: boolean };
export type AuthAction = (
  state: AuthState,
  formData: FormData,
) => Promise<AuthState>;

const configurationError: AuthState = {
  success: false,
  message:
    "Authentication is not configured yet. Add the Supabase environment variables to continue.",
};

export async function signInAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = authSchema.safeParse(Object.fromEntries(formData));
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return configurationError;

  const { error } = await supabase.auth.signInWithPassword(values.data);
  if (error) {
    return { success: false, message: "Email or password is incorrect." };
  }

  const destination = safeRedirectPath(
    String(formData.get("next") ?? ""),
    "/dashboard",
  );
  redirect(destination as Route);
}

export async function signUpAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = authSchema.safeParse(Object.fromEntries(formData));
  if (!values.success) {
    return {
      success: false,
      message: values.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return configurationError;

  const { data, error } = await supabase.auth.signUp({
    ...values.data,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        success: false,
        message:
          "An account with this email may already exist. Try signing in instead.",
      };
    }

    if (error.code === "signup_disabled") {
      return {
        success: false,
        message: "New account creation is temporarily unavailable.",
      };
    }

    return {
      success: false,
      message: "We could not create your account right now. Try again shortly.",
    };
  }

  if (data.session) redirect("/onboarding");

  return {
    success: true,
    message:
      "Check your email to confirm your account, then return to sign in.",
  };
}

export async function forgotPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const result = authSchema.pick({ email: true }).safeParse({ email });
  if (!result.success) {
    return { success: false, message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  if (!supabase) return configurationError;

  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  });

  return {
    success: true,
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 8 || password.length > 72) {
    return {
      success: false,
      message: "Use a password between 8 and 72 characters.",
    };
  }
  if (password !== confirmation) {
    return { success: false, message: "The passwords do not match." };
  }
  const supabase = await createClient();
  if (!supabase) return configurationError;
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      success: false,
      message: "The reset link is invalid or expired. Request a new one.",
    };
  }
  return {
    success: true,
    message: "Password updated. You can continue to your dashboard.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
