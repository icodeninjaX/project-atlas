/**
 * Whole-run budgets for an Analyst V2 investigation (AI-04). One ledger
 * covers every step: tool rounds and calls, database queries, evidence
 * bytes, provider calls, tokens, estimated cost and the deadline. Capacity
 * for writing and checking the answer is reserved up front, so retrieval can
 * never spend it. The numbers follow roadmap §9.2 and are conservative
 * defaults, not measured values.
 */

export type RunPath = "simple" | "deep";

export type RunBudget = {
  path: RunPath;
  /** Usable time for the whole run, inside the route's platform limit. */
  deadlineMs: number;
  rounds: number;
  toolCalls: number;
  queries: number;
  evidenceBytes: number;
  /** Every provider call: planning, writing, review, repair and fallback. */
  providerCalls: number;
  tokens: number;
  costUsdMicros: number;
  /** Held back for writing, checking and one repair. */
  reserve: {
    timeMs: number;
    providerCalls: number;
    tokens: number;
    costUsdMicros: number;
  };
  /** Worst-case time one retrieval round may take (the tool timeout). */
  roundTimeMs: number;
};

export const RUN_BUDGETS: Record<RunPath, RunBudget> = {
  simple: {
    path: "simple",
    deadlineMs: 54_000,
    rounds: 1,
    toolCalls: 3,
    queries: 72,
    evidenceBytes: 120_000,
    providerCalls: 4,
    tokens: 60_000,
    costUsdMicros: 150_000,
    reserve: {
      timeMs: 28_000,
      providerCalls: 3,
      tokens: 40_000,
      costUsdMicros: 110_000,
    },
    roundTimeMs: 12_000,
  },
  deep: {
    path: "deep",
    deadlineMs: 54_000,
    rounds: 3,
    toolCalls: 8,
    queries: 200,
    evidenceBytes: 240_000,
    providerCalls: 8,
    tokens: 120_000,
    costUsdMicros: 300_000,
    reserve: {
      timeMs: 28_000,
      providerCalls: 3,
      tokens: 60_000,
      costUsdMicros: 180_000,
    },
    roundTimeMs: 12_000,
  },
};

/**
 * The analysis planner's own allowance: one provider call that must finish
 * well inside the run, leaving retrieval and the answer their full budgets.
 */
export const PLANNER_BUDGET: RunBudget = {
  path: "simple",
  deadlineMs: 12_000,
  rounds: 0,
  toolCalls: 0,
  queries: 0,
  evidenceBytes: 0,
  providerCalls: 1,
  tokens: 30_000,
  costUsdMicros: 45_000,
  reserve: { timeMs: 0, providerCalls: 0, tokens: 0, costUsdMicros: 0 },
  roundTimeMs: 0,
};

/**
 * One read after the first draft, for records the draft asked for. It runs
 * on its own small allowance, only when the run still has this much time
 * for the read and the repair that uses it; its usage joins the run ledger.
 */
export const FOLLOW_UP_BUDGET: RunBudget = {
  path: "deep",
  deadlineMs: 8_000,
  rounds: 2,
  toolCalls: 4,
  queries: 60,
  evidenceBytes: 80_000,
  providerCalls: 0,
  tokens: 0,
  costUsdMicros: 0,
  reserve: { timeMs: 0, providerCalls: 0, tokens: 0, costUsdMicros: 0 },
  roundTimeMs: 6_000,
};
export const FOLLOW_UP_MIN_REMAINING_MS = 20_000;

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  rounds: number;
  toolCalls: number;
  queries: number;
  evidenceBytes: number;
  providerCalls: number;
  tokens: number;
  costUsdMicros: number;
};

export type BudgetRefusal =
  | "deadline"
  | "rounds"
  | "tool_calls"
  | "queries"
  | "evidence_bytes"
  | "provider_calls"
  | "tokens"
  | "cost"
  | "cancelled";

export class RunLedger {
  readonly usage: Usage = {
    inputTokens: 0,
    outputTokens: 0,
    rounds: 0,
    toolCalls: 0,
    queries: 0,
    evidenceBytes: 0,
    providerCalls: 0,
    tokens: 0,
    costUsdMicros: 0,
  };
  readonly startedAt: number;

  constructor(
    readonly budget: RunBudget,
    private readonly clock: () => number = Date.now,
    private readonly signal?: AbortSignal,
    /** When the run began, if earlier than this ledger (the planner ran first). */
    startedAt?: number,
  ) {
    this.startedAt = startedAt ?? clock();
  }

