"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeOnboardingAction,
  type OnboardingState,
} from "@/lib/onboarding/actions";

const initialState: OnboardingState = { success: false, message: "" };

export function OnboardingForm() {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-7">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">About you</legend>
        <div className="space-y-1.5">
          <label
            htmlFor="displayName"
            className="text-muted-foreground text-sm"
          >
            Display name <span className="text-xs">(optional)</span>
          </label>
          <Input
            id="displayName"
            name="displayName"
            maxLength={80}
            placeholder="What should ATLAS call you?"
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-sm font-semibold">
          Your starting position
        </legend>
        <div className="space-y-1.5">
          <label
            htmlFor="currentCash"
            className="text-muted-foreground text-sm"
          >
            Current cash balance
          </label>
          <Input
            id="currentCash"
            name="currentCash"
            inputMode="decimal"
            defaultValue="0.00"
            aria-describedby="cash-help"
          />
          <p id="cash-help" className="text-muted-foreground text-xs">
            PHP · cash you can use now
          </p>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="monthlyNetIncome"
            className="text-muted-foreground text-sm"
          >
            Monthly net income
          </label>
          <Input
            id="monthlyNetIncome"
            name="monthlyNetIncome"
            inputMode="decimal"
            defaultValue="0.00"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="nextPayday" className="text-muted-foreground text-sm">
            Next payday <span className="text-xs">(optional)</span>
          </label>
          <Input id="nextPayday" name="nextPayday" type="date" />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Up to three current goals{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </legend>
        {[1, 2, 3].map((number) => (
          <Input
            key={number}
            name={`goal${number}`}
            maxLength={160}
            placeholder={`${number}. ${number === 1 ? "e.g. Build a stronger portfolio" : "Another outcome"}`}
          />
        ))}
      </fieldset>
      {state.message && (
        <p
          role="alert"
          className="border-destructive/25 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm"
        >
          {state.message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          variant="ghost"
          name="skip"
          value="true"
          disabled={pending}
        >
          Skip optional details
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Complete setup"}
        </Button>
      </div>
    </form>
  );
}
