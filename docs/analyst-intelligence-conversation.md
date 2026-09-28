# Analyst Intelligence — AI-03 Conversation Context

Phase AI-03 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-02 data policy and tools](analyst-intelligence-data-access.md).

| Field               | Value                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                     |
| Starting commit     | `47e1429` (AI-02) on `claude/gifted-gauss-p02yki`                                                                            |
| Legacy path         | Unchanged. The legacy freeform route keeps its client-held `history` of two exchanges.                                       |
| Live provider calls | None. Follow-up interpretation is deterministic and makes no model call.                                                     |
| Migrations          | None. Context is session-scoped and client-held.                                                                             |
| New configuration   | `ATLAS_ANALYST_CONTEXT_KEY`: 32 bytes, base64, server-only. Without it, V2 context is disabled and every turn is standalone. |

## 1. Architecture decision: session-scoped, sealed, client-held

The roadmap allows server-held session context or encrypted,
integrity-protected, expiring tokens, and warns that a token that is only
signed does not hide its contents. AI-03 uses **AES-256-GCM tokens**
(`context.ts`):

- **Sealed:** the browser holds the token but can neither read nor change it.
  The test confirms the owner ID does not appear in the token bytes.
- **Owner-bound:** the owner ID is authenticated data. A token opened by
  another account fails exactly like a tampered token, so switching accounts
  never inherits context.
- **Expiring:** two hours from the last turn, and at most 20 turns before a
  fresh conversation starts.
- **Tied to consent:** each token records the consent fingerprint. Any
  narrowing or revocation opens as `consent_changed`, and the context is
  discarded.
- **Aggregates only:** findings keep aggregate cited values and at most 300
  characters of the claim wording, used only to find the claim a user refers
  to. Private text never enters the context (tested).
- **Bounded:** at most 10 entities, 4 periods, 8 assumptions, 12 findings,
  6 suggestions, 6 unresolved requirements and a 16,000-character token.

Persistent threads are **not** built. They would need a table, retention,
export and deletion design, and a migration, so they are recorded as a
future option. A new conversation is `newConversation()`. After sign-out
there is no signed-in owner to open a token for; the workspace must still
drop its token (AI-06 UI).

## 2. What the context keeps

