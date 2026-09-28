# Analyst Intelligence — AI-06 Communication, Model Controls and Interface

Phase AI-06 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-05 semantic review](analyst-intelligence-review.md).

| Field               | Value                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                                                        |
| Starting commit     | AI-05 on `claude/gifted-gauss-p02yki`                                                                                                                           |
| Legacy path         | Unchanged. `/api/analyst/freeform` and the legacy workspace are untouched. With the flag off, `/analyst` renders exactly what it did before.                    |
| Flag                | `ATLAS_ANALYST_V2=1` (server-only). With it off, `/api/analyst/v2` returns 404 and the page shows the legacy workspace.                                         |
| Live provider calls | None made. Every V2 test uses scripted provider responses through a stubbed `fetch`. An opt-in live writer check exists (§8) but has not been run.              |
| Pool feature        | V2 reserves the existing `freeform` quota and meters writer, reviewer and repair calls as `analyst_answer`. No new feature names, since those need a migration. |
| Migrations          | None.                                                                                                                                                           |

## 1. End-to-end run (`run.ts`)

`runAnalystV2(input, deps)` connects the AI-01 to AI-05 components into one
request:

1. Open the sealed conversation context (AI-03) and reauthorize every entity
   in it for the signed-in owner under the current consent.
2. Classify the turn (new topic, follow-up, period change, reference) and
   apply it to the previous brief.
3. Build the brief deterministically (§2) and run `checkBrief`.
4. Investigate under one shared `RunLedger` (AI-04). The capability proposer
   picks tools from the manifest, and every round emits a safe progress event.
5. If a reference is unresolved, return clarification candidates instead of
   guessing.
6. Derive rankings, differences, percent changes and contributions from
   complete evidence (`derive.ts`), so the writer never computes them.
7. Synthesize with the writer, reviewer and repair loop (AI-05).
8. Present the answer (§4), record the turn, seal the new context and build
   follow-up suggestions (§5).

The response includes `presentation`, `candidates`, `suggestions`, `models`,
`context` and `contextNotice`. Outcome and token usage are used for quota
settlement and removed from the body.

## 2. Planner: deterministic by design

The brief comes from `deterministicBrief` (`planning.ts`), not from a model.
It maps the intent to domain requirements through the capability manifest.
Periods come from the plan, from a named period in the question, or from
disclosed default aligned periods. Entities come only from the reauthorized
context. The response records the planner as
`{requested: "deterministic", resolved: "deterministic"}`, so metadata never
claims a model planned the answer. A model planner can replace it later
without changing the contract.

## 3. Model controls

- **The chosen model writes.** The picker's selection becomes the writer
  model. A test asserts the writer request body carries it.
- **The reviewer stays configured.** The reviewer is always `AI_MODELS.planner`.
- **Metadata.** `models.planner`, `models.writer` and `models.reviewer` each
  record `{requested, resolved}` separately. `resolved` is the model the
  provider reported, or null when no call succeeded.
- **Fallback.** When the chosen writer's free pool is used up
  (`pool_exhausted`, refused before anything is sent), the default
  `AI_MODELS.analyst` writes instead. One limitation is added, for example
  "GPT-6 Sol's free daily allowance is used up, so GPT-4o mini wrote this
  answer. It resets at 8:00 AM Manila time." A test asserts it appears
  exactly once.
- **The UI** reuses the existing `ModelPicker` and pool display and shows
  "Written by {label}." from the resolved model.

## 4. Language and presentation

- **Language** (`language.ts`). `detectLanguage` returns `en` or `fil-en`
  (Filipino/Taglish). Interface text, progress labels, unresolved reasons and
  follow-up templates exist in both. Money is always shown as `₱1,234.56`.
  Dates use Filipino month abbreviations in `fil-en`.
- **Safety does not depend on English wording.** Comparisons are checked
  from the claim's structured `comparison` and cited derived facts. A test
  shows a Taglish direction word ("tumaas") cannot bypass structured
  comparison validation (`response.test.ts`, with the verb forms "tumaas"
  and "bumaba").
- **Style.** `detectStyle` recognizes concise, "N sentences", detailed and
  table requests, and adapts the default to the intent: short for lookups,
  full for explanations and plans.
- **Order** (`presentation.ts`). The direct answer comes first, then
  findings, options (with the trade-off, constraints and next action), then
  limitations, unresolved items, verification and sources.
- **Sentence caps keep critical caveats.** A cap such as "three sentences"
  reserves room for a caveat that affects the conclusion. When content is
  dropped, a visible `shortened` note says so.
- **Limitations stay visible.** Limitations that affect the conclusion are
  never collapsed.
- **Verification is split** into figures (deterministic checks), review
  (semantic review completed, not required or unavailable) and freshness.
  It never claims "100%" or "fully accurate", and `run.test.ts` asserts
  this.

## 5. Follow-up suggestions (`follow-ups.ts`)

Suggestions come from:

- unresolved requirements;
- a period sensitivity check;
- the largest contributor;
- a recommendation's next step.

Each suggestion must:

- map to a capability in the manifest whose domain the consent allows;
- be referential (for example "that category") only when the sealed context
  that resolves it will be sent with it;
- differ from the current question.

At most three are shown. Clicking one sends it with the current context
token, and a test asserts the context is preserved.

## 6. Progress (`progress.ts`)

Progress is reported as stages plus a round number:

