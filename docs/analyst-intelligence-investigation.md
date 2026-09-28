# Analyst Intelligence — AI-04 Bounded Investigation

Phase AI-04 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-03 conversation context](analyst-intelligence-conversation.md).

| Field               | Value                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                                     |
| Starting commit     | `42c6d44` (AI-03) on `claude/gifted-gauss-p02yki`                                                                                            |
| Legacy path         | Unchanged.                                                                                                                                   |
| Live provider calls | None. The proposer used here is deterministic; a model-backed proposer plugs into the same interface and is charged against the same budget. |
| Migrations          | None.                                                                                                                                        |

## 1. Components

| File              | Responsibility                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| `brief.ts`        | Validates an AnalysisBrief before any analysis, as described below                  |
| `budgets.ts`      | `RunLedger`: one run-level budget (§2)                                              |
| `orchestrator.ts` | `runInvestigation`: the server-controlled loop (§3)                                 |
| `proposer.ts`     | `capabilityProposer`: a deterministic proposer, the fallback and the reference (§4) |
| `evidence.ts`     | `selectEvidence`: selection that is requirement- and coverage-aware (§5)            |

`checkBrief` in `brief.ts`:

- checks the schema;
- requires every resolved entity to be an authorized handle;
- requires every capability ID to be in the manifest;
- sorts each requirement into `supported`, `unsupported`, `not_authorized`
  (consent or route) or `temporarily_unavailable`, before any retrieval;
- chooses the simple or deep path. A single lookup never takes the deep path.

## 2. Run budget (roadmap §9.2)

| Limit                                         | Simple                              | Deep                                |
| --------------------------------------------- | ----------------------------------- | ----------------------------------- |
| Retrieval rounds                              | 1                                   | 3                                   |
| Tool calls                                    | 3                                   | 8                                   |
| Database queries                              | 72                                  | 200                                 |
| Retrieved evidence bytes                      | 120,000                             | 240,000                             |
| Provider calls (all stages)                   | 3                                   | 7                                   |
| Tokens / estimated cost ceiling               | 40,000 / $0.12                      | 90,000 / $0.25                      |
| Usable deadline                               | 50 s                                | 50 s                                |
| Reserved for writing, checking and one repair | 26 s, 2 calls, 30,000 tokens, $0.10 | 26 s, 3 calls, 45,000 tokens, $0.16 |

- **Before each round,** the elapsed time plus one worst-case round (the 12 s
  tool timeout) plus the reserve must fit inside the deadline.
- **Before each proposer provider call,** its tokens and cost must fit outside
  the reserve.
- **Unknown provider usage** is charged at the reserved maximum.
- **These are conservative defaults, not measurements.** AI-07 tunes them from
  baseline runs.

## 3. The investigation loop

On each round:

1. **Stop** when every supported essential requirement has evidence, or when
   the proposer asks for a clarification (an ambiguous name).
2. **Propose.** A model-backed proposer's call is budgeted first.
3. **Validate every proposed call.** A call is rejected if it:
   - is not an allowlisted V2 tool;
   - has input that does not match its schema;
   - names a requirement that does not exist;
   - serves only requirements that are blocked (unsupported or excluded);
   - does not serve a requirement that still lacks evidence (not material);
   - uses a handle this run has not seen (only the brief's authorized entities
     and handles that tools returned are allowed);
   - repeats an earlier call.

   Rejections are logged with a reason and never reach a tool.

4. **Fit the call budget.** Calls beyond it are dropped and logged.
5. **Run the round.** Accepted calls run concurrently. A dependent call can
   only be proposed in a later round, after its input was returned and
   validated.
6. **Re-assess.** Each requirement becomes `evidenced`, `partial`, `missing`
   or `blocked`. A round that adds nothing and changes nothing ends the loop
   (`no_progress`).

The loop also stops on the round limit, tool calls, queries, evidence bytes,
the deadline, provider calls, tokens, cost or cancellation.

The result carries:

- a status: `ready`, `partial`, `insufficient`, `clarification_required` or
  `cancelled`;
- the stop reason, per-requirement progress and typed unresolved reasons
  (`unsupported_capability`, `excluded_by_consent`, `insufficient_evidence`,
  `operational_failure`);
