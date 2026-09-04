"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthAction } from "@/lib/auth/actions";

const initialState = { message: "", success: false };

export function AuthForm({
  action,
  submitLabel,
  includePassword = true,
  hiddenFields,
}: {
  action: AuthAction;
  submitLabel: string;
  includePassword?: boolean;
  hiddenFields?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      {includePassword && (
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              submitLabel === "Create account"
                ? "new-password"
                : "current-password"
            }
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </div>
      )}
      {state.message && (
        <p
          role="status"
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            state.success
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </p>
      )}
      <Button
        className="w-full"
        type="submit"
        pending={pending}
        pendingLabel={`${submitLabel}…`}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