| Field                   | Purpose                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entities`              | Resolved handles with how they were resolved (`selected`, `confirmed`, `exact_match`, `context`). They are re-authorized every turn.                                 |
| `periods`               | The periods the next analysis should use, with their basis.                                                                                                          |
| `assumptions`           | Keyed scenario or conversational values with their origin (`user_stated`, `user_confirmed`, `disclosed_default`) and the turn they were set.                         |
| `findings`              | References to verified claims: requirement IDs, aggregate cited values (metric, scope, period, value) and assumption keys. These are prior conclusions, not records. |
| `recommendations`       | Analyst suggestions, labelled `analyst_suggestion`, never stored as user preferences or assumptions.                                                                 |
| `unresolved`            | Open essential requirements from the last answer.                                                                                                                    |
| `pendingClarification`  | The question being clarified, plus either owner-authorized candidates or the assumption being proposed.                                                              |
| `topic`, `lastQuestion` | The current subject's domains and the question a follow-up re-asks.                                                                                                  |

## 3. Turn interpretation

`classifyTurn` (in `turns.ts`) is deterministic and knows English and
Filipino/Taglish phrasings:

| Kind                                        | Examples                                                               | Effect (`applyTurn`)                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `select_candidate`                          | "The second one", "2", "yung pangatlo", a candidate's name             | Selects that handle and answers the **original** clarified question                                                |
| `confirm_assumption` / `decline_assumption` | "Yes", "Oo", "Sige" / "No", "Hindi"                                    | Confirms only the proposed assumption                                                                              |
| `why`                                       | "Why?", "Bakit?"                                                       | Targets the latest suggestion, else the latest finding, and marks it for re-reading                                |
| `change_period`                             | "What about last month?", "e noong nakaraang buwan?", "And last week?" | Keeps the entities and topic and replaces only the period                                                          |
| `change_assumption`                         | "And 30%?", "use ₱45,000 instead"                                      | Changes one assumption and keeps the others                                                                        |
| `correction`                                | "That amount was wrong…", "You said the opposite earlier"              | Updates a conversational assumption when a value is given; marks the finding for re-reading; never writes a record |
| `refresh`                                   | "Is that still true?"                                                  | Re-reads the last turn's findings                                                                                  |
| `same_topic` / `new_topic`                  | References such as "it", "those", or a new subject                     | A new topic clears entities, periods, assumptions and open questions                                               |
| `needs_clarification`                       | "Why?" with no context                                                 | Asks rather than guesses                                                                                           |

`resolvePeriod` resolves last month, this month, last week, this week, last
quarter and named months in Asia/Manila. "May" counts as a month only after
"in", "of", "for" or "noong", or with a year.

**Re-checking before reuse.** `reauthorizeContext` re-reads every carried
handle through the V2 details tool (`authorizeHandlesV2`) on every turn. A
deleted record and another owner's record are both removed, together with a
pending choice that offered them. An outage throws rather than silently
dropping context. `explainChange` compares a finding's cited values with
freshly read evidence and reports one of `unchanged`, `data_changed`,
`assumption_changed`, `scope_changed`, `source_unavailable` or `prior_error`.

**Request bounds** (`parseV2Request`): a question of up to 4,000 characters,
a 24,000-byte request, and no extra fields such as an owner. A message under
eight characters needs a valid context.

## 4. Required conversation tests

All in `src/lib/analyst/intelligence/conversation.test.ts`.

| #   | Requirement                                  | Result                                                                                                                                       |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Goal question, then "What about last month?" | Goal kept; period becomes 2026-08-01 to 2026-08-31; the original question is re-asked                                                        |
| 2   | Scenario, then "And 30%?"                    | Income change becomes 30; the ₱2,000 extra payment is kept                                                                                   |
| 3   | Ambiguous entity, then a candidate choice    | "The second one" selects the second candidate and answers "How is my main goal going?"; Filipino ordinal and name selection work             |
| 4   | Recommendation, then "Why?"                  | Targets the recorded `analyst_suggestion` and marks it for re-reading; no assumption is created                                              |
| 5   | "That amount was wrong"                      | Changes the `monthly_income_pesos` assumption to 45,000 and records nothing else                                                             |
| 6   | New topic                                    | Money focus, entities and periods cleared for the career question                                                                            |
| 7   | Source edited or deleted between turns       | A deleted task handle is dropped; an edited transaction reports `data_changed` from ₱11,000.00 to ₱11,200.00 via a real re-read              |
| 8   | Tampered or cross-owner context              | Tampered, other-owner, wrong-key, expired and consent-changed tokens are all rejected; another owner's handle is dropped on re-authorization |
| —   | More than two short exchanges                | "Why?", "What about last month?", "And last week?" and "Is that still true?" in a row keep the goal                                          |

## 5. Validation

| Command                | Result                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run lint`         | Pass                                                                   |
| `npm run typecheck`    | Pass                                                                   |
| `npm run test`         | 137 files passed, 4 skipped; 826 tests passed, 29 skipped (AI-02: 809) |
| `npm run format:check` | Pass                                                                   |
| `npm run build`        | Pass                                                                   |

Not run: a real database, browser tests and live models. Nothing in this phase
calls a model.

## 6. Known limits

- The interpreter covers the phrasings above. Other phrasings fall back to
  `same_topic`, or to a clarification when the message is short. AI-04 should
  let the planner propose a reading, which these rules then validate.
- Assumption keys (`income_change_percent`, `monthly_income_pesos`,
  `extra_debt_payment_pesos`) are conversational. AI-04 maps them onto
  scenario tool inputs.
- No route or UI uses the token yet; the V2 route and workspace arrive in
  AI-04 and AI-06.

**Next phase: AI-04** — a bounded investigative controller: the analysis
brief, dependent tool calls, requirement-aware evidence selection and one
whole-run budget, using this context as its starting point.
