"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  confirmCaptureBatchItemAction,
  interpretCaptureBatchAction,
  rejectCaptureBatchItemAction,
  type BatchConfirmResult,
  type BatchInterpretState,
} from "@/lib/capture/batch-actions";
import type { BatchCaptureItem } from "@/lib/capture/batch";
import type { CaptureSource } from "@/lib/capture/media";
import { MAX_CAPTURE_FILE_BYTES } from "@/lib/capture/media";

type Account = { id: string; name: string; account_type: string };
type Category = { id: string; name: string; category_type: string };
type ModelOption = { id: string; label: string; pool: "small" | "large" };

const initial: BatchInterpretState = { message: "", batchId: null, items: [] };

function unique<T>(values: T[], check: (value: T) => boolean) {
  const matches = values.filter(check);
  return matches.length === 1 ? matches[0] : undefined;
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
  maxLength,
  sourceSnippet,
}: {
  label: string;
  name: string;
  value?: string | null;
  type?: string;
  required?: boolean;
  maxLength?: number;
  sourceSnippet?: string | null;
}) {
  return (
    <label className="text-muted-foreground block text-xs">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        maxLength={maxLength}
        className="border-border bg-background focus-visible:ring-ring mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2"
      />
      {sourceSnippet && (
        <span className="mt-1 block text-xs">Source: “{sourceSnippet}”</span>
      )}
    </label>
  );
}

