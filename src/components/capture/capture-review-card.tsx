"use client";

import {
  AlertTriangle,
  Check,
  CircleCheck,
  CircleSlash,
  CircleX,
  Quote,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { BatchConfirmResult } from "@/lib/capture/batch-actions";
import type { BatchCaptureItem } from "@/lib/capture/batch";
import { cn } from "@/lib/utils";
import {
  Chip,
  KindTile,
  captureKind,
  chipTones,
  confidenceTone,
  fieldLabelClass,
  glassCardClass,
  inputClass,
  selectClass,
} from "./capture-chrome";

type Account = { id: string; name: string; account_type: string };
type Category = { id: string; name: string; category_type: string };

function unique<T>(values: T[], check: (value: T) => boolean) {
  const matches = values.filter(check);
  return matches.length === 1 ? matches[0] : undefined;
}

function SourceSnippet({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground mt-1.5 flex min-w-0 items-start gap-1 text-[11px] leading-4 font-normal">
      <Quote aria-hidden="true" className="mt-px size-3 shrink-0 opacity-70" />
      <span className="min-w-0 break-words">Source: “{children}”</span>
    </span>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
  maxLength,
  sourceSnippet,
  className,
}: {
  label: string;
  name: string;
  value?: string | null;
  type?: string;
  required?: boolean;
  maxLength?: number;
  sourceSnippet?: string | null;
  className?: string;
}) {
  return (
    <label className={cn(fieldLabelClass, className)}>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        maxLength={maxLength}
        className={inputClass}
      />
      {sourceSnippet && <SourceSnippet>{sourceSnippet}</SourceSnippet>}
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  required,
  className,
  children,
  after,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <label className={cn(fieldLabelClass, className)}>
      {label}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={selectClass}
      >
        {children}
      </select>
      {after}
    </label>
  );
}

const fieldGrid = "grid gap-x-4 gap-y-4 @md:grid-cols-2";

const resultView = {
  saved: { word: "Saved", icon: CircleCheck, tone: chipTones.positive },
  rejected: { word: "Rejected", icon: CircleSlash, tone: chipTones.neutral },
  failed: { word: "Not saved", icon: CircleX, tone: chipTones.danger },
} as const;

export function CaptureCard({
  item,
  index,
  accounts,
  categories,
  result,
  busy,
  onSave,
  onReject,
}: {
  item: BatchCaptureItem;
  index: number;
  accounts: Account[];
  categories: Category[];
  result?: BatchConfirmResult;
  busy: boolean;
  onSave: () => void;
  onReject: () => void;
}) {
  const proposal = item.proposal;
  const kind = captureKind(item);
  const money = proposal.kind === "expense" || proposal.kind === "income";
  const hint = proposal.accountHint?.toLocaleLowerCase();
  const account = hint
    ? (unique(accounts, (value) => value.name.toLocaleLowerCase() === hint) ??
      (hint === "cash"
        ? unique(accounts, (value) => value.account_type === "cash")
        : undefined))
    : undefined;
  const category =
    money && proposal.categorySuggestion
      ? unique(
          categories,
          (value) =>
            value.category_type === proposal.kind &&
            value.name.toLocaleLowerCase() ===
              proposal.categorySuggestion?.toLocaleLowerCase(),
        )
      : undefined;
  const outcome = result
    ? result.status === "saved"
      ? resultView.saved
      : result.status === "rejected"
        ? resultView.rejected
        : resultView.failed
    : null;
  const titleId = `capture-card-${item.id ?? `unsupported-${index}`}`;

  return (
    <article
      aria-labelledby={titleId}
      data-spotlight
      className={cn(
        glassCardClass,
        "overflow-hidden transition-[opacity,box-shadow] duration-300",
        result?.status === "rejected" && "opacity-75",
        result?.status === "saved" && "ring-positive/25 ring-1",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-5 left-0 w-[3px] rounded-r-full",
          result?.status === "saved" ? "bg-positive" : kind.tone.dot,
        )}
      />
      <header className="flex items-start gap-3.5 p-4 pb-0 min-[360px]:p-5 min-[360px]:pb-0 sm:gap-4 sm:p-6 sm:pb-0">
        <KindTile icon={kind.icon} tone={kind.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p
              id={titleId}
              className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase"
            >
              {index + 1}. {kind.label}
            </p>
            {outcome ? (
              <Chip className={outcome.tone}>{outcome.word}</Chip>
            ) : item.id ? (
              <Chip className={confidenceTone[proposal.confidence]}>
                {proposal.confidence[0]!.toUpperCase() +
                  proposal.confidence.slice(1)}{" "}
                confidence
              </Chip>
            ) : null}
          </div>
          <blockquote className="mt-1.5 text-[0.9375rem] leading-6 font-medium tracking-[-0.01em] text-pretty break-words">
            “{item.sourcePhrase}”
          </blockquote>
          {item.source && (
            <p className="text-muted-foreground mt-1 text-xs">
              {item.source.label} · {item.source.method} · line{" "}
              {item.sourceLine ?? 1} of corrected text · {proposal.confidence}{" "}
              confidence
            </p>
          )}
          {!result && item.id && (
            <p className="text-muted-foreground mt-1 text-xs">
              Review and correct before saving.
            </p>
          )}
        </div>
      </header>

      <div className="space-y-4 p-4 min-[360px]:p-5 sm:p-6">
        {proposal.warnings.length > 0 && !result && (
          <div className="flex gap-3 rounded-2xl bg-amber-500/[0.07] p-3.5 text-sm ring-1 ring-amber-500/25">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300"
            />
            <ul className="min-w-0 space-y-1 leading-5">
              {proposal.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {!item.id && (
          <p
            role="status"
            className="bg-background/55 ring-border/80 text-muted-foreground rounded-2xl p-3.5 text-sm ring-1"
          >
            This action is not supported by Capture yet. Use a manual form.
          </p>
        )}
        {item.id && !result && (
          <form
            id={`capture-form-${item.id}`}
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="previewId" value={item.id} />
            <input type="hidden" name="operation" value={item.operation} />
            <input type="hidden" name="kind" value={proposal.kind} />
            {item.operation === "reschedule_task" ? (
              <div className={fieldGrid}>
                <SelectField
                  label="Task"
                  name="taskId"
                  required
                  defaultValue={item.targetId ?? ""}
                >
                  <option value="">Choose matching task</option>
                  {item.candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}
                      {candidate.scheduledFor
                        ? ` · ${candidate.scheduledFor}`
                        : ""}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="New scheduled date"
                  name="scheduledFor"
                  type="date"
                  value={proposal.date}
                  sourceSnippet={item.source && proposal.dateText}
                  required
                />
                {item.candidates.length === 0 && (
                  <p className="text-muted-foreground text-sm @md:col-span-2">
                    No matching open task was found. Use the Tasks page or
                    rephrase its title.
                  </p>
                )}
              </div>
            ) : null}
            {money && (
              <div className={fieldGrid}>
                <Field
                  label="Amount in PHP"
                  name="amount"
                  value={proposal.amount}
                  sourceSnippet={item.source && proposal.amountText}
                  required
                />
                <Field
                  label="Transaction date"
                  name="transactionDate"
                  type="date"
                  value={proposal.date}
                  sourceSnippet={item.source && proposal.dateText}
                  required
                />
                <SelectField
                  label="Account"
                  name="accountId"
                  required
                  defaultValue={account?.id ?? ""}
                  after={
                    item.source && proposal.accountText ? (
                      <SourceSnippet>{proposal.accountText}</SourceSnippet>
                    ) : null
                  }
                >
                  <option value="">Choose account</option>
                  {accounts.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Category"
                  name="categoryId"
                  required
                  defaultValue={category?.id ?? ""}
                >
                  <option value="">Choose category</option>
                  {categories
                    .filter((value) => value.category_type === proposal.kind)
                    .map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name}
                      </option>
                    ))}
                </SelectField>
                <Field
                  label="Merchant or source"
                  name="merchantOrSource"
                  value={proposal.merchantOrSource}
                  sourceSnippet={item.source && proposal.merchantOrSource}
                  maxLength={160}
                />
                <Field
                  label="Description"
                  name="description"
                  value={proposal.description}
                  maxLength={300}
                />
              </div>
            )}
            {proposal.kind === "task" && item.operation === "create" && (
              <div className={fieldGrid}>
                <Field
                  label="Task title"
                  name="title"
                  value={proposal.title}
                  sourceSnippet={item.source && proposal.title}
                  required
                  maxLength={160}
                  className="@md:col-span-2"
                />
                <Field
                  label="Scheduled date (optional)"
                  name="scheduledFor"
                  type="date"
                  value={proposal.date}
                  sourceSnippet={item.source && proposal.dateText}
                />
                <SelectField
                  label="Priority"
                  name="priority"
                  defaultValue="medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </SelectField>
                <Field
                  label="Description"
                  name="description"
                  value={proposal.description}
                  maxLength={300}
                  className="@md:col-span-2"
                />
              </div>
            )}
            {proposal.kind === "career_application" && (
              <div className={fieldGrid}>
                <Field
                  label="Company name"
                  name="companyName"
                  value={proposal.companyName}
                  sourceSnippet={item.source && proposal.companyName}
                  required
                  maxLength={160}
                />
                <Field
                  label="Role title"
                  name="roleTitle"
                  value={proposal.roleTitle}
                  sourceSnippet={item.source && proposal.roleTitle}
                  required
                  maxLength={160}
                />
                <Field
                  label="Next action"
                  name="nextAction"
                  value={proposal.title}
                  sourceSnippet={item.source && proposal.title}
                  maxLength={160}
                  className="@md:col-span-2"
                />
                <Field
                  label="Date applied"
                  name="appliedAt"
                  type="date"
                  value={proposal.dateRole === "applied" ? proposal.date : null}
                  sourceSnippet={
                    item.source && proposal.dateRole === "applied"
                      ? proposal.dateText
                      : null
                  }
                />
                <Field
                  label="Next action date"
                  name="nextActionAt"
                  type="date"
                  value={
                    proposal.dateRole === "next_action" ? proposal.date : null
                  }
                  sourceSnippet={
                    item.source && proposal.dateRole === "next_action"
                      ? proposal.dateText
                      : null
                  }
                />
                <SelectField
                  label="Stage"
                  name="stage"
                  defaultValue="interested"
                >
                  <option value="interested">Interested</option>
                  <option value="preparing">Preparing</option>
                  <option value="applied">Applied</option>
                </SelectField>
                <SelectField
                  label="Work setup"
                  name="workSetup"
                  defaultValue="unspecified"
                >
                  <option value="unspecified">Unspecified</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </SelectField>
                <SelectField
                  label="Employment type"
                  name="employmentType"
                  defaultValue="unspecified"
                >
                  <option value="unspecified">Unspecified</option>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </SelectField>
              </div>
            )}
            {proposal.kind === "knowledge_item" && (
              <div className={fieldGrid}>
                <Field
                  label="Concept title"
                  name="title"
                  value={proposal.title}
                  sourceSnippet={item.source && proposal.title}
                  required
                  maxLength={160}
                />
                <Field
                  label="Category"
                  name="category"
                  value={proposal.categorySuggestion}
                  required
                  maxLength={80}
                />
                <label className={cn(fieldLabelClass, "@md:col-span-2")}>
                  Learning notes
                  <textarea
                    name="notes"
                    required
                    maxLength={10000}
                    defaultValue={proposal.notes ?? ""}
                    className={cn(inputClass, "min-h-28 resize-y py-2.5")}
                  />
                  {item.source && proposal.notes && (
                    <SourceSnippet>{proposal.notes}</SourceSnippet>
                  )}
                </label>
              </div>
            )}
            {item.source && (money || proposal.date) && (
              <label className="bg-background/55 ring-border/80 hover:ring-primary/35 has-[:checked]:bg-primary/[0.06] has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-ring flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 text-sm leading-5 ring-1 transition-colors has-[:focus-visible]:ring-2">
                <input
                  type="checkbox"
                  name="reviewedSource"
                  value="yes"
                  required
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span>
                  I checked the extracted amount and date, where present,
                  against the source text.
                </span>
              </label>
            )}
            <div className="border-border/70 flex flex-col-reverse gap-2 border-t pt-4 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={onReject}
              >
                <X aria-hidden="true" className="size-4" />
                Reject
              </Button>
              <Button type="submit" disabled={busy}>
                <Check aria-hidden="true" className="size-4" />
                Confirm this action
              </Button>
            </div>
          </form>
        )}
        {result && outcome && (
          <p
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-2xl px-3.5 py-3 text-sm leading-5 ring-1",
              outcome.tone,
            )}
          >
            <outcome.icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0">
              {outcome.word}: {result.message}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}
