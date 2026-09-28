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
    deadlineMs: 50_000,
    rounds: 1,
    toolCalls: 3,
    queries: 72,
    evidenceBytes: 120_000,
    providerCalls: 3,
    tokens: 40_000,
    costUsdMicros: 120_000,
    reserve: {
      timeMs: 26_000,
      providerCalls: 2,
      tokens: 30_000,
      costUsdMicros: 100_000,
    },
    roundTimeMs: 12_000,
  },
  deep: {
    path: "deep",
    deadlineMs: 50_000,
    rounds: 3,
    toolCalls: 8,
    queries: 200,
    evidenceBytes: 240_000,
    providerCalls: 7,
    tokens: 90_000,
    costUsdMicros: 250_000,
    reserve: {
      timeMs: 26_000,
      providerCalls: 3,
      tokens: 45_000,
      costUsdMicros: 160_000,
    },
    roundTimeMs: 12_000,
  },
};

export type Usage = {
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
  ) {
    this.startedAt = clock();
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
    usage: { tokens: number | null; costUsdMicros: number | null },
    reserved: { tokens: number; costUsdMicros: number },
  ) {
    this.usage.providerCalls += 1;
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
