# OpenAI free daily token pools

ATLAS runs its OpenAI features inside OpenAI's complimentary daily tokens for
traffic shared with OpenAI
([help article](https://help.openai.com/en/articles/10306912), reviewed
2026-09-27). This page records what the offer covers, how ATLAS stays inside
it, and what to change when the account's tier or the offer changes.

## What the offer covers

- **Opt-in:** an organization owner enables "Share inputs and outputs with
  OpenAI" in the data-sharing settings, for ATLAS's project only. The page
  then reads "You're enrolled for complimentary daily tokens". Only traffic on
  projects with sharing enabled is free.
- **Two separate pools, each shared by its models.** Usage tiers 1–2 get
  250K tokens a day for the large models and 2.5M for the small models
  (tiers 3–5: 1M and 10M). The exact model IDs are in `src/lib/ai/pools.ts`
  and in `public.ai_pool_for_model` in the database.
- **Reset:** 00:00 UTC, which is 08:00 in Asia/Manila.
- **Counted:** input and output tokens, including reasoning tokens.
- **Not covered:** fine-tuned models, fine-tuning, evals and OpenAI-hosted tool
  use. ATLAS uses structured JSON output only. Audio transcription
  (`gpt-transcribe`) is outside the offer and is billed normally.
- **Overage:** the request that would take the day's total past the limit is
  billed in full at standard rates. A positive balance is still required.
- **Privacy:** OpenAI may use shared inputs and outputs to improve its models.
  Analyst sends compact evidence (figures, periods and metric names), never
  task titles or notes; its consent notice says so.
- OpenAI gives 30 days' notice before ending the program.

## How ATLAS stays inside the pools

- **Exact model IDs only.** An alias can move to a snapshot that is not on the
  list, so pooled features send exact IDs. The Analyst quota function accepts
  only the seven chat models.
- **A daily meter per pool** (`supabase/migrations/20260927155626_openai_free_pools.sql`):
  - `ai_pool_limits` holds each pool's daily tokens and ATLAS's stop ratio
    (0.9, so ATLAS stops at 225K and 2.25M).
  - Before every pooled call, `meteredOpenAIFetch` (`src/lib/ai/pool-meter.ts`)
    reserves the request's largest possible size with
    `reserve_ai_pool_tokens`: the prompt's bytes (an upper bound on its tokens)
    plus its output cap, or a fixed ceiling for images (≈52K) and PDFs (200K).
    Reservations are serialized per pool, so two requests cannot both take the
    last room.
  - If the reservation would pass the stop point, the call is refused and
    nothing reaches OpenAI.
  - Reserving and settling run only with the server's service-role key
    (`SUPABASE_SERVICE_ROLE_KEY`), for the account the request verified. A
    signed-in account cannot call them, so it cannot fill a pool without an
    OpenAI request or settle a reservation below its real usage. Without the
    key, pooled calls are refused and nothing is sent.
  - After the call, `settle_ai_pool_tokens` records the reported usage. A
    rejected request settles at zero; a timeout or unreadable usage keeps the
    full reservation, since OpenAI may still have billed it.
  - `ai_pool_status` reports today's use for the Analyst model picker.
- **Every pooled caller is metered:** the Analyst planner and answers, the
  preset Analyst route, the weekly insight, Capture (single, batch and media).
- **Cost ceilings** (`ANSWER_COST_CEILING_USD_MICROS`): an Analyst explanation
  attempt may cost at most $0.06 (small pool) or $0.08 (large pool) at
  standard rates, which bounds a billed attempt if the meter were ever wrong.
  Prices for every offered model are in `AI_MODEL_PRICING`.

When a pool is refused:

- Analyst with a large-pool model falls back to GPT-4o mini and says so in the
  answer's notes. With the small pool used up, it shows the verified facts
  only.
- The weekly insight keeps the week open and prepares it on a later visit.
- Capture asks the user to use a manual form until the reset.

## OpenAI's own count

With `OPENAI_ADMIN_KEY` set (an API Platform organization admin key, server
only), ATLAS also reads today's usage from OpenAI's organization Usage API
(`/v1/organization/usage/completions`, grouped by model and service tier) and
records it per pool (`supabase/migrations/20260927170000_openai_provider_usage.sql`):

- The meter counts the larger of its own ledger and OpenAI's figure plus the
  reservations made since 15 minutes before that figure was read (usage data
  lags). Usage the meter never saw now counts: requests before it existed, the
  Playground, and other apps on the organization.
- The figure refreshes when it is more than five minutes old, before the
  picker shows its meters and before the next pooled call is sent. That call
  then releases its first reservation and reserves again against the fresh
  figure, so usage outside the meter cannot let it cross the limit. The
  refresh adds one Usage API call at most every five minutes; if it fails,
  the ledger decision stands.
- Refreshes are coalesced: callers in one server instance share a single
  in-flight refresh, and across instances only the caller that claims it
  (`claim_ai_pool_provider_sync`) calls the Usage API and releases the claim
  when it finishes. The others wait until its figure lands or its claim
  ends (released, or lapsed after 15 seconds), then keep their ledger
  decision if no fresh figure arrived.
- A failed check on another instance's claim keeps the caller waiting; it
  only gives up when a fresh figure lands, the claim is released, or the wait
  outlasts the claim. After a failed refresh (a revoked admin key, say), each
  server instance keeps the ledger decision for a minute before asking
  OpenAI again.
- A replaced reservation must be released first; if the release fails,
  nothing is sent and the first reservation stays counted.
- `OPENAI_PROJECT_ID` (optional) narrows the count to ATLAS's project. Without
  it the whole organization counts, which can only stop ATLAS sooner.
- Without the admin key, or when OpenAI cannot be reached, the meter keeps
  using its ledger alone.
- `ai_pool_provider_usage.details` keeps the per-model and service-tier
  breakdown for review, including any usage OpenAI reports outside the free
  tier.

## Limits of the meter

- Without the admin key it counts only ATLAS's traffic. Keep other apps off
  ATLAS's OpenAI project, or lower `stop_ratio` to leave them room.
- A single PDF whose real usage is more than about 450K tokens could still
  cross the limit, because its reservation is capped at 200K. Capture files
  are at most 4 MB.
- Set a monthly budget or alert in the OpenAI billing settings as a backstop.

## Operations

- **Service-role key:** `SUPABASE_SERVICE_ROLE_KEY` must be set wherever
  ATLAS runs; the meter fails closed without it.
- **Verify sharing:** after enabling it, the Chat Completions usage page
  grouped by service tier should show "data sharing incentive tier" tokens.
- **Change of tier:** update the two rows, for example at tier 3:
  `update public.ai_pool_limits set daily_tokens = 1000000 where pool = 'large';`
  and `10000000` for `small`, then update `FREE_POOL_DAILY_TOKENS`.
- **Offer changes:** keep `src/lib/ai/pools.ts`, `public.ai_pool_for_model`
  and `ANALYST_MODEL_OPTIONS` in step with the help article's model list.
