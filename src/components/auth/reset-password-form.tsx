"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/auth/actions";

const initial = { success: false, message: "" };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
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
          className="mt-1.5"
        />
      </div>
      <div>
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
          className="mt-1.5"
        />
      </div>
      {state.message && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${state.success ? "border-primary/25 bg-primary/10 text-primary" : "border-destructive/25 bg-destructive/10 text-destructive"}`}
        >
          {state.message}
        </p>
      )}
      {state.success ? (
        <Button asChild className="w-full">
          <Link href="/dashboard">Continue to dashboard</Link>
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
