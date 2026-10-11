"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/auth/actions";

const initial = { success: false, message: "" };

export function ResetPasswordForm({
  destination = null,
}: {
  /** Where the user was headed before recovering their password. */
  destination?: string | null;
}) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmation" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </div>
      {state.message && (
        <p
          role="status"
          className={`text-sm leading-5 ${state.success ? "text-positive" : "text-destructive"}`}
        >
          {state.message}
        </p>
      )}
      {state.success ? (
        <Button asChild className="w-full">
          <Link href={(destination ?? "/dashboard") as Route}>
            {destination ? "Continue" : "Continue to dashboard"}
          </Link>
        </Button>
      ) : (
        <Button
          type="submit"
          className="w-full"
          pending={pending}
          pendingLabel="Updating…"
        >
          Update password
        </Button>
      )}
    </form>
  );
}
