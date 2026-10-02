"use client";

import { ChevronDown, KeyRound, Mail, type LucideIcon } from "lucide-react";
import { useActionState } from "react";
import {
  FormFeedback,
  IconTile,
  fieldLabelClass,
} from "@/components/settings/settings-chrome";
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
  return <FormFeedback success={state.success}>{state.message}</FormFeedback>;
}

const detailsClass =
  "group bg-background/55 ring-border/80 open:ring-primary/30 open:bg-background/80 rounded-2xl ring-1 transition-colors";

function Summary({
  icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <summary className="focus-visible:ring-ring flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl p-3 focus-visible:ring-2 focus-visible:outline-none sm:p-3.5 [&::-webkit-details-marker]:hidden">
      <IconTile icon={icon} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {detail}
        </span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      />
    </summary>
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
    <div className="grid items-start gap-2.5 xl:grid-cols-2">
      <details className={detailsClass}>
        <Summary
          icon={KeyRound}
          title="Change password"
          detail="8 to 72 characters"
        />
        <form
          action={passwordAction}
          className="border-border/70 space-y-3 border-t p-3 pt-4 sm:p-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="password-current" className={fieldLabelClass}>
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
            <label htmlFor="password-new" className={fieldLabelClass}>
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
            <label htmlFor="password-confirmation" className={fieldLabelClass}>
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
          <Button
            type="submit"
            size="sm"
            pending={passwordPending}
            pendingLabel="Changing…"
          >
            Change password
          </Button>
        </form>
      </details>

      <details className={detailsClass}>
        <Summary icon={Mail} title="Change email" detail={currentEmail} />
        <form
          action={emailAction}
          className="border-border/70 space-y-3 border-t p-3 pt-4 sm:p-4"
        >
          <p className="text-muted-foreground text-xs leading-5">
            Current email: <span className="font-medium">{currentEmail}</span>
          </p>
          <div className="space-y-1.5">
            <label htmlFor="email-new" className={fieldLabelClass}>
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
            <label htmlFor="email-password" className={fieldLabelClass}>
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
          <Button
            type="submit"
            size="sm"
            pending={emailPending}
            pendingLabel="Requesting…"
          >
            Request email change
          </Button>
        </form>
      </details>
    </div>
  );
}
