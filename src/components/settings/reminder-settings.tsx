"use client";

import { Bell, BellOff, Clock3 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  saveReminderPreferencesAction,
  type ReminderState,
} from "@/lib/settings/notification-actions";

const initialState: ReminderState = { success: false, message: "" };

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export type ReminderPreferences = {
  remindersEnabled: boolean;
  taskReminders: boolean;
  debtReminders: boolean;
  paydayReminders: boolean;
  reviewReminders: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function ReminderSettings({
  preferences,
  configured,
  publicKey,
}: {
  preferences: ReminderPreferences;
  configured: boolean;
  publicKey: string;
}) {
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [browserError, setBrowserError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setDeviceSubscribed(Boolean(subscription)))
      .catch(() => undefined);
  }, []);

  const action = async (state: ReminderState, formData: FormData) => {
    const enabling = formData.get("remindersEnabled") === "on";
    setBrowserError("");

    try {
      if (enabling) {
        if (
          !configured ||
          !("serviceWorker" in navigator) ||
          !("PushManager" in window)
        ) {
          return {
            success: false,
            message: "Push reminders are not configured for this deployment.",
          };
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return {
            success: false,
            message: "Allow notifications in your browser to enable reminders.",
          };
        }
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey(publicKey),
          }));
        const saved = await savePushSubscriptionAction(subscription.toJSON());
        if (!saved.success) return saved;
        setDeviceSubscribed(true);
      } else if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setDeviceSubscribed(false);
      }
    } catch {
      return {
        success: false,
        message:
          "This browser could not create a push subscription. Check notification permissions and retry.",
      };
    }

    return saveReminderPreferencesAction(state, formData);
  };

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            {preferences.remindersEnabled ? (
              <Bell className="text-primary size-4" />
            ) : (
              <BellOff className="text-muted-foreground size-4" />
            )}
            Daily ATLAS digest
          </p>
          <p className="text-muted-foreground mt-1 max-w-lg text-xs leading-5">
            One concise notification at 8:00 AM Asia/Manila. ATLAS skips it when
            there is nothing actionable or the send time is quiet.
          </p>
        </div>
        <label className="border-border bg-background flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium">
          <input
            type="checkbox"
            name="remindersEnabled"
            defaultChecked={preferences.remindersEnabled}
            disabled={!configured}
            className="accent-primary size-4"
          />
          Enable reminders
        </label>
      </div>

      {!configured && (
        <p className="border-border bg-muted text-muted-foreground rounded-xl border px-3 py-2.5 text-xs leading-5">
          Not configured. Add VAPID and cron secrets to this deployment to
          enable browser delivery.
        </p>
      )}

      <fieldset>
        <legend className="text-xs font-semibold tracking-wide uppercase">
          Include
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            [
              "taskReminders",
              "Tasks due or overdue",
              preferences.taskReminders,
            ],
            [
              "debtReminders",
              "Debt payments due soon",
              preferences.debtReminders,
            ],
            ["paydayReminders", "Payday", preferences.paydayReminders],
            ["reviewReminders", "Weekly review", preferences.reviewReminders],
          ].map(([name, label, checked]) => (
            <label
              key={String(name)}
              className="border-border bg-background flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"
            >
              <input
                type="checkbox"
                name={String(name)}
                defaultChecked={Boolean(checked)}
                className="accent-primary size-4"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-border border-t pt-5">
        <legend className="flex items-center gap-2 text-sm font-medium">
          <Clock3 className="text-muted-foreground size-4" />
          Quiet hours
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-muted-foreground text-xs">
            Starts
            <Input
              type="time"
              name="quietHoursStart"
              defaultValue={preferences.quietHoursStart.slice(0, 5)}
              required
              className="mt-1.5"
            />
          </label>
          <label className="text-muted-foreground text-xs">
            Ends
            <Input
              type="time"
              name="quietHoursEnd"
              defaultValue={preferences.quietHoursEnd.slice(0, 5)}
              required
              className="mt-1.5"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          This device: {deviceSubscribed ? "subscribed" : "not subscribed"}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save reminder settings"}
        </Button>
      </div>

      {(state.message || browserError) && (
        <p
          role="status"
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            state.success && !browserError
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {browserError || state.message}
        </p>
      )}
    </form>
  );
}
