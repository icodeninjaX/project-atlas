"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmCaptureAction,
  interpretCaptureAction,
  type ConfirmCaptureState,
  type InterpretCaptureState,
} from "@/lib/capture/actions";
import type { CaptureProposal } from "@/lib/capture/proposal";

const initialInterpret: InterpretCaptureState = {
  message: "",
  proposal: null,
  previewId: null,
};
const initialConfirm: ConfirmCaptureState = { success: false, message: "" };

type Account = { id: string; name: string; account_type: string };
type Category = { id: string; name: string; category_type: string };
type ModelOption = { id: string; label: string; pool: string };

function uniqueMatch<T>(items: T[], matches: (item: T) => boolean) {
  const found = items.filter(matches);
  return found.length === 1 ? found[0] : undefined;
}

function suggestedAccount(accounts: Account[], hint: string | null) {
  if (!hint) return undefined;
  const normalized = hint.trim().toLowerCase();
  return (
    uniqueMatch(
      accounts,
      (account) => account.name.toLowerCase() === normalized,
    ) ??
    (normalized === "cash"
      ? uniqueMatch(accounts, (account) => account.account_type === "cash")
      : undefined)
  );
}

function suggestedCategory(categories: Category[], proposal: CaptureProposal) {
  const available = categories.filter(
    (category) => category.category_type === proposal.kind,
  );
  const suggestion = proposal.categorySuggestion?.trim().toLowerCase();
  const direct = suggestion
    ? uniqueMatch(
        available,
        (category) => category.name.toLowerCase() === suggestion,
      )
    : undefined;
  if (direct) return direct;
  const context = [proposal.categorySuggestion, proposal.description]
    .filter(Boolean)
    .join(" ");
  if (
    proposal.kind === "expense" &&
    /\b(?:medicine|medication|medical|pharmacy|healthcare)\b/i.test(context)
  ) {
    return uniqueMatch(
      available,
      (category) => category.name.toLowerCase() === "health",
    );
  }
  return undefined;
}

function Field({
  label,
  name,
  value,
  required = false,
  type = "text",
  maxLength,
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="text-muted-foreground block text-xs">
      {label}
      <Input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        maxLength={maxLength}
        className="mt-1.5"
      />
    </label>
  );
}

