"use client";

import { Laptop, LogOut, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { SignOutButton } from "@/components/offline/sign-out-button";
import { Button } from "@/components/ui/button";
import { signOutOtherSessionsAction, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = { success: false, message: "" };

export function SessionControls() {
  const [state, action, pending] = useActionState(
    signOutOtherSessionsAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Laptop className="text-muted-foreground size-4" />
          This device
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          ATLAS checks for unsynced offline changes before ending this session.
        </p>
        <div className="border-border mt-3 rounded-xl border p-1">
          <SignOutButton showLabel />
        </div>
      </div>

      <div className="border-border border-t pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="text-muted-foreground size-4" />
          Other devices
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Revoke every other browser or device while keeping this one signed in.
        </p>
        <form action={action} className="mt-3">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="w-full"
            pending={pending}
            pendingLabel="Signing out…"
          >
            Log out other devices
          </Button>
        </form>
        {state.message && (
          <p
            role="status"
            className={`mt-2 text-xs ${
              state.success ? "text-primary" : "text-destructive"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>

      <div className="border-border border-t pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <LogOut className="text-muted-foreground size-4" />
          Every device
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          End this session and revoke refresh tokens everywhere else.
        </p>
        <div className="border-border mt-3 rounded-xl border p-1">
          <SignOutButton showLabel scope="global" />
        </div>
      </div>
    </div>
  );
}