- understanding;
- reading and assessing, with a round and domain names;
- writing, checking, reviewing and repairing.

Reading can happen again in a later round, so the UI shows the current stage
rather than a checklist that implies retrieval is finished. `safeProgress`
passes only the `type`, `stage`, `round` and `domains` keys, so no record
text, percentage or reasoning reaches the stream. A test checks every event
against that allowlist.

## 7. Route and interface

**`POST /api/analyst/v2`** checks, in order:

| Check                                         | Response |
| --------------------------------------------- | -------- |
| Flag off                                      | 404      |
| Not signed in                                 | 401      |
| Oversized body                                | 413      |
| Malformed body or unknown fields              | 400      |
| Consent missing, earlier version or malformed | 400      |
| Unknown model                                 | 400      |
| Short message ("Why?") without context        | 400      |
| No OpenAI key                                 | 503      |
| Quota reservation returns a limit status      | 429      |

Nothing is reserved until every earlier check has passed. The response is
streamed as NDJSON progress lines and a final result. The stream stops if
the client disconnects. `finish_ai_analyst_request` settles the outcome and
tokens in `after()`.

**`IntelligenceWorkspace`** is shown when the flag is on and the user is
signed in. The page calls `connection()`, so the flag and the user are read on
each request and never baked into a prerender. The workspace provides:

- **Consent.** A per-area consent gate lists the `describeConsent` lines,
  including that private notes are never sent on the current route. Consent
  is stored per user under `atlas:analyst-consent-v2:{userId}`.
- **Controls.** "New conversation" and "Stop sharing" both drop the context
  token. "Stop sharing" also removes the stored consent.
- **Existing controls** are kept: the model picker, the pool display and
  privacy mode. Peso figures in claims, trade-offs, limitations and
  unresolved items are masked with the same `SensitiveValue` as the legacy
  workspace.
- **Links.** Sources and recommendation next steps are links to ATLAS pages.
- **Keyboard and motion.** Focus returns to the composer after each answer,
  and Enter submits. The progress dot animates only under
  `motion-safe`.

### Layout check

The server-rendered `AnswerCard` was loaded in Chromium with the built
stylesheet. The fixture used long source paths, long `₱` figures, a long
recommendation and several limitations.

| Width   | Page-level horizontal overflow |
| ------- | ------------------------------ |
| 320 px  | None                           |
| 360 px  | None                           |
| 390 px  | None                           |
| 430 px  | None                           |
| 1280 px | None                           |

A 320 px screenshot was inspected visually. This checked the card's layout
with mocked content only. It is not a signed-in browser run, and a polished
card is not evidence that the model reasoning path works.

## 8. Tests

Mocked-response tests and real-provider tests are reported separately.

**Mocked (run, passing):**

| Suite                                 | Covers                                                                                                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run.test.ts` (10)                    | The chosen model reaches the writer. The planner is recorded as deterministic. A fallback is disclosed once. A follow-up period change. "Three sentences" keeps its caveat. Taglish. Suggestions. A short message without context. A context notice. Safe progress. |
| `api/analyst/v2/route.test.ts` (5)    | Flag, sign-in, consent version, unknown model and extra fields, a short message without context, and a used-up allowance (429 with no analysis run)                                                                                                                 |
| `intelligence-workspace.test.tsx` (4) | The consent gate, the request body (consent, model, context), visible limits and trade-offs, "Written by", suggestion continuity, focus restoration, privacy masking, new conversation and stop sharing                                                             |
| `response.test.ts` (extended)         | Taglish direction verbs ("tumaas", "bumaba") are rejected without, or against, a structured comparison                                                                                                                                                              |

**Real provider (opt-in, not run):** `writer.live.eval.test.ts` sends one
metered writer request per model in the picker, using synthetic aggregates.
For each model it logs:

- whether the model accepted the strict JSON schema;
- which model the provider reported;
- how many claims passed the deterministic checks.

It asserts no quality threshold. It runs only with
`ATLAS_ANALYST_V2_LIVE_EVALS=1`, an OpenAI key and the pool meter. **It has
not been run, because no paid or pool-metered evaluation was authorized.**
The claim that every picker model supports the writer's structured output is
therefore **unverified**.

## 9. Validation

| Command                | Result                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run lint`         | Pass                                                                                                         |
| `npm run typecheck`    | Pass                                                                                                         |
| `npm run test`         | 142 files passed, 6 skipped. 874 tests passed, 37 skipped (the 7 new skips are the opt-in live writer check) |
| `npm run format:check` | Pass                                                                                                         |
| `npm run build`        | Pass                                                                                                         |

## 10. Known limits and next phase

- **Planner.** The brief is deterministic. Questions outside the manifest's
  intents get a disclosed partial answer rather than a model-planned one.
- **Tables.** A table request is recognized, but the writer schema still
  returns `table: null`. Table-style answers are rendered as findings.
- **Live model support is unverified** until the opt-in writer check is
  authorized and run (§8).
- **Pool metering.** V2 shares the `freeform` quota and the `analyst_answer`
  pool feature. Separate labels need a migration.
- **Browser checks.** No signed-in browser run and no two-owner database run
  was done. Both belong to AI-07.

**Next phase: AI-07** — held-out evaluation, fault injection, quota and
token settlement checks, signed-in browser and two-owner database runs, and a
release evidence report. Production enablement stays behind the server flag,
with explicit authorization.
