"use client";

import { KeyRound, Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  changeEmailAction,
  changePasswordAction,
  type SecurityState,
} from "@/lib/settings/security-actions";

const initialState: SecurityState = { success: false, message: "" };

function Feedback({ state }: { state: SecurityState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${
        state.success
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-destructive/25 bg-destructive/10 text-destructive"
      }`}
    >
      {state.message}
    </p>
  );
}

export function SecuritySettings({ currentEmail }: { currentEmail: string }) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    changeEmailAction,
    initialState,
  );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <details className="border-border bg-background rounded-xl border p-4">
        <summary className="focus-visible:ring-ring flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none">
          <KeyRound className="text-primary size-4" />
          Change password
        </summary>
        <form action={passwordAction} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="password-current" className="text-xs font-medium">
              Current password
            </label>
            <Input
              id="password-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password-new" className="text-xs font-medium">
              New password
            </label>
            <Input
              id="password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password-confirmation"
              className="text-xs font-medium"
            >
              Confirm new password
            </label>
            <Input
              id="password-confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>
          <Feedback state={passwordState} />
          <Button type="submit" size="sm" disabled={passwordPending}>
            {passwordPending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </details>

      <details className="border-border bg-background rounded-xl border p-4">
        <summary className="focus-visible:ring-ring flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none">
          <Mail className="text-primary size-4" />
          Change email
        </summary>
        <form action={emailAction} className="mt-4 space-y-3">
          <p className="text-muted-foreground text-xs leading-5">
            Current email: <span className="font-medium">{currentEmail}</span>
          </p>
          <div className="space-y-1.5">
            <label htmlFor="email-new" className="text-xs font-medium">
              New email
            </label>
            <Input
              id="email-new"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email-password" className="text-xs font-medium">
              Current password
            </label>
            <Input
              id="email-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Feedback state={emailState} />
          <Button type="submit" size="sm" disabled={emailPending}>
            {emailPending ? "Requesting…" : "Request email change"}
          </Button>
        </form>
      </details>
    </div>
  );
}
