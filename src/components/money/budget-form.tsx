"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BudgetActionState } from "@/lib/budgets/actions";
import { centavosToPesoInput } from "@/lib/money/money";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: BudgetActionState = { success: false, message: "" };

export function BudgetForm({
  monthStart,
  expectedIncomeCentavos,
  categories,
  planned,
}: {
  monthStart: string;
  expectedIncomeCentavos: number;
  categories: Array<{ id: string; name: string }>;
  planned: Record<string, number>;
}) {
  const [state, action, pending] = useOfflineActionState(
    "budget.save",
    initial,
  );
  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="monthStart" value={monthStart} />
      <div>
        <label htmlFor="expectedIncome" className="text-sm font-semibold">
          Expected income
        </label>
        <Input
          id="expectedIncome"
          name="expectedIncome"
          inputMode="decimal"
          defaultValue={centavosToPesoInput(expectedIncomeCentavos)}
          className="mt-2 max-w-xs font-mono"
        />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">
          Planned expenses by category
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <label key={category.id} className="text-muted-foreground text-xs">
              {category.name}
              <Input
                name={`item:${category.id}`}
                inputMode="decimal"
                defaultValue={
                  planned[category.id] !== undefined
                    ? centavosToPesoInput(planned[category.id] ?? 0)
                    : ""
                }
                placeholder="0.00"
                className="mt-1.5 font-mono"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save monthly budget"}
        </Button>
      </div>
    </form>
  );
}
