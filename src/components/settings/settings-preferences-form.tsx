"use client";

import {
  CalendarClock,
  Check,
  Compass,
  ListOrdered,
  Mountain,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useActionState } from "react";
import {
  FormFeedback,
  SettingsGroup,
  fieldHelpClass,
  fieldLabelClass,
  selectClass,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettingsAction, type SettingsState } from "@/lib/settings/actions";

const initialState: SettingsState = { success: false, message: "" };

const strategies = [
  {
    value: "avalanche",
    label: "Avalanche",
    description: "Highest interest rate first",
    icon: Mountain,
    bars: [92, 64, 40],
  },
  {
    value: "snowball",
    label: "Snowball",
    description: "Smallest remaining balance first",
    icon: Snowflake,
    bars: [28, 56, 88],
  },
  {
    value: "priority",
    label: "My priority",
    description: "Use your manual debt order",
    icon: ListOrdered,
    bars: [60, 84, 36],
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  bars: readonly number[];
}>;

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function SettingsPreferencesForm({
  displayName,
  debtStrategy,
  homeRoute,
  defaultTaskPriority,
  defaultTaskEstimatedMinutes,
  daylineCapacityMinutes,
  daylineEnergyLevel,
  defaultAccountId,
  accounts,
}: {
  displayName: string;
  debtStrategy: string;
  homeRoute: string;
  defaultTaskPriority: string;
  defaultTaskEstimatedMinutes: number | null;
  daylineCapacityMinutes: number;
  daylineEnergyLevel: string;
  defaultAccountId: string | null;
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    saveSettingsAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="space-y-7">
      <SettingsGroup title="Identity" icon={Sparkles}>
        <div className="space-y-1.5">
          <label htmlFor="display-name" className={fieldLabelClass}>
            Display name
          </label>
          <Input
            id="display-name"
            name="displayName"
            defaultValue={displayName}
            maxLength={80}
            autoComplete="name"
            placeholder="What should ATLAS call you?"
            aria-describedby="display-name-help"
            className="max-w-md"
          />
          <p id="display-name-help" className={fieldHelpClass}>
            Shown in the app header. Your email remains unchanged.
          </p>
        </div>
      </SettingsGroup>

      <fieldset aria-describedby="debt-strategy-help" className="min-w-0">
        <legend className="sr-only">Default debt payoff plan</legend>
        <SettingsGroup title="Debt payoff" titleIsLegend icon={Mountain}>
          <p aria-hidden="true" className="text-sm font-semibold">
            Default debt payoff plan
          </p>
          <p
            id="debt-strategy-help"
            className="text-muted-foreground mt-1 text-xs leading-5"
          >
            This becomes the starting view on Debts. You can still compare every
            plan there.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              return (
                <label
                  key={strategy.value}
                  className="group bg-background/55 ring-border/80 hover:ring-primary/35 has-[:checked]:bg-primary/[0.07] has-[:checked]:ring-primary/60 has-[:focus-visible]:ring-ring relative flex min-h-28 cursor-pointer flex-col rounded-2xl p-3.5 ring-1 transition-[background-color,box-shadow] has-[:checked]:shadow-[0_10px_30px_-18px_color-mix(in_srgb,var(--primary)_80%,transparent)] has-[:focus-visible]:ring-2"
                >
                  <input
                    type="radio"
                    name="debtStrategy"
                    value={strategy.value}
                    defaultChecked={strategy.value === debtStrategy}
                    className="peer sr-only"
                  />
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="bg-muted/80 text-muted-foreground group-has-[:checked]:bg-primary/12 group-has-[:checked]:text-primary grid size-8 place-items-center rounded-xl"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">
                      {strategy.label}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-2 text-xs leading-5">
                    {strategy.description}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-auto flex h-6 items-end gap-1 pt-3"
                  >
                    {strategy.bars.map((height, index) => (
                      <span
                        key={index}
                        className="bg-muted-foreground/25 group-has-[:checked]:bg-primary flex-1 rounded-[3px] transition-colors"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ring-border group-has-[:checked]:bg-primary-solid group-has-[:checked]:ring-primary-solid text-primary-solid-foreground absolute top-3.5 right-3.5 grid size-5 place-items-center rounded-full ring-1"
                  >
                    <Check
                      className="size-3 opacity-0 group-has-[:checked]:opacity-100"
                      strokeWidth={3}
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </SettingsGroup>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Everyday defaults</legend>
        <SettingsGroup title="Everyday defaults" titleIsLegend icon={Compass}>
          <p className="text-muted-foreground -mt-1 text-xs leading-5">
            Choose where ATLAS opens and prefill the fields you use most often.
          </p>
          <div className="mt-3 grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="home-route" className={fieldLabelClass}>
                Start page after login
              </label>
              <select
                id="home-route"
                name="homeRoute"
                defaultValue={homeRoute}
                className={selectClass}
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
              <label htmlFor="default-account" className={fieldLabelClass}>
                Default money account
              </label>
              <select
                id="default-account"
                name="defaultAccountId"
                defaultValue={defaultAccountId ?? ""}
                className={selectClass}
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
                className={fieldLabelClass}
              >
                Quick task priority
              </label>
              <select
                id="default-task-priority"
                name="defaultTaskPriority"
                defaultValue={defaultTaskPriority}
                className={selectClass}
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
                className={fieldLabelClass}
              >
                Quick task estimate
              </label>
              <div className="relative">
                <Input
                  id="default-task-estimate"
                  name="defaultTaskEstimatedMinutes"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1440"
                  defaultValue={defaultTaskEstimatedMinutes ?? ""}
                  placeholder="No default"
                  className="pr-12"
                />
                <span
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs"
                >
                  min
                </span>
              </div>
            </div>
          </div>
        </SettingsGroup>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Dayline planning</legend>
        <SettingsGroup
          title="Dayline planning"
          titleIsLegend
          icon={CalendarClock}
        >
          <p className="text-muted-foreground -mt-1 text-xs leading-5">
            Set the focus time and energy ATLAS should use when choosing
            realistic next actions.
          </p>
          <div className="mt-3 grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="dayline-capacity" className={fieldLabelClass}>
                Daily focus capacity
              </label>
              <div className="relative">
                <Input
                  id="dayline-capacity"
                  name="daylineCapacityMinutes"
                  type="number"
                  inputMode="numeric"
                  min="15"
                  max="720"
                  step="15"
                  defaultValue={daylineCapacityMinutes}
                  aria-describedby="dayline-capacity-help"
                  className="pr-12"
                />
                <span
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs"
                >
                  min
                </span>
              </div>
              <p id="dayline-capacity-help" className={fieldHelpClass}>
                Minutes available for focused work on a typical day. Saved:{" "}
                {formatMinutes(daylineCapacityMinutes)}.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dayline-energy" className={fieldLabelClass}>
                Planning energy
              </label>
              <select
                id="dayline-energy"
                name="daylineEnergyLevel"
                defaultValue={daylineEnergyLevel}
                className={selectClass}
                aria-describedby="dayline-energy-help"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p id="dayline-energy-help" className={fieldHelpClass}>
                High-effort tasks move down when your available energy is lower.
              </p>
            </div>
          </div>
        </SettingsGroup>
      </fieldset>

      <div className="border-border/70 -mx-4 -mb-4 flex flex-col gap-3 border-t px-4 pt-4 pb-4 min-[360px]:-mx-5 min-[360px]:-mb-5 min-[360px]:px-5 min-[360px]:pb-5 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-6">
        <div className="min-w-0 flex-1">
          {state.message ? (
            <FormFeedback success={state.success}>{state.message}</FormFeedback>
          ) : (
            <p className="text-muted-foreground text-xs leading-5">
              Changes apply across ATLAS once saved.
            </p>
          )}
        </div>
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Saving…"
          className="sm:self-center"
        >
          Save preferences
        </Button>
      </div>
    </form>
  );
}
