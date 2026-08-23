"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOfflineSync } from "@/components/offline/offline-mutation";

type ReviewFields = {
  wins: string;
  challenges: string;
  lessons: string;
  timeWasters: string;
  moneyReflection: string;
  careerReflection: string;
  nextWeekFocus: string;
  energyScore: string;
  stressScore: string;
  overallScore: string;
};

const questions = [
  ["wins", "What went well?"],
  ["challenges", "What was difficult?"],
  ["lessons", "What did you learn?"],
  ["timeWasters", "What wasted your time?"],
  ["moneyReflection", "What happened financially?"],
  ["careerReflection", "What moved your career forward?"],
  ["nextWeekFocus", "What matters most next week?"],
] as const;

export function ReviewForm({
  weekStart,
  initial,
}: {
  weekStart: string;
  initial?: Partial<ReviewFields>;
}) {
  const { register, handleSubmit } = useForm<ReviewFields>({
    defaultValues: initial,
  });
  const [intent, setIntent] = useState<"draft" | "submit">("draft");
  const [pending, startTransition] = useTransition();
  const { submit } = useOfflineSync();

  const onSubmit = handleSubmit((values) => {
    const data = new FormData();
    data.set("weekStart", weekStart);
    data.set("intent", intent);
    Object.entries(values).forEach(([key, value]) =>
      data.set(key, value ?? ""),
    );
    startTransition(async () => {
      const result = await submit("review.save", data);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {questions.map(([name, label]) => (
        <div key={name}>
          <label htmlFor={name} className="text-sm font-semibold">
            {label}
          </label>
          <textarea
            id={name}
            {...register(name)}
            rows={3}
            className="border-border bg-background focus-visible:ring-ring mt-2 w-full rounded-xl border p-3 text-sm outline-none focus-visible:ring-2"
          />
        </div>
      ))}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-4 text-sm font-semibold">
          How did the week feel?
        </legend>
        {(["energyScore", "stressScore", "overallScore"] as const).map(
          (name) => (
            <div key={name}>
              <label
                htmlFor={name}
                className="text-muted-foreground text-xs capitalize"
              >
                {name.replace("Score", "")} · 1–10
              </label>
              <Input
                id={name}
                {...register(name)}
                type="number"
                min="1"
                max="10"
              />
            </div>
          ),
        )}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          onClick={() => setIntent("draft")}
        >
          Save draft
        </Button>
        <Button
          type="submit"
          disabled={pending}
          onClick={() => setIntent("submit")}
        >
          {pending ? "Saving…" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
