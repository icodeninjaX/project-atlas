"use client";

import { BriefcaseBusiness } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  dashboardCardClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-card";
import { chooseCareerFollowupAction } from "@/lib/next-best-action/actions";
import type { NextBestAction } from "@/lib/next-best-action/engine";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NextBestActions({ actions }: { actions: NextBestAction[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const visible = actions.filter((action) => !hidden.includes(action.id));
  if (!visible.length && !message) return null;

  function choose(action: NextBestAction, choice: "dismissed" | "confirmed") {
    setMessage("");
    startTransition(async () => {
      const result = await chooseCareerFollowupAction(
        action.id,
        action.expectedAt,
        action.expectedUpdatedAt,
        choice,
      );
      setMessage(result.message);
      if (result.success) {
        setHidden((current) => [...current, action.id]);
        setReviewing(null);
        router.refresh();
      }
    });
  }

  return (
    <section
      aria-labelledby="next-best-action-title"
      data-spotlight
      className={cn(dashboardCardClass, "mt-5 sm:p-7")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1">
          <BriefcaseBusiness aria-hidden="true" className="size-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <p className="text-primary text-[11px] font-semibold tracking-[0.14em] uppercase">
            Next best action
          </p>
          <h2
            id="next-best-action-title"
            className="mt-0.5 text-lg font-semibold tracking-[-0.02em]"
          >
            Turn a follow-up into a task
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm leading-6">
            {visible.length === 1
              ? "This follow-up is on today’s route but isn’t a task yet. Add it to Tasks to track it, or dismiss it."
              : "These follow-ups are on today’s route but aren’t tasks yet. Add one to Tasks to track it, or dismiss it."}
          </p>
        </div>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visible.map((action) => (
          <article key={action.id} className={cn(dashboardTileClass, "sm:p-5")}>
            <p className="text-xs font-semibold">
              <span className="text-primary">{action.urgency}</span>
              <span className="text-muted-foreground">
                {" "}
                · {action.sourceLabel} follow-up
              </span>
            </p>
            <h3 className="mt-2 text-lg font-semibold break-words">
              {action.title}
            </h3>
            {action.relatedGoals.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                Related {action.relatedGoals.length === 1 ? "goal" : "goals"}:{" "}
                {action.relatedGoals.map((goal, index) => (
                  <span key={goal.id}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={goal.href as Route}
                      className="underline underline-offset-2"
                    >
                      {goal.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={action.sourceHref as Route}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "min-h-11",
                )}
              >
                View {action.sourceLabel} application
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => setReviewing(action.id)}
                className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
              >
                Review task proposal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(action, "dismissed")}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-11 rounded-lg px-3 text-sm focus-visible:ring-2"
              >
                Dismiss
              </button>
            </div>
            {reviewing === action.id && (
              <div className="bg-primary/5 ring-primary/25 mt-4 rounded-xl p-4 ring-1">
                <p className="text-sm font-semibold">
                  Create a follow-up task?
                </p>
                <p className="mt-1 text-sm break-words">{action.taskTitle}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Scheduled for the recorded follow-up date, or today if
                  overdue. High priority. No message will be sent.
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-5 break-words">
                  <span className="text-foreground font-medium">Why now:</span>{" "}
                  {action.reason}. {action.uncertainty}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => choose(action, "confirmed")}
                    className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
                  >
                    Confirm and create task
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setReviewing(null)}
                    className="min-h-11 rounded-lg px-3 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
