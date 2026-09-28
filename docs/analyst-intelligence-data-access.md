# Analyst Intelligence — AI-02 Data Policy and Read Tools

Phase AI-02 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-01 contracts](analyst-intelligence-contracts.md).

| Field               | Value                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                                                                                                      |
| Starting commit     | `7253380` (AI-01) on `claude/gifted-gauss-p02yki`                                                                                                                                                             |
| Legacy path         | Unchanged. The legacy tool registry, planner catalog, freeform route and consent notice are untouched.                                                                                                        |
| Shared-code change  | `createToolTransport` accepts an optional `policy` (table allowlist, query and row budgets, historical bucket limit, caller pagination). Without it, behavior is identical; legacy tool tests pass unchanged. |
| Live provider calls | None. Nothing in AI-02 calls a model.                                                                                                                                                                         |
| Migrations          | None. Money totals reuse the existing `runway_monthly_totals` aggregate.                                                                                                                                      |
| Sensitive narrative | Implemented but not reachable in production: the only provider route is treated as sharing, so private text is neither retrieved for a provider nor sent.                                                     |

## 1. AI-02A — data policy and capability manifest

`src/lib/analyst/intelligence/policy.ts`

- **Field profiles:**
  - `aggregate`: figures, counts, dates.
  - `basic_context`: record names and titles.
  - `sensitive_narrative`: reflections, notes, decision text and career notes.

  Every EvidenceV2 item now carries a consent `domain` and its profile in
  `sharing.route`.

- **Versioned consent (`CONSENT_VERSION = "2"`)** covers provider processing,
  domains and profiles. An earlier or malformed consent counts as none. The
  legacy one-choice notice maps to `legacyEquivalentConsent`: all domains,
  aggregates only, which matches what that notice promised.
- **Provider routes.** `SHARED_ROUTE` is the only route today. Its project is
  documented as sharing traffic for complimentary tokens, which ATLAS has not
  verified, so it accepts aggregates only. A non-sharing route appears only when
  `ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED=1` and a separate
  `OPENAI_NON_SHARING_API_KEY` are both configured. Neither exists, and nothing
  in the code creates one.
- **Checking the whole payload.** `filterProviderPayload` applies consent and
  route to everything a planner, writer, critic or repair call would receive:
  evidence, owner labels and history turns. A history turn is dropped whole if
  any of its content is no longer allowed. `assertProviderPayload` throws when
  anything ineligible remains; it is meant to run immediately before sending.
- **Revocation.** `consentFingerprint` changes when consent narrows, and
  `contextValidFor` rejects context built under an older fingerprint. AI-03
  must store the fingerprint with any cached context.
- **Disclosure.** `describeConsent` produces plain-language lines saying what
  is sent, what is never sent, and that the current route shares data with
  OpenAI.

`src/lib/analyst/intelligence/capabilities.ts`

- `CAPABILITY_MANIFEST` has 26 entries covering every domain in roadmap §6.1.
  Each lists its tools, supported history, unsupported inferences and field
  profile. Explicitly unsupported: budget variance, past goal progress, Capture
  provenance, settings preferences and structured follow-up context.
- `analystCapabilities` turns an entry into `not_authorized` when consent or
  the route excludes it, and `temporarily_unavailable` when all its tools are
  down. It reveals no records or schema.
- Every capability the AI-00 corpus uses maps to a manifest or process entry
  (tested).

## 2. AI-02B — entity discovery and numeric detail tools

A separate V2 registry (`src/lib/analyst/intelligence/tools/`), so the legacy
planner catalog does not change. `invokeAnalystToolV2` works as follows:

- It derives identity from the session.
- It reads only through the owner's RLS client and the bounded transport. The
  V2 allowlist is the legacy tables plus the decision tables and
  `knowledge_reviews`; Capture previews are never readable.
- It refuses to run without current consent.
- It validates every output with the EvidenceV2 schema.

Its limits are 48 queries, 4,000 rows, a 96 KB output and a 12-second
timeout.