export function CaptureBatchWorkspace({
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
  const [state, action, interpreting] = useActionState(
    interpretCaptureBatchAction,
    initial,
  );
  const [visibleBatch, setVisibleBatch] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, BatchConfirmResult>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<CaptureSource | null>(null);
  const [textKind, setTextKind] = useState<"typed" | "email">("typed");
  const [extracting, setExtracting] = useState(false);
  const [sourceMessage, setSourceMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const items =
    state.batchId && state.batchId !== visibleBatch ? state.items : [];
  const pending = items.filter((item) => item.id && !results[item.id]);

  async function extractFile() {
    const file = fileRef.current?.files?.[0];
    if (!file || extracting) return;
    if (file.size > MAX_CAPTURE_FILE_BYTES) {
      setSourceMessage("Choose a file under 4 MB.");
      return;
    }
    setExtracting(true);
    setSourceMessage("Reading your file…");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        text?: string;
        source?: CaptureSource;
        message?: string;
      };
      if (!response.ok || !result.text || !result.source) {
        setSourceMessage(result.message ?? "Could not read that file.");
        return;
      }
      setText(result.text);
      setSource(result.source);
      setVisibleBatch(state.batchId);
      setSourceMessage(
        result.text.length > 1000
          ? "Text extracted. Keep the relevant 1,000 characters before previewing."
          : "Text extracted. Correct anything misread before previewing.",
      );
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setSourceMessage(
        "Could not read that file. Try again or type the details.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function save(item: BatchCaptureItem) {
    if (!item.id || busy) return;
    const form = document.getElementById(
      `capture-form-${item.id}`,
    ) as HTMLFormElement | null;
    if (!form || !form.reportValidity()) return;
    setBusy(true);
    try {
      const result = await confirmCaptureBatchItemAction(new FormData(form));
      setResults((current) => ({ ...current, [item.id!]: result }));
      setSummary(result.message);
    } catch {
      setSummary(
        "Connection interrupted. Check the record before previewing or saving again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    if (busy || pending.length === 0) return;
    setBusy(true);
    try {
      let saved = 0;
      for (const item of pending) {
        const form = document.getElementById(
          `capture-form-${item.id}`,
        ) as HTMLFormElement | null;
        if (!form || !form.reportValidity()) {
          setSummary(
            `${saved} saved. Complete the next card before continuing.`,
          );
          break;
        }
        const result = await confirmCaptureBatchItemAction(new FormData(form));
        setResults((current) => ({ ...current, [item.id!]: result }));
        if (!result.success) {
          setSummary(
            `${saved} saved. ${result.message} Later cards remain unsaved.`,
          );
          break;
        }
        saved += 1;
        setSummary(`${saved} saved. Continuing through the reviewed cards…`);
      }
      if (saved === pending.length)
        setSummary(`${saved} reviewed action${saved === 1 ? "" : "s"} saved.`);
    } catch {
      setSummary(
        "Connection interrupted. Check saved records before continuing. Later cards remain unsaved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reject(item: BatchCaptureItem) {
    if (!item.id || busy) return;
    setBusy(true);
    try {
      const result = await rejectCaptureBatchItemAction(item.id);
      setResults((current) => ({ ...current, [item.id!]: result }));
      setSummary(result.message);
    } catch {
      setSummary(
        "Connection interrupted. Refresh the page to check this proposal.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form
        action={action}
        className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6"
      >
        <div className="space-y-3">
          <label htmlFor="capture-file" className="block text-sm font-semibold">
            Photo, document, or voice note
          </label>
          <input
            ref={fileRef}
            id="capture-file"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.mp3,.m4a,.mp4,.wav,.webm,image/*,audio/*"
            className="border-border bg-background block w-full rounded-xl border p-2 text-sm"
          />
          <p className="text-muted-foreground text-xs">
            On mobile, choose Camera or Files. Files up to 4 MB. ATLAS does not
            store the original file.
          </p>
          <Button
            type="button"
            disabled={extracting || interpreting}
            onClick={extractFile}
          >
            {extracting ? "Reading file…" : "Extract text"}
          </Button>
          {sourceMessage && (
            <p role="status" className="text-muted-foreground text-sm">
              {sourceMessage}
            </p>
          )}
        </div>
        <label
          htmlFor="capture-text-kind"
          className="block text-sm font-semibold"
        >
          Text source
        </label>
        <select
          id="capture-text-kind"
          value={source?.kind === "email" ? "email" : textKind}
          onChange={(event) => {
            const kind = event.target.value as "typed" | "email";
            setTextKind(kind);
            setSource(
              kind === "email"
                ? {
                    kind: "email",
                    label: "Copied email",
                    method: "copied",
                    digest: null,
                  }
                : null,
            );
            setVisibleBatch(state.batchId);
          }}
          className="border-border bg-background min-h-11 w-full rounded-xl border px-3 text-sm sm:max-w-sm"
        >
          <option value="typed">Typed or pasted text</option>
          <option value="email">Copied email</option>
        </select>
        {source && (
          <div className="border-border bg-muted/40 rounded-xl border p-3 text-sm">
            <p>
              Source: {source.label} · {source.method}
            </p>
            <button
              type="button"
              className="text-primary mt-1 underline"
              onClick={() => {
                setText("");
                setSource(null);
                setTextKind("typed");
                setSourceMessage("Source and extracted text removed.");
                setVisibleBatch(state.batchId);
              }}
            >
              Remove source and text
            </button>
          </div>
        )}
        <label htmlFor="capture-text" className="block text-sm font-semibold">
          What happened?
        </label>
        {source && (
          <p className="text-muted-foreground text-xs">
            Review and correct extracted text before previewing.
          </p>
        )}
        <textarea
          id="capture-text"
          name="text"
          value={text}
          required
          minLength={8}
          maxLength={1000}
          placeholder="Paid ₱380 for groceries using GCash, then remind me to call Acme tomorrow"
          onChange={(event) => {
            setText(event.target.value);
            setVisibleBatch(state.batchId);
          }}
          className="border-border bg-background focus-visible:ring-ring min-h-28 w-full resize-y rounded-xl border px-3 py-3 text-base outline-none focus-visible:ring-2"
        />
        {source && (
          <input type="hidden" name="source" value={JSON.stringify(source)} />
        )}
        <label htmlFor="capture-model" className="block text-sm font-semibold">
          AI model
        </label>
        <select
          id="capture-model"
          name="model"
          defaultValue={defaultModel}
          disabled={interpreting}
          onChange={() => setVisibleBatch(state.batchId)}
          className="border-border bg-background focus-visible:ring-ring min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 sm:max-w-sm"
        >
          {models.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.id === defaultModel ? " (default)" : ""} ·{" "}
              {option.pool === "small" ? "Small" : "Large"} pool
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Your text or selected file is sent to OpenAI only when you request
          extraction or a preview. Eligible API inputs and outputs may be shared
          with OpenAI depending on your API project settings; standard charges
          may apply.
        </p>
        <Button
          type="submit"
          pending={interpreting}
          pendingLabel="Interpreting…"
        >
          Preview actions
        </Button>
        {state.message && items.length === 0 && (
          <p role="status" className="text-muted-foreground text-sm">
            {state.message}
          </p>
        )}
      </form>

      {items.length > 0 && (
        <section aria-label="Capture review" className="space-y-4">
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
            <h2 className="text-lg font-semibold">
              Review all {items.length} proposals
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Correct any field. Each card saves independently. Confirm all
              saves in order and stops at the first incomplete or failed card;
              earlier saves remain saved.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={busy || pending.length === 0}
                onClick={saveAll}
              >
                Confirm all {pending.length} remaining
              </Button>
              <span className="text-muted-foreground text-xs">
                Nothing is saved until you confirm.
              </span>
            </div>
            {summary && (
              <p role="status" className="mt-3 text-sm">
                {summary}
              </p>
            )}
          </div>
          {items.map((item, index) => (
            <CaptureCard
              key={item.id ?? `${index}-unsupported`}
              item={item}
              index={index}
              accounts={accounts}
              categories={categories}
              result={item.id ? results[item.id] : undefined}
              busy={busy}
              onSave={() => save(item)}
              onReject={() => reject(item)}
            />
          ))}
        </section>
      )}

      <div className="border-border bg-muted/30 rounded-2xl border p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Use a manual form</h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/money/transactions?create=true"
            className="text-primary underline"
          >
            Income or expense
          </Link>
          <Link href="/money/transfers" className="text-primary underline">
            Account transfer
          </Link>
          <Link href="/debts" className="text-primary underline">
            Debt payment
          </Link>
          <Link href="/tasks" className="text-primary underline">
            Task
          </Link>
          <Link href="/career" className="text-primary underline">
            Career application
          </Link>
          <Link href="/knowledge" className="text-primary underline">
            Knowledge item
          </Link>
        </div>
      </div>
    </div>
  );
}

function CaptureCard({
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
  return (
    <article className="border-primary/30 bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
      <div>
        <p className="text-primary text-xs font-semibold uppercase">
          {index + 1}.{" "}
          {item.operation === "reschedule_task"
            ? "Move task"
            : proposal.kind.replaceAll("_", " ")}
        </p>
        <p className="mt-1 text-sm font-medium">“{item.sourcePhrase}”</p>
        {item.source && (
          <p className="text-muted-foreground mt-1 text-xs">
            {item.source.label} · {item.source.method} · line{" "}
            {item.sourceLine ?? 1} of corrected text · {proposal.confidence}{" "}
            confidence
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">
          {result ? result.message : "Review and correct before saving."}
        </p>
      </div>
      {proposal.warnings.length > 0 && !result && (
        <ul className="border-border bg-muted/50 list-disc space-y-1 rounded-xl border p-3 pl-7 text-sm">
          {proposal.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {!item.id && (
        <p role="status" className="text-muted-foreground text-sm">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-muted-foreground block text-xs">
                Task
                <select
                  name="taskId"
                  required
                  defaultValue={item.targetId ?? ""}
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
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
                </select>
              </label>
              <Field
                label="New scheduled date"
                name="scheduledFor"
                type="date"
                value={proposal.date}
                sourceSnippet={item.source && proposal.dateText}
                required
              />
              {item.candidates.length === 0 && (
                <p className="text-muted-foreground text-sm sm:col-span-2">
                  No matching open task was found. Use the Tasks page or
                  rephrase its title.
                </p>
              )}
            </div>
          ) : null}
          {money && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-muted-foreground block text-xs">
                Account
                <select
                  name="accountId"
                  required
                  defaultValue={account?.id ?? ""}
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
                >
                  <option value="">Choose account</option>
                  {accounts.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.name}
                    </option>
                  ))}
                </select>
                {item.source && proposal.accountText && (
                  <span className="mt-1 block text-xs">
                    Source: “{proposal.accountText}”
                  </span>
                )}
              </label>
              <label className="text-muted-foreground block text-xs">
                Category
                <select
                  name="categoryId"
                  required
                  defaultValue={category?.id ?? ""}
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3 text-sm"
                >
                  <option value="">Choose category</option>
                  {categories
                    .filter((value) => value.category_type === proposal.kind)
                    .map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name}
                      </option>
                    ))}
                </select>
              </label>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Task title"
                name="title"
                value={proposal.title}
                sourceSnippet={item.source && proposal.title}
                required
                maxLength={160}
              />
              <Field
                label="Scheduled date (optional)"
                name="scheduledFor"
                type="date"
                value={proposal.date}
                sourceSnippet={item.source && proposal.dateText}
              />
              <Field
                label="Description"
                name="description"
                value={proposal.description}
                maxLength={300}
              />
              <label className="text-muted-foreground block text-xs">
                Priority
                <select
                  name="priority"
                  defaultValue="medium"
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
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
              <label className="text-muted-foreground block text-xs">
                Stage
                <select
                  name="stage"
                  defaultValue="interested"
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3"
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
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3"
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
                  className="border-border bg-background mt-1.5 min-h-11 w-full rounded-xl border px-3"
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
              <label className="text-muted-foreground block text-xs sm:col-span-2">
                Learning notes
                <textarea
                  name="notes"
                  required
                  maxLength={10000}
                  defaultValue={proposal.notes ?? ""}
                  className="border-border bg-background mt-1.5 min-h-28 w-full rounded-xl border px-3 py-2 text-base"
                />
                {item.source && proposal.notes && (
                  <span className="mt-1 block text-xs">
                    Source: “{proposal.notes}”
                  </span>
                )}
              </label>
            </div>
          )}
          {item.source && (money || proposal.date) && (
            <label className="border-border bg-muted/40 flex items-start gap-3 rounded-xl border p-3 text-sm">
              <input
                type="checkbox"
                name="reviewedSource"
                value="yes"
                required
                className="mt-1"
              />
              <span>
                I checked the extracted amount and date, where present, against
                the source text.
              </span>
            </label>
          )}
          <div className="border-border flex flex-wrap gap-2 border-t pt-4">
            <Button type="submit" disabled={busy}>
              Confirm this action
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
        </form>
      )}
      {result && (
        <p role="status" className="text-sm">
          {result.status === "saved"
            ? "Saved"
            : result.status === "rejected"
              ? "Rejected"
              : "Not saved"}
          : {result.message}
        </p>
      )}
    </article>
  );
}