  /** Carries another ledger's usage into this one (the planner's). */
  absorb(usage: Usage) {
    this.usage.queries += usage.queries;
    this.usage.evidenceBytes += usage.evidenceBytes;
    this.usage.providerCalls += usage.providerCalls;
    this.usage.inputTokens += usage.inputTokens;
    this.usage.outputTokens += usage.outputTokens;
    this.usage.tokens += usage.tokens;
    this.usage.costUsdMicros += usage.costUsdMicros;
  }

  elapsedMs() {
    return this.clock() - this.startedAt;
  }

  /** Whether another retrieval round of `calls` tool calls fits with the reserve intact. */
  canStartRound(calls: number): BudgetRefusal | null {
    if (this.signal?.aborted) return "cancelled";
    const b = this.budget;
    if (this.usage.rounds >= b.rounds) return "rounds";
    if (this.usage.toolCalls + calls > b.toolCalls) return "tool_calls";
    if (this.elapsedMs() + b.roundTimeMs + b.reserve.timeMs > b.deadlineMs)
      return "deadline";
    if (this.usage.queries >= b.queries) return "queries";
    if (this.usage.evidenceBytes >= b.evidenceBytes) return "evidence_bytes";
    return null;
  }

  /** Whether a planning or proposing provider call fits outside the reserve. */
  canCallProvider(tokens: number, costUsdMicros: number): BudgetRefusal | null {
    if (this.signal?.aborted) return "cancelled";
    const b = this.budget;
    if (
      this.usage.providerCalls + 1 >
      b.providerCalls - b.reserve.providerCalls
    )
      return "provider_calls";
    if (this.usage.tokens + tokens > b.tokens - b.reserve.tokens)
      return "tokens";
    if (
      this.usage.costUsdMicros + costUsdMicros >
      b.costUsdMicros - b.reserve.costUsdMicros
    )
      return "cost";
    if (this.elapsedMs() + b.reserve.timeMs > b.deadlineMs) return "deadline";
    return null;
  }

  /**
   * Whether an answer-stage call (writer, reviewer or repair) fits. These
   * calls may spend the reserve; nothing else may.
   */
  canCallAnswerStage(
    tokens: number,
    costUsdMicros: number,
    timeMs: number,
  ): BudgetRefusal | null {
    if (this.signal?.aborted) return "cancelled";
    const b = this.budget;
    if (this.usage.providerCalls + 1 > b.providerCalls) return "provider_calls";
    if (this.usage.tokens + tokens > b.tokens) return "tokens";
    if (this.usage.costUsdMicros + costUsdMicros > b.costUsdMicros)
      return "cost";
    if (this.elapsedMs() + timeMs > b.deadlineMs) return "deadline";
    return null;
  }

  recordRound(calls: number) {
    this.usage.rounds += 1;
    this.usage.toolCalls += calls;
  }

  recordTool(queries: number, bytes: number) {
    this.usage.queries += queries;
    this.usage.evidenceBytes += bytes;
  }

  /**
   * Records a provider call. Unknown usage is charged at the reserved maximum,
   * because the provider may have processed the request.
   */
  recordProvider(
    usage: {
      tokens: number | null;
      costUsdMicros: number | null;
      inputTokens?: number;
      outputTokens?: number;
    },
    reserved: {
      tokens: number;
      costUsdMicros: number;
      inputTokens?: number;
      outputTokens?: number;
    },
  ) {
    this.usage.providerCalls += 1;
    // Unknown usage is charged at the reserved upper bound, never as zero:
    // the provider may have processed the call.
    this.usage.inputTokens += usage.inputTokens ?? reserved.inputTokens ?? 0;
    this.usage.outputTokens += usage.outputTokens ?? reserved.outputTokens ?? 0;
    this.usage.tokens += usage.tokens ?? reserved.tokens;
    this.usage.costUsdMicros += usage.costUsdMicros ?? reserved.costUsdMicros;
  }

  /** What remains for writing and checking once retrieval stops. */
  remainingForAnswer() {
    const b = this.budget;
    return {
      timeMs: Math.max(0, b.deadlineMs - this.elapsedMs()),
      providerCalls: b.providerCalls - this.usage.providerCalls,
      tokens: b.tokens - this.usage.tokens,
      costUsdMicros: b.costUsdMicros - this.usage.costUsdMicros,
    };
  }
}
