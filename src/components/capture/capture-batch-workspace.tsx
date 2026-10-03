"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ClipboardCheck,
  Cpu,
  FileText,
  FileUp,
  Image as ImageIcon,
  Landmark,
  Lock,
  Mail,
  PenLine,
  ReceiptText,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
  Chip,
  KindTile,
  chipTones,
  eyebrowClass,
  glassCardClass,
  selectClass,
  understoodKinds,
} from "./capture-chrome";
import { CaptureCard } from "./capture-review-card";

type Account = { id: string; name: string; account_type: string };
type Category = { id: string; name: string; category_type: string };
type ModelOption = { id: string; label: string; pool: "small" | "large" };

const initial: BatchInterpretState = { message: "", batchId: null, items: [] };

const MAX_TEXT = 1000;

const manualForms = [
  {
    href: "/money/transactions?create=true",
    label: "Income or expense",
    icon: ReceiptText,
  },
  { href: "/money/transfers", label: "Account transfer", icon: ArrowLeftRight },
  { href: "/debts", label: "Debt payment", icon: Landmark },
  { href: "/tasks?create=true", label: "Task", icon: ClipboardCheck },
  { href: "/career", label: "Career application", icon: BriefcaseBusiness },
  { href: "/knowledge", label: "Knowledge item", icon: BookOpen },
] as const;

const examples = [
  "Paid ₱380 for groceries using GCash",
  "Remind me to call Acme tomorrow",
  "Applied for Product Designer at Acme today",
] as const;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const steps = [
  { key: "describe", label: "Describe", icon: PenLine },
  { key: "review", label: "Review", icon: ScanText },
  { key: "done", label: "Saved", icon: CheckCheck },
] as const;

