# Security

## Authentication model

Supabase Auth provides email/password identity. `@supabase/ssr` stores sessions in HTTP cookies. `src/proxy.ts` refreshes cookies and protects application paths. Protected layouts and every mutation call `auth.getUser()` again; cookie-only session data is never an authorization decision.

Password recovery uses a fixed application-origin callback and a validated local redirect path. The browser never submits a trusted user ID.

## Authorization and RLS

Every exposed table has RLS enabled and forced. Separate SELECT, INSERT, UPDATE, and DELETE policies compare the owner column with `(select auth.uid())`; update policies use both `USING` and `WITH CHECK`. Profiles compare `id` with the authenticated user.

Owner columns, foreign keys, common status/date filters, and search text have supporting indexes. Composite ownership foreign keys prevent cross-user relationships even when an attacker guesses a UUID.

Views and callable functions use `security_invoker`. The one necessary `security_definer` function provisions a new auth user, has an empty search path, uses the trigger’s trusted auth ID, lives in the private schema, and cannot be executed by browser roles.

## Secrets and environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key; protected data still depends on RLS
- `SUPABASE_SERVICE_ROLE_KEY`: server-only and not used by the MVP runtime
- `OPENAI_API_KEY`: server-only, optional, and unused until the future AI Coach
- `NEXT_PUBLIC_APP_URL`: fixed public application origin used in auth callbacks

Never prefix service-role or OpenAI keys with `NEXT_PUBLIC_`. Never commit `.env` files.

## Endpoint safety

Exports authenticate on the server, query through the user’s RLS-scoped client, use fixed entity allowlists and fixed filenames, set `no-store`, and neutralize spreadsheet formula prefixes in CSV cells. Health data contains no environment details.

Security headers disable framing, MIME sniffing, camera, microphone, and geolocation. User-facing failures do not include SQL or stack details.

## Account deletion

Permanent application and Auth user deletion is intentionally disabled in the current UI. A production implementation requires fresh credential confirmation, a typed phrase, a rate-limited server-only endpoint, and a narrowly scoped administrative function. A service-role key must never be called directly from the browser.

## Threat assumptions and rate limiting

RLS is the final data boundary even if a route or client query is incorrect. UUIDs are not treated as secrets. The application assumes Supabase Auth and PostgreSQL are available and correctly configured.

Vercel Firewall or an equivalent edge limiter should restrict repeated login, recovery, export, and future deletion requests by IP and account signal. Supabase Auth’s configured rate limits remain enabled. Rate limiting is deployment infrastructure, not an in-memory application map.

## Verification

Implemented checks:

- unit tests for safe redirects and formula-safe CSV
- pgTAP cross-user read isolation
- pgTAP debt mutation behavior
- server-derived ownership on mutations

Not yet verified locally: migration execution and pgTAP, because this workspace has neither the Supabase CLI nor PostgreSQL client and no project credentials were supplied.
