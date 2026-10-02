"use client";

import {
  Bell,
  BellOff,
  CalendarCheck,
  Clock3,
  HandCoins,
  ListChecks,
  Moon,
  Smartphone,
  Sunrise,
  WalletCards,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import {
  FormFeedback,
  SettingsGroup,
  StatusChip,
  SwitchField,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
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

  const kinds = [
    {
      name: "taskReminders",
      label: "Tasks at their scheduled time",
      icon: ListChecks,
      checked: preferences.taskReminders,
    },
    {
      name: "debtReminders",
      label: "Debt payments due soon",
      icon: HandCoins,
      checked: preferences.debtReminders,
    },
    {
      name: "paydayReminders",
      label: "Payday",
      icon: WalletCards,
      checked: preferences.paydayReminders,
    },
    {
      name: "reviewReminders",
      label: "Weekly review",
      icon: CalendarCheck,
      checked: preferences.reviewReminders,
    },
  ];

  return (
    <form action={formAction} className="space-y-7">
      <div className="bg-background/55 ring-border/80 relative overflow-hidden rounded-2xl p-4 ring-1 sm:p-5">
        <div
          aria-hidden="true"
          className="bg-primary/15 pointer-events-none absolute -top-16 -right-10 size-44 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className={
                preferences.remindersEnabled
                  ? "bg-primary-solid text-primary-solid-foreground grid size-10 shrink-0 place-items-center rounded-2xl shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--primary-solid)_80%,transparent)]"
                  : "bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-2xl"
              }
            >
              {preferences.remindersEnabled ? (
                <Bell className="size-4" />
              ) : (
                <BellOff className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                ATLAS phone notifications
                <StatusChip
                  tone={preferences.remindersEnabled ? "positive" : "neutral"}
                >
                  {preferences.remindersEnabled ? "On" : "Off"}
                </StatusChip>
              </p>
              <p className="text-muted-foreground mt-1 max-w-lg text-xs leading-5">
                Scheduled tasks arrive at their exact time, plus one concise
                daily digest at 8:00 AM Asia/Manila. ATLAS stays quiet during
                your quiet hours.
              </p>
            </div>
          </div>
          <SwitchField
            name="remindersEnabled"
            label="Enable reminders"
            defaultChecked={preferences.remindersEnabled}
            disabled={!configured}
            className="bg-card/70 sm:min-w-52"
          />
        </div>
        <p className="text-muted-foreground relative mt-4 flex items-center gap-2 text-[11px]">
          <Smartphone aria-hidden="true" className="size-3.5" />
          This device: {deviceSubscribed ? "subscribed" : "not subscribed"}
        </p>
      </div>

      {!configured && (
        <p className="bg-muted/60 ring-border/80 text-muted-foreground rounded-xl px-3 py-2.5 text-xs leading-5 ring-1">
          Not configured. Add VAPID and cron secrets to this deployment to
          enable browser delivery.
        </p>
      )}

      <fieldset className="min-w-0">
        <legend className="sr-only">Include</legend>
        <SettingsGroup title="Include" titleIsLegend>
          <div className="grid gap-2 sm:grid-cols-2">
            {kinds.map(({ name, label, icon: Icon, checked }) => (
              <SwitchField
                key={name}
                name={name}
                defaultChecked={checked}
                label={
                  <span className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="text-muted-foreground size-4 shrink-0"
                    />
                    {label}
                  </span>
                }
              />
            ))}
          </div>
        </SettingsGroup>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Quiet hours</legend>
        <SettingsGroup title="Quiet hours" icon={Clock3} titleIsLegend>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="bg-background/55 ring-border/80 focus-within:ring-ring block rounded-2xl p-3 ring-1 focus-within:ring-2 sm:p-3.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
                <Moon aria-hidden="true" className="size-3.5" />
                Starts
              </span>
              <input
                type="time"
                name="quietHoursStart"
                defaultValue={preferences.quietHoursStart.slice(0, 5)}
                required
                className="mt-1 w-full bg-transparent font-mono text-xl font-semibold tabular-nums outline-none sm:text-2xl"
              />
            </label>
            <label className="bg-background/55 ring-border/80 focus-within:ring-ring block rounded-2xl p-3 ring-1 focus-within:ring-2 sm:p-3.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
                <Sunrise aria-hidden="true" className="size-3.5" />
                Ends
              </span>
              <input
                type="time"
                name="quietHoursEnd"
                defaultValue={preferences.quietHoursEnd.slice(0, 5)}
                required
                className="mt-1 w-full bg-transparent font-mono text-xl font-semibold tabular-nums outline-none sm:text-2xl"
              />
            </label>
          </div>
        </SettingsGroup>
      </fieldset>

      <div className="border-border/70 -mx-4 -mb-4 flex flex-col gap-3 border-t px-4 pt-4 pb-4 min-[360px]:-mx-5 min-[360px]:-mb-5 min-[360px]:px-5 min-[360px]:pb-5 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-6">
        <div className="min-w-0 flex-1">
          {state.message || browserError ? (
            <FormFeedback success={state.success && !browserError}>
              {browserError || state.message}
            </FormFeedback>
          ) : (
            <p className="text-muted-foreground text-xs leading-5">
              Reminders follow your quiet hours on every device.
            </p>
          )}
        </div>
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          Save reminder settings
        </Button>
      </div>
    </form>
  );
}
