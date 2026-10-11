"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthAction, AuthState } from "@/lib/auth/actions";

const initialState: AuthState = { message: "", success: false };

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  includePassword = true,
  hiddenFields,
}: {
  action: AuthAction;
  submitLabel: string;
  /** What the button says while the action runs, e.g. "Logging in…". */
  pendingLabel: string;
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
          // React resets the form after each action; restoring the email
          // keeps a mistyped password from costing the address too.
          defaultValue={state.email}
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
          className={`text-sm leading-5 ${
            state.success ? "text-positive" : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      )}
      <Button
        className="w-full"
        type="submit"
        pending={pending}
        pendingLabel={pendingLabel}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