/** Where the capture stands: describing, reviewing, or every card handled. */
function CaptureSteps({ stage }: { stage: (typeof steps)[number]["key"] }) {
  const current = steps.findIndex((step) => step.key === stage);
  return (
    <ol
      aria-label="Capture progress"
      className="bg-card/60 ring-border/70 flex items-center gap-1 rounded-full p-1 ring-1 backdrop-blur sm:gap-1.5"
    >
      {steps.map(({ key, label, icon: Icon }, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={key}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none sm:gap-1.5"
          >
            <span
              className={cn(
                "flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors sm:px-3.5",
                active &&
                  "bg-primary-solid text-primary-solid-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_4px_14px_-6px_color-mix(in_srgb,var(--primary-solid)_70%,transparent)]",
                done && "text-positive",
                !active && !done && "text-muted-foreground",
              )}
            >
              {done ? (
                <Check aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{label}</span>
              {done && <span className="sr-only"> (done)</span>}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px w-5 sm:block",
                  done ? "bg-positive/50" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [chosenFile, setChosenFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const reviewRef = useRef<HTMLElement>(null);

  // Bring a fresh set of proposals into view; the composer sits above them.
  useEffect(() => {
    if (!state.batchId) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    reviewRef.current?.scrollIntoView?.({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [state.batchId]);

  function syncChosenFile() {
    const file = fileRef.current?.files?.[0];
    setChosenFile(file ? { name: file.name, size: file.size } : null);
    setSourceMessage("");
  }

  function clearChosenFile() {
    if (fileRef.current) fileRef.current.value = "";
    setChosenFile(null);
    setSourceMessage("");
  }
  const items =
    state.batchId && state.batchId !== visibleBatch ? state.items : [];
  const pending = items.filter((item) => item.id && !results[item.id]);
  const handled = items.filter((item) => item.id && results[item.id]);
  const savedCount = handled.filter(
    (item) => results[item.id!]?.status === "saved",
  ).length;
  const rejectedCount = handled.filter(
    (item) => results[item.id!]?.status === "rejected",
  ).length;
  const stage =
    items.length === 0 ? "describe" : pending.length > 0 ? "review" : "done";
  const kind = source?.kind === "email" ? "email" : textKind;
  const overLimit = text.length > MAX_TEXT;

  function chooseKind(next: "typed" | "email") {
    setTextKind(next);
    setSource(
      next === "email"
        ? {
            kind: "email",
            label: "Copied email",
            method: "copied",
            digest: null,
          }
        : null,
    );
    setVisibleBatch(state.batchId);
  }

  function addExample(example: string) {
    setText((current) => {
      const base = current.trim();
      return (base ? `${base}. ${example}` : example).slice(0, MAX_TEXT);
    });
    setVisibleBatch(state.batchId);
    textRef.current?.focus();
  }

  function startOver() {
    setText("");
    setSource(null);
    setTextKind("typed");
    setSummary("");
    setSourceMessage("");
    setVisibleBatch(state.batchId);
    textRef.current?.focus();
  }

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
      setChosenFile(null);
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
    <div className="mt-6 grid items-start gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
      <div className="min-w-0 space-y-5 sm:space-y-6">
        <CaptureSteps stage={stage} />

        <form
          action={action}
          aria-label="Capture"
          data-spotlight
          className={cn(
            glassCardClass,
            "bg-card isolate overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:rounded-[2rem]",
          )}
        >
          <div
            aria-hidden="true"
            className="from-primary/12 pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b to-transparent"
          />
          <div
            aria-hidden="true"
            className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-80 rounded-full bg-violet-400/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
          />

          <div className="space-y-5 p-4 min-[360px]:p-5 sm:p-7">
            <div className="flex flex-col gap-4 @lg:flex-row @lg:items-start @lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="from-primary via-primary/70 relative grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br to-violet-500/80 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_12px_28px_-12px_color-mix(in_srgb,var(--primary)_90%,transparent)]"
                >
                  <Sparkles className="size-[1.15rem]" />
                </span>
                <div className="min-w-0">
                  <p className={eyebrowClass}>01 · Describe</p>
                  <label
                    htmlFor="capture-text"
                    className="mt-0.5 block text-[1.0625rem] leading-6 font-semibold tracking-[-0.02em] sm:text-lg"
                  >
                    What happened?
                  </label>
                  <p className="text-muted-foreground mt-0.5 text-[13px] leading-5">
                    Up to five actions, in your own words.
                  </p>
                </div>
              </div>
              <div
                role="group"
                aria-label="Text source"
                className="bg-background/60 ring-border/80 grid shrink-0 grid-cols-2 gap-1 rounded-xl p-1 ring-1"
              >
                {(
                  [
                    { value: "typed", label: "Typed or pasted", icon: PenLine },
                    { value: "email", label: "Copied email", icon: Mail },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    onClick={() => chooseKind(value)}
                    className={cn(
                      "focus-visible:ring-ring flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      kind === value
                        ? "bg-card text-foreground ring-border/80 shadow-[0_1px_2px_rgb(7_10_15/0.08)] ring-1"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {source && (
              <div className="bg-primary/[0.06] ring-primary/20 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl px-3.5 py-2.5 text-sm ring-1">
                <p className="flex min-w-0 items-center gap-2">
                  <ScanText
                    aria-hidden="true"
                    className="text-primary size-4 shrink-0"
                  />
                  <span className="min-w-0 truncate">
                    Source: {source.label} · {source.method}
                  </span>
                </p>
                <button
                  type="button"
                  className="text-primary focus-visible:ring-ring inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => {
                    setText("");
                    setSource(null);
                    setTextKind("typed");
                    setSourceMessage("Source and extracted text removed.");
                    setVisibleBatch(state.batchId);
                  }}
                >
                  <X aria-hidden="true" className="size-3.5" />
                  Remove source and text
                </button>
              </div>
            )}

            <div className="bg-background/60 ring-border/80 focus-within:ring-ring/70 hover:ring-primary/30 rounded-2xl ring-1 transition-[box-shadow,background-color] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_12%,transparent)]">
              {source && (
                <p className="text-muted-foreground px-4 pt-3 text-xs">
                  Review and correct extracted text before previewing.
                </p>
              )}
              <textarea
                ref={textRef}
                id="capture-text"
                name="text"
                value={text}
                required
                minLength={8}
                maxLength={MAX_TEXT}
                aria-describedby="capture-text-count"
                placeholder="Paid ₱380 for groceries using GCash, then remind me to call Acme tomorrow"
                onChange={(event) => {
                  setText(event.target.value);
                  setVisibleBatch(state.batchId);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    // requestSubmit skips the disabled Preview button, so
                    // apply its rules here: one preview at a time, in limit.
                    if (interpreting || overLimit) return;
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="placeholder:text-muted-foreground/70 block min-h-36 w-full resize-y bg-transparent px-4 py-3.5 text-base leading-7 outline-none sm:min-h-40 sm:text-[1.0625rem]"
              />
              <div className="flex items-center justify-between gap-3 px-4 pb-3">
                <p className="text-muted-foreground hidden text-[11px] sm:block">
                  <kbd className="bg-background ring-border rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1">
                    Ctrl
                  </kbd>{" "}
                  or{" "}
                  <kbd className="bg-background ring-border rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1">
                    ⌘
                  </kbd>{" "}
                  +{" "}
                  <kbd className="bg-background ring-border rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1">
                    Enter
                  </kbd>{" "}
                  to preview
                </p>
                <p
                  id="capture-text-count"
                  className={cn(
                    "ml-auto font-mono text-[11px] tabular-nums",
                    overLimit || text.length > MAX_TEXT * 0.9
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground",
                  )}
                >
                  {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
                  <span className="sr-only"> characters</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(eyebrowClass, "mr-1")}>Try</span>
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => addExample(example)}
                  className="bg-background/55 ring-border/80 text-foreground/85 hover:ring-primary/40 hover:bg-primary/[0.06] focus-visible:ring-ring max-w-full truncate rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <label htmlFor="capture-file" className={eyebrowClass}>
                  Photo, document, or voice note
                </label>
                <span
                  aria-hidden="true"
                  className="from-border h-px min-w-6 flex-1 bg-gradient-to-r to-transparent"
                />
              </div>
              {/* The native input stays for labels, forms and the mobile
                  Camera/Files sheet; the drop zone below is what people use. */}
              <input
                ref={fileRef}
                id="capture-file"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.mp3,.m4a,.mp4,.wav,.webm,image/*,audio/*"
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
                onChange={syncChosenFile}
              />
              <div className="flex flex-col gap-2 @md:flex-row @md:items-stretch">
                {chosenFile ? (
                  <div className="bg-background/60 ring-primary/25 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 ring-1">
                    <span className="bg-primary/10 text-primary ring-primary/20 grid size-10 shrink-0 place-items-center rounded-xl ring-1">
                      <FileUp aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {chosenFile.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          chosenFile.size > MAX_CAPTURE_FILE_BYTES
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatFileSize(chosenFile.size)}
                        {chosenFile.size > MAX_CAPTURE_FILE_BYTES
                          ? " · over the 4 MB limit"
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${chosenFile.name}`}
                      disabled={extracting}
                      onClick={clearChosenFile}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      if (!fileRef.current || !event.dataTransfer.files.length)
                        return;
                      fileRef.current.files = event.dataTransfer.files;
                      syncChosenFile();
                    }}
                    className={cn(
                      "group border-border bg-background/40 hover:border-primary/60 hover:bg-primary/[0.04] focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-dashed p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      dragging && "border-primary bg-primary/[0.06]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 -space-x-2"
                    >
                      {[ImageIcon, FileText, AudioLines].map((Icon, i) => (
                        <span
                          key={i}
                          className="bg-card text-primary ring-border/80 grid size-9 place-items-center rounded-xl ring-1 transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none"
                          style={{ transitionDelay: `${i * 40}ms` }}
                        >
                          <Icon className="size-4" />
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        Choose a file
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        <span className="hidden sm:inline">
                          or drop it here ·{" "}
                        </span>
                        Image, PDF, text, or audio
                      </span>
                    </span>
                  </button>
                )}
                <Button
                  type="button"
                  variant={chosenFile ? "default" : "secondary"}
                  disabled={!chosenFile || extracting || interpreting}
                  onClick={extractFile}
                  className="@md:h-auto @md:min-h-16 @md:rounded-2xl"
                >
                  <ScanText aria-hidden="true" className="size-4" />
                  {extracting ? "Reading file…" : "Extract text"}
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px] leading-4">
                On mobile, choose Camera or Files. Files up to 4 MB. ATLAS does
                not store the original file.
              </p>
              {sourceMessage && (
                <p role="status" className="text-muted-foreground text-sm">
                  {sourceMessage}
                </p>
              )}
            </div>
          </div>

          {source && (
            <input type="hidden" name="source" value={JSON.stringify(source)} />
          )}

          <div className="border-border/70 bg-background/30 space-y-3 border-t p-4 min-[360px]:p-5 sm:px-7">
            <div className="flex flex-col gap-3 @md:flex-row @md:items-end @md:justify-between">
              <div className="min-w-0 @md:w-72">
                <label
                  htmlFor="capture-model"
                  className="text-foreground/85 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Cpu aria-hidden="true" className="text-primary size-3.5" />
                  AI model
                </label>
                <select
                  id="capture-model"
                  name="model"
                  defaultValue={defaultModel}
                  disabled={interpreting}
                  onChange={() => setVisibleBatch(state.batchId)}
                  className={selectClass}
                >
                  {models.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.id === defaultModel ? " (default)" : ""} ·{" "}
                      {option.pool === "small" ? "Small" : "Large"} pool
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={overLimit}
                pending={interpreting}
                pendingLabel="Interpreting…"
                className="rounded-2xl"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                Preview actions
              </Button>
            </div>
            <p className="text-muted-foreground flex items-start gap-2 text-[11px] leading-4">
              <Lock aria-hidden="true" className="mt-px size-3 shrink-0" />
              <span>
                Your text or selected file is sent to OpenAI only when you
                request extraction or a preview. Eligible API inputs and outputs
                may be shared with OpenAI depending on your API project
                settings; standard charges may apply.
              </span>
            </p>
            {state.message && items.length === 0 && (
              <p
                role="status"
                className="bg-background/60 ring-border/80 rounded-xl px-3 py-2.5 text-sm ring-1"
              >
                {state.message}
              </p>
            )}
          </div>
        </form>

        {items.length > 0 && (
          <section
            ref={reviewRef}
            aria-label="Capture review"
            className="scroll-mt-6 space-y-4"
          >
            <div
              data-spotlight
              className={cn(
                glassCardClass,
                "overflow-hidden p-4 min-[360px]:p-5 sm:p-6",
              )}
            >
              <div
                aria-hidden="true"
                className="via-primary/45 pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
              />
              <div className="flex flex-col gap-4 @xl:flex-row @xl:items-start @xl:justify-between">
                <div className="min-w-0">
                  <p className={eyebrowClass}>02 · Review</p>
                  <h2 className="mt-0.5 text-[1.0625rem] leading-6 font-semibold tracking-[-0.02em] sm:text-lg">
                    Review all {items.length} proposals
                  </h2>
                  <p className="text-muted-foreground mt-1 max-w-xl text-[13px] leading-5 text-pretty">
                    Correct any field. Each card saves independently. Confirm
                    all saves in order and stops at the first incomplete or
                    failed card; earlier saves remain saved.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Chip className={chipTones.primary}>
                    {pending.length} to review
                  </Chip>
                  {savedCount > 0 && (
                    <Chip className={chipTones.positive}>
                      {savedCount} saved
                    </Chip>
                  )}
                  {rejectedCount > 0 && (
                    <Chip className={chipTones.neutral}>
                      {rejectedCount} rejected
                    </Chip>
                  )}
                </div>
              </div>

              <div
                aria-hidden="true"
                className="mt-4 flex h-1.5 gap-1 overflow-hidden rounded-full"
              >
                {items.map((item, index) => {
                  const status = item.id ? results[item.id]?.status : null;
                  return (
                    <span
                      key={item.id ?? `${index}-unsupported`}
                      className={cn(
                        "flex-1 rounded-full transition-colors duration-500",
                        !item.id && "bg-muted",
                        item.id && !status && "bg-primary/25",
                        status === "saved" && "bg-positive",
                        status === "rejected" && "bg-muted-foreground/40",
                        (status === "failed" || status === "unavailable") &&
                          "bg-destructive",
                      )}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
                {pending.length > 0 ? (
                  <Button
                    type="button"
                    disabled={busy || pending.length === 0}
                    onClick={saveAll}
                  >
                    <CheckCheck aria-hidden="true" className="size-4" />
                    Confirm all {pending.length} remaining
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={startOver}>
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Capture something else
                  </Button>
                )}
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <ShieldCheck
                    aria-hidden="true"
                    className="text-primary size-3.5 shrink-0"
                  />
                  Nothing is saved until you confirm.
                </span>
              </div>
              {summary && (
                <p
                  role="status"
                  className="bg-background/60 ring-border/80 mt-3 rounded-xl px-3 py-2.5 text-sm ring-1"
                >
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
      </div>

      <aside
        aria-label="Capture guide"
        className="min-w-0 space-y-5 lg:sticky lg:top-8"
      >
        <section
          aria-labelledby="capture-understands"
          data-spotlight
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <p className={eyebrowClass}>Guide</p>
          <h2
            id="capture-understands"
            className="mt-0.5 text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            What Capture understands
          </h2>
          <ul className="mt-3.5 space-y-3">
            {understoodKinds.map(({ label, example, icon, tone }) => (
              <li key={label} className="flex items-start gap-3">
                <KindTile icon={icon} tone={tone} size="sm" />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-5 font-medium">{label}</p>
                  <p className="text-muted-foreground text-xs leading-4">
                    {example}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-border/70 mt-4 space-y-2 border-t pt-4">
            {[
              "Nothing saves until you confirm each card.",
              "Every field stays editable before saving.",
              "Original files are never stored.",
            ].map((line) => (
              <p
                key={line}
                className="text-muted-foreground flex items-start gap-2 text-xs leading-4"
              >
                <Check
                  aria-hidden="true"
                  className="text-positive mt-px size-3.5 shrink-0"
                />
                {line}
              </p>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="capture-manual"
          data-spotlight
          className={cn(glassCardClass, "p-4 min-[360px]:p-5")}
        >
          <p className={eyebrowClass}>Prefer a form?</p>
          <h2
            id="capture-manual"
            className="mt-0.5 text-[0.9375rem] font-semibold tracking-[-0.01em]"
          >
            Use a manual form
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-2 lg:grid-cols-1">
            {manualForms.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group bg-background/55 ring-border/80 hover:ring-primary/40 hover:bg-primary/[0.05] focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Icon
                  aria-hidden="true"
                  className="text-primary size-4 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
