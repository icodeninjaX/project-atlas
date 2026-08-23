# Security

## Authentication model

Supabase Auth provides email/password identity. `@supabase/ssr` stores sessions in HTTP cookies. `src/proxy.ts` refreshes cookies and protects application paths. Protected layouts and every mutation call `auth.getUser()` again; cookie-only session data is never an authorization decision.

Password recovery uses a fixed application-origin callback and a validated local redirect path. The browser never submits a trusted user ID.

Session controls use explicit Supabase scopes: `local` for this device,
`others` for every other session, and `global` only for the confirmed
everywhere action. Accounts with a verified TOTP factor must reach AAL2 before
private pages and protected APIs open; the authenticated layout repeats this
check as defense in depth.

## Authorization and RLS

Every exposed table has RLS enabled and forced. Separate SELECT, INSERT, UPDATE, and DELETE policies compare the owner column with `(select auth.uid())`; update policies use both `USING` and `WITH CHECK`. Profiles compare `id` with the authenticated user.

Owner columns, foreign keys, common status/date filters, and search text have supporting indexes. Composite ownership foreign keys prevent cross-user relationships even when an attacker guesses a UUID.

Views and callable functions use `security_invoker`. The one necessary `security_definer` function provisions a new auth user, has an empty search path, uses the trigger’s trusted auth ID, lives in the private schema, and cannot be executed by browser roles.

## Secrets and environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key; protected data still depends on RLS
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; used by authenticated account deletion and the scheduled reminder worker
- `OPENAI_API_KEY`: server-only, optional, and unused until the future AI Coach
- `NEXT_PUBLIC_APP_URL`: fixed public application origin used in auth callbacks
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: public browser push application key
- `VAPID_PRIVATE_KEY`: server-only browser push signing key
- `VAPID_SUBJECT`: VAPID contact URI
- `CRON_SECRET`: server-only bearer secret checked with constant-time comparison

Never prefix service-role or OpenAI keys with `NEXT_PUBLIC_`. Never commit `.env` files.

## Endpoint safety

Exports authenticate on the server, query through the user’s RLS-scoped client, use fixed entity allowlists and fixed filenames, set `no-store`, and neutralize spreadsheet formula prefixes in CSV cells. Health data contains no environment details.

Security headers disable framing, MIME sniffing, camera, microphone, and geolocation. User-facing failures do not include SQL or stack details.

## Account deletion and notifications

Permanent deletion requires the exact typed phrase and a fresh password sign-in
before a separate, server-only service-role client deletes the Auth user. The
control is unavailable when the service role is absent, and unsynced device
mutations block deletion. The service-role key is never imported into browser
code.

Push subscriptions are owner-scoped with forced RLS. Delivery receipts have no
browser grants and prevent duplicate daily sends. The cron route requires
`CRON_SECRET`, only sends when actionable items exist, honors quiet hours, and
removes expired endpoints. Notification payloads contain counts and route
links, not private record contents or monetary values.

## Threat assumptions and rate limiting

RLS is the final data boundary even if a route or client query is incorrect. UUIDs are not treated as secrets. The application assumes Supabase Auth and PostgreSQL are available and correctly configured.

Vercel Firewall or an equivalent edge limiter should restrict repeated login, recovery, export, and future deletion requests by IP and account signal. Supabase Auth’s configured rate limits remain enabled. Rate limiting is deployment infrastructure, not an in-memory application map.

## Verification

Implemented checks:

- unit tests for safe redirects and formula-safe CSV
- pgTAP cross-user read isolation
- pgTAP debt mutation behavior
- server-derived ownership on mutations

Not yet verified locally: migration execution and pgTAP, because Docker Desktop
was unavailable and no linked disposable project was supplied. The Supabase
CLI schema-lint command was checked but needs a running local database or a
linked branch.
