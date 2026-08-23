"use client";

import { CircleCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettingsAction, type SettingsState } from "@/lib/settings/actions";

const initialState: SettingsState = { success: false, message: "" };

const strategies = [
  {
    value: "avalanche",
    label: "Avalanche",
    description: "Highest interest rate first",
  },
  {
    value: "snowball",
    label: "Snowball",
    description: "Smallest remaining balance first",
  },
  {
    value: "priority",
    label: "My priority",
    description: "Use your manual debt order",
  },
] as const;

export function SettingsPreferencesForm({
  displayName,
  debtStrategy,
  homeRoute,
  defaultTaskPriority,
  defaultTaskEstimatedMinutes,
  defaultAccountId,
  accounts,
}: {
  displayName: string;
  debtStrategy: string;
  homeRoute: string;
  defaultTaskPriority: string;
  defaultTaskEstimatedMinutes: number | null;
  defaultAccountId: string | null;
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    saveSettingsAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="display-name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="display-name"
          name="displayName"
          defaultValue={displayName}
          maxLength={80}
          autoComplete="name"
          placeholder="What should Atlas call you?"
          aria-describedby="display-name-help"
        />
        <p id="display-name-help" className="text-muted-foreground text-xs">
          Shown in the app header. Your email remains unchanged.
        </p>
      </div>

      <fieldset aria-describedby="debt-strategy-help">
        <legend className="text-sm font-medium">
          Default debt payoff plan
        </legend>
        <p
          id="debt-strategy-help"
          className="text-muted-foreground mt-1 text-xs leading-5"
        >
          This becomes the starting view on Debts. You can still compare every
          plan there.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {strategies.map((strategy) => (
            <label
              key={strategy.value}
              className="border-border bg-background hover:border-primary/60 has-[:checked]:border-primary has-[:checked]:bg-primary/10 relative flex min-h-24 cursor-pointer flex-col rounded-xl border p-3 pr-9 transition-colors"
            >
              <input
                type="radio"
                name="debtStrategy"
                value={strategy.value}
                defaultChecked={strategy.value === debtStrategy}
                className="peer sr-only"
              />
              <span className="text-sm font-semibold">{strategy.label}</span>
              <span className="text-muted-foreground mt-1 text-xs leading-5">
                {strategy.description}
              </span>
              <CircleCheck className="text-primary absolute top-3 right-3 size-4 opacity-0 peer-checked:opacity-100" />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-border border-t pt-5">
        <legend className="text-sm font-medium">Everyday defaults</legend>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Choose where Atlas opens and prefill the fields you use most often.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="home-route" className="text-xs font-medium">
              Start page after login
            </label>
            <select
              id="home-route"
              name="homeRoute"
              defaultValue={homeRoute}
              className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
            >
              <option value="/dashboard">Today</option>
              <option value="/tasks">Tasks</option>
              <option value="/money/accounts">Money accounts</option>
              <option value="/money/transactions">Transactions</option>
              <option value="/debts">Debts</option>
              <option value="/career">Career</option>
              <option value="/reviews">Weekly reviews</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="default-account" className="text-xs font-medium">
              Default money account
            </label>
            <select
              id="default-account"
              name="defaultAccountId"
              defaultValue={defaultAccountId ?? ""}
              className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
            >
              <option value="">Choose each time</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="default-task-priority"
              className="text-xs font-medium"
            >
              Quick task priority
            </label>
            <select
              id="default-task-priority"
              name="defaultTaskPriority"
              defaultValue={defaultTaskPriority}
              className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm capitalize outline-none focus-visible:ring-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="default-task-estimate"
              className="text-xs font-medium"
            >
              Quick task estimate
            </label>
            <Input
              id="default-task-estimate"
              name="defaultTaskEstimatedMinutes"
              type="number"
              inputMode="numeric"
              min="1"
              max="1440"
              defaultValue={defaultTaskEstimatedMinutes ?? ""}
              placeholder="No default"
            />
          </div>
        </div>
      </fieldset>

      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            state.success
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