export function CaptureWorkspace({
  accounts,
  categories,
  models,
  defaultModel,
}: {
  accounts: Account[];
  categories: Category[];
  models: readonly ModelOption[];
  defaultModel: string;
}) {
  const [interpretState, interpretAction, interpreting] = useActionState(
    interpretCaptureAction,
    initialInterpret,
  );
  const [dismissed, setDismissed] = useState<InterpretCaptureState | null>(
    null,
  );
  const [model, setModel] = useState(defaultModel);
  const proposal =
    dismissed === interpretState ? null : interpretState.proposal;

  return (
    <div className="mt-8 space-y-6">
      <form
        action={interpretAction}
        className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6"
      >
        <label htmlFor="capture-text" className="block text-sm font-semibold">
          One thing to capture
        </label>
        <textarea
          id="capture-text"
          name="text"
          required
          minLength={8}
          maxLength={500}
          onChange={() => setDismissed(interpretState)}
          placeholder="Paid ₱450 for gas earlier"
          className="border-border bg-background focus-visible:ring-ring min-h-28 w-full resize-y rounded-xl border px-3 py-3 text-base outline-none focus-visible:ring-2"
        />
        <div>
          <label
            htmlFor="capture-model"
            className="block text-sm font-semibold"
          >
            AI model
          </label>
          <select
            id="capture-model"
            name="model"
            value={model}
            disabled={interpreting}
            onChange={(event) => {
              setModel(event.target.value);
              setDismissed(interpretState);
            }}
            className="border-border bg-background focus-visible:ring-ring mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 sm:max-w-sm"
          >
            {models.map((option) => (
              <option key={option.id} value={option.id}>
                {`${option.label}${option.id === defaultModel ? " (default)" : ""} · ${option.pool} shared daily tokens`}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground mt-2 text-xs">
            The daily token pools are shared across models. Usage beyond the
            offer can be billed by OpenAI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            pending={interpreting}
            pendingLabel="Interpreting…"
          >
            Preview capture
          </Button>
          <p className="text-muted-foreground text-xs">
            One item at a time. Your text is sent to the AI provider only when
            you request a preview.
          </p>
        </div>
        {interpretState.message && !interpretState.proposal && (
          <p role="status" className="text-muted-foreground text-sm">
            {interpretState.message}
          </p>
        )}
      </form>

      {proposal && (
        <CapturePreview
          key={interpretState.previewId}
          proposal={proposal}
          accounts={accounts}
          categories={categories}
          onCancel={() => setDismissed(interpretState)}
        />
      )}

      <div className="border-border bg-muted/30 rounded-2xl border p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Use a manual form</h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/money/transactions?create=true"
            className="text-primary underline underline-offset-4"
          >
            Income or expense
          </Link>
          <Link
            href="/tasks"
            className="text-primary underline underline-offset-4"
          >
            Task
          </Link>
          <Link
            href="/career"
            className="text-primary underline underline-offset-4"
          >
            Career application
          </Link>
          <Link
            href="/knowledge"
            className="text-primary underline underline-offset-4"
          >
            Knowledge item
          </Link>
        </div>
      </div>
    </div>
  );
}

function CapturePreview({
  proposal,
  accounts,
  categories,
  onCancel,
}: {
  proposal: CaptureProposal;
  accounts: Account[];
  categories: Category[];
  onCancel: () => void;
}) {
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmCaptureAction,
    initialConfirm,
  );
  useEffect(() => {
    if (!confirmState.message) return;
    if (confirmState.success) toast.success(confirmState.message);
    else toast.error(confirmState.message);
  }, [confirmState]);
  const money = proposal.kind === "expense" || proposal.kind === "income";
  const matchingAccount = money
    ? suggestedAccount(accounts, proposal.accountHint)
    : undefined;
  const matchingCategory = money
    ? suggestedCategory(categories, proposal)
    : undefined;

  if (confirmState.success) {
    return (
      <p
        role="status"
        className="border-border bg-card rounded-2xl border p-4 text-sm"
      >
        {confirmState.message}
      </p>
    );
  }

  return (
    <section
      aria-label="Capture preview"
      className="border-primary/30 bg-card space-y-5 rounded-2xl border p-4 sm:p-6"
    >
      <div>
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Preview · {proposal.kind.replaceAll("_", " ")}
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          Review what ATLAS will save
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit any field, then confirm. Nothing has been saved yet.
        </p>
      </div>
      {proposal.warnings.length > 0 && (
        <div className="border-border bg-muted/50 rounded-xl border p-3 text-sm">
          <p className="font-medium">Needs your attention</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {proposal.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {money && accounts.length === 0 && (
        <p role="alert" className="text-destructive text-sm">
          Add a financial account before recording income or expenses.
        </p>
      )}
      <form
        key={JSON.stringify(proposal)}
        action={confirmAction}
        className="space-y-4"
      >
        <input type="hidden" name="kind" value={proposal.kind} />
        {money && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-muted-foreground block text-xs">
              Account
              <select
                name="accountId"
                required
                defaultValue={matchingAccount?.id ?? ""}
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="">Choose account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground block text-xs">
              Category
              <select
                name="categoryId"
                required
                defaultValue={matchingCategory?.id ?? ""}
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="">
                  Choose category
                  {proposal.categorySuggestion
                    ? ` (suggested: ${proposal.categorySuggestion})`
                    : ""}
                </option>
                {categories
                  .filter(
                    (category) => category.category_type === proposal.kind,
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <Field
              label="Amount in PHP"
              name="amount"
              value={proposal.amount}
              required
              maxLength={32}
            />
            <Field
              label="Transaction date"
              name="transactionDate"
              type="date"
              value={proposal.date}
              required
            />
            <Field
              label="Merchant or source (optional)"
              name="merchantOrSource"
              value={proposal.merchantOrSource}
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
        {proposal.kind === "task" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Task title"
              name="title"
              value={proposal.title}
              required
              maxLength={160}
            />
            <Field
              label="Scheduled date (optional; blank goes to Inbox)"
              name="scheduledFor"
              type="date"
              value={proposal.date}
            />
            <Field
              label="Description"
              name="description"
              value={proposal.description}
            />
            <label className="text-muted-foreground block text-xs">
              Priority
              <select
                name="priority"
                defaultValue="medium"
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-muted-foreground block text-xs">
              Energy needed
              <select
                name="energyRequired"
                defaultValue="medium"
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
        )}
        {proposal.kind === "career_application" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company name"
              name="companyName"
              value={proposal.companyName}
              required
              maxLength={160}
            />
            <Field
              label="Role title"
              name="roleTitle"
              value={proposal.roleTitle}
              required
              maxLength={160}
            />
            <Field
              label="Next action"
              name="nextAction"
              value={proposal.title}
              maxLength={160}
            />
            <Field
              label="Date applied"
              name="appliedAt"
              type="date"
              value={proposal.dateRole === "applied" ? proposal.date : null}
            />
            <Field
              label="Next action date"
              name="nextActionAt"
              type="date"
              value={proposal.dateRole === "next_action" ? proposal.date : null}
            />
            <label className="text-muted-foreground block text-xs">
              Stage
              <select
                name="stage"
                defaultValue="interested"
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="interested">Interested</option>
                <option value="preparing">Preparing</option>
                <option value="applied">Applied</option>
              </select>
            </label>
            <label className="text-muted-foreground block text-xs">
              Work setup
              <select
                name="workSetup"
                defaultValue="unspecified"
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="unspecified">Unspecified</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </label>
            <label className="text-muted-foreground block text-xs">
              Employment type
              <select
                name="employmentType"
                defaultValue="unspecified"
                className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="unspecified">Unspecified</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>
            </label>
          </div>
        )}
        {proposal.kind === "knowledge_item" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Concept title"
              name="title"
              value={proposal.title}
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
            <Field
              label="Tags (optional, comma separated)"
              name="tags"
              value=""
              maxLength={500}
            />
            <label className="text-muted-foreground block text-xs sm:col-span-2">
              Learning notes
              <textarea
                name="notes"
                required
                maxLength={10000}
                defaultValue={proposal.notes ?? ""}
                className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2"
              />
            </label>
          </div>
        )}
        <div className="border-border flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" pending={confirming} pendingLabel="Saving…">
            Confirm and save
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={confirming}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
        {confirmState.message && !confirmState.success && (
          <p role="alert" className="text-destructive text-sm">
            {confirmState.message}
          </p>
        )}
      </form>
    </section>
  );
}
