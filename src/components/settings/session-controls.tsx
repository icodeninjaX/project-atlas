"use client";

import { Laptop, LogOut, MonitorSmartphone } from "lucide-react";
import { useActionState } from "react";
import { SignOutButton } from "@/components/offline/sign-out-button";
import {
  FormFeedback,
  SettingRow,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { signOutOtherSessionsAction, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = { success: false, message: "" };

export function SessionControls() {
  const [state, action, pending] = useActionState(
    signOutOtherSessionsAction,
    initialState,
  );

  return (
    <div className="divide-border/70 divide-y">
      <SettingRow
        icon={Laptop}
        title="This device"
        detail="ATLAS checks for unsynced offline changes before ending this session."
        className="pb-5"
      >
        <div className="ring-border/80 bg-background/55 w-full rounded-xl p-0.5 ring-1 sm:w-56">
          <SignOutButton showLabel />
        </div>
      </SettingRow>

      <div className="py-5">
        <SettingRow
          icon={MonitorSmartphone}
          title="Other devices"
          detail="Revoke every other browser or device while keeping this one signed in."
        >
          <form action={action} className="w-full sm:w-56">
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
        </SettingRow>
        {state.message && (
          <FormFeedback success={state.success} className="mt-3">
            {state.message}
          </FormFeedback>
        )}
      </div>

      <SettingRow
        icon={LogOut}
        title="Every device"
        detail="End this session and revoke refresh tokens everywhere else."
        className="pt-5"
      >
        <div className="ring-border/80 bg-background/55 w-full rounded-xl p-0.5 ring-1 sm:w-56">
          <SignOutButton showLabel scope="global" />
        </div>
      </SettingRow>
    </div>
  );
}
