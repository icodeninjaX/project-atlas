"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import type { RunwayActionState } from "@/lib/runway/actions";
import type { RunwayAccount, RunwayCategory } from "@/lib/runway/engine";

const initialState: RunwayActionState = { success: false, message: "" };

export function RunwayPreferencesForm({
  accounts,
  categories,
  targetMonths,
}: {
  accounts: RunwayAccount[];
  categories: RunwayCategory[];
  targetMonths: number;
}) {
  const [state, action, pending] = useOfflineActionState(
    "runway.savePreferences",
    initialState,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const selectableCategories = categories.filter(
    (category) => category.name.toLowerCase() !== "debt payment",
  );

  return (
    <form action={action} className="grid min-w-0 gap-5">
      <fieldset>
        <legend className="text-sm font-semibold">Liquid accounts</legend>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Choose funds you could use for essentials. Archived accounts are never
          included.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {accounts.length ? (
            accounts.map((account) => (
              <label
                key={account.id}
                className="border-border bg-background flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="accountId"
                  value={account.id}
                  defaultChecked={account.includeInRunway}
                  className="accent-primary size-4"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {account.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {account.accountType.replaceAll("_", " ")}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs sm:col-span-2">
              Add a cash, bank, e-wallet, or savings account first.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Essential expenses</legend>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Debt Payment stays separate so active minimum payments are never
          counted twice.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectableCategories.map((category) => (
            <label
              key={category.id}
              className="border-border bg-background flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm"
            >
              <input
                type="checkbox"
                name="categoryId"
                value={category.id}
                defaultChecked={category.isEssential}
                className="accent-primary size-4"
              />
              <span className="font-medium">{category.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="text-sm font-semibold">
        Preferred reserve target
        <select
          name="targetMonths"
          defaultValue={targetMonths}
          className="border-border bg-background focus-visible:ring-ring mt-2 min-h-11 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {Array.from({ length: 24 }, (_, index) => index + 1).map((months) => (
            <option key={months} value={months}>
              {months} {months === 1 ? "month" : "months"}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        pending={pending}
        pendingLabel="Saving…"
        className="w-full sm:w-auto"
      >
        Save assumptions
      </Button>
    </form>
  );
}