| Tool                      | What it returns                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resolveAnalystEntities`  | The owner's records whose names equal, are mentioned in, or contain a phrase, with the match basis and an `ambiguous` flag. It never picks one. Names are owner-only labels.                                                                                       |
| `searchAnalystRecords`    | One cursor page, by ID, of one type's records whose names contain a phrase. It is labelled as never being a total or ranking.                                                                                                                                      |
| `getAnalystRecordDetails` | Current facts for up to ten handles: status, priority, dates (each bound to its own date), progress, balance, stage, dated application events, review counts and scores. Weekly-review reflections are returned only for the sensitive profile when policy allows. |
| `getMoneyBreakdown`       | Every category's total, plus the period total, from the `runway_monthly_totals` aggregate as one complete set. Category names are labels, not evidence text. If the aggregate exceeds its 500-group bound, the result is withheld as `partial`.                    |
| `getGoalAnalysisContext`  | Goal status, current progress, milestone counts, and the existing goal-linked activity adapter's evidence, all in the goal's scope.                                                                                                                                |

**Handles** are `type:uuid`. They carry no authority: every tool reads them
with the owner filter. A foreign or unknown handle returns the same
"unavailable" result, which does not say whether the record exists.

## 3. AI-02C — decisions and connected context

| Tool                         | What it returns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getDecisionAnalysisContext` | Decision and review dates, counts of revisions and observations, and observation sources that can no longer be read. The review state is one of `review_date_not_reached`, `comparison_available`, `comparison_insufficient_history` or `no_metric`. When a comparison is available, it gives before and after values from the existing `decisionComparisonWindow` and `compareDecisionHistory`, with no new calculation. With `includeText` and policy approval it adds the original plan (read from the earliest revision, so an edit cannot erase it), the current plan, and observations as self-reported excerpts. |
| `getRelationshipPaths`       | Paths up to two hops from the existing one-hop Graph service. It keeps native or manual provenance and marks links as current only. It reports cycle cuts, and each record appears once. Limits are 40 nodes, 80 edges and five expansions, with decisions and goals expanded first. Output is `partial` when truncated.                                                                                                                                                                                                                                                                                                |

Review and knowledge excerpts go through the `sensitive_narrative` profile
only. Unconfirmed Capture previews are outside every tool.

## 4. Required tests

All tests run the real tool code and the real transport against an in-memory
PostgREST (`evaluation/postgrest.ts`) seeded from the AI-00 two-owner fixtures.

| Roadmap requirement                                                               | Result                                                                                                                                    | Test                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Two owners with identical goal names stay isolated                                | Each owner resolves only their own goal                                                                                                   | `tools/server.test.ts`                   |
| An ambiguous title gives owner-only candidates                                    | Both "Acme Synthetic" roles, `ambiguous: true`; "my main goal" resolves to nothing                                                        | `tools/server.test.ts`                   |
| A 1,501-row aggregate is complete or withheld                                     | The bulk month ranks groceries over all rows, reading fewer than ten rows; an oversized aggregate is withheld as `partial`                | `tools/server.test.ts`                   |
| A private note with tool instructions cannot alter the allowlist                  | The injected reflection comes back as an attributed excerpt only when allowed; the registry is unchanged; the shared route filters it out | `tools/server.test.ts`                   |
| A decision revision cannot erase the original plan                                | The original plan ("two free evenings") appears beside the current one ("three")                                                          | `tools/server.test.ts`                   |
| Unknown IDs, foreign IDs, duplicates, oversized input, SQL-like handles           | `invalid_input` before any read, or the same unavailable result for foreign and unknown IDs                                               | `tools/server.test.ts`                   |
| Turning off a domain affects planner, writer, critic, repair and history payloads | Revoked evidence and history removed at every stage; asserting the unfiltered payload throws                                              | `policy.test.ts`                         |
| Excluded text never reaches a provider                                            | Names and private text are removed on the shared route even with consent                                                                  | `policy.test.ts`, `tools/server.test.ts` |
| Money totals reconcile with the AI-00 expected facts                              | ₱1,900.00 change across categories, with the dining and groceries tie                                                                     | `tools/server.test.ts`                   |

## 5. Validation

| Command                | Result                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run lint`         | Pass                                                                   |
| `npm run typecheck`    | Pass                                                                   |
| `npm run test`         | 136 files passed, 4 skipped; 809 tests passed, 29 skipped (AI-01: 782) |
| `npm run format:check` | Pass                                                                   |
| `npm run build`        | Pass                                                                   |

Not run:

- `npm run supabase:test` and a real database. The emulator models the
  owner filter and the security-invoker aggregate, not RLS itself, so real
  two-owner RLS checks remain an AI-07 gate.
- End-to-end browser tests.
- Live models.

## 6. Blockers and known limits

1. **Activation blocker:** the provider route's sharing configuration is
   assumed, not verified, and no non-sharing project exists. Names and
   private text therefore stay out of every provider payload.
2. **Activation blocker:** consent version 2 has no server-side storage and no
   UI yet. The legacy notice still governs the legacy route. Storing consent
   per user needs an additive migration, which requires authorization.
3. Budget variance, past goal progress, Capture provenance and preferences
   remain unsupported, and the manifest says so.
4. The emulator does not model PostgREST's exact query-string grammar beyond
   the filters these tools use.
5. `getRelationshipPaths` may stop before visiting every second-hop record;
   the result is then `partial`.

**Next phase: AI-03** — structured conversation context: session-scoped,
reauthorized entity handles; periods and assumptions carried between turns;
"Why?", candidate selection, period changes, scenario updates, corrections
and topic shifts; and invalidation of stored context by the consent
fingerprint.