- the selection, owner-only labels and candidates;
- a call log and rejections;
- usage and the capacity left for the answer;
- an as-of record with each source's retrieval time. Reads are sequential,
  not one snapshot, and the result says so.

Results are request-scoped and held in memory for one run; nothing is cached
across requests or owners.

## 4. Deterministic proposer

`capabilityProposer` maps required capabilities onto V2 tools and follows the
evidence:

- **Money capabilities** read the complete aggregate for each period in the
  brief.
- **Entity capabilities** first resolve the name. If the match is ambiguous,
  the run stops for a clarification.
- **Once resolved**, the goal context, Graph paths or details are read. Task
  details use the task handles that paths returned.
- **A decision related to a goal** is reached through the goal's paths. The
  proposer waits for the goal to resolve rather than searching decisions by
  the question text.

## 5. Evidence selection

The legacy route fell back when evidence exceeded 16 items. `selectEvidence`
instead:

- removes exact duplicates and restatements of the same value, keeping one
  item for all the requirements it serves;
- groups evidence by requirement and measure, and gives each distinct
  categorical state (task status "completed" or "todo") its own group, listed
  first;
- lets requirements take turns, and groups within a requirement take turns,
  up to the item and byte limits (simple: 20 items or 30 KB; deep: 40 items or
  60 KB);
- returns labeled scopes, so goal evidence and whole-domain context appear
  side by side and are never merged;
- keeps each selected item's limitations and says how many items were left
  out.

## 6. Required tests

All tests are in `orchestrator.test.ts`. They run the real V2 tools against
the two-owner fixture emulator.

| Requirement                                                                  | Result                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependent sequence: resolve goal, then linked tasks, then related decision   | Round 1 resolve; round 2 goal context and paths; round 3 decision context. Result `ready` in 3 rounds and 4 calls                                                                |
| Enough evidence at first means no extra retrieval                            | Q01: one round, one call, simple path, `sufficient`                                                                                                                              |
| Counterevidence survives selection                                           | Q58 with a 10-item limit: the overdue task's `todo` status is kept beside the completed linked work                                                                              |
| A repeated request stops without looping                                     | Second round rejected as `duplicate`; stop `no_progress` after one call                                                                                                          |
| Large result sets give aggregates or explicit incompleteness                 | The 1,501-row month is complete through the aggregate; an oversized aggregate becomes `insufficient` with `insufficient_evidence`                                                |
| Multiple scopes stay labeled                                                 | Q20: goal, whole-domain and category-cohort scopes are separate, and goal requirement evidence stays in the goal scope                                                           |
| At least three development cases need dependent retrieval and are answerable | Q13, Q14 and Q58 are `ready` within budget, in two or more rounds, with no failed calls                                                                                          |
| Every call is owner-authorized and allowlisted                               | Unlisted tools, bad input, another owner's handle and unknown requirements are rejected with no read                                                                             |
| Budget and deadline                                                          | The run stops before round 3 with `deadline`, and at least the 26 s reserve remains; a model proposer that would eat the reserve stops with `tokens`; cancellation reads nothing |
| Clarification                                                                | Two "Acme Synthetic" applications stop the run with both candidates                                                                                                              |

## 7. Validation

| Command                | Result                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run lint`         | Pass                                                                   |
| `npm run typecheck`    | Pass                                                                   |
| `npm run test`         | 138 files passed, 4 skipped; 842 tests passed, 29 skipped (AI-03: 826) |
| `npm run format:check` | Pass                                                                   |
| `npm run build`        | Pass                                                                   |

Not run: a real database, browser tests and live models.

## 8. Known limits and next phase

- No model proposer exists yet. When one is added, its proposals pass through
  the same validation and budget.
- The proposer covers V2 tools only. Legacy-only capabilities (Signals, task
  ranking, associations and scenarios) still need adapters to be reachable
  here.
- Evidence counts toward the budget by bytes retrieved, not by tokens sent;
  token accounting for the writer arrives with AI-05.
- The time budget assumes the platform's 60-second route limit; this module
  does not change `maxDuration`.

**Next phase: AI-05** — semantic review, completeness repair and supported
recommendations over the claim ledger.
