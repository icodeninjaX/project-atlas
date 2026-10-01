# Security

## Authentication model

Supabase Auth provides email/password identity. `@supabase/ssr` stores sessions in HTTP cookies. `src/proxy.ts` refreshes cookies and protects application paths. Protected layouts and every mutation call `auth.getUser()` again; cookie-only session data is never an authorization decision.

Password recovery uses a fixed application-origin callback and a validated local redirect path. The browser never submits a trusted user ID.

Session controls use explicit Supabase scopes: `local` for this device,
`others` for every other session, and `global` only for the confirmed
everywhere action. Accounts with a verified TOTP factor must reach AAL2 before
private pages and protected APIs open; the authenticated layout repeats this
check as defense in depth. Server assurance checks pass the session JWT to
Supabase Auth so enrollment is verified remotely rather than taken from mutable
cookie user data. Password reconfirmation uses an isolated client and preserves
the original session's AAL2 cookies.

## Authorization and RLS

Every exposed table has RLS enabled and forced. Separate SELECT, INSERT, UPDATE, and DELETE policies compare the owner column with `(select auth.uid())`; update policies use both `USING` and `WITH CHECK`. Profiles compare `id` with the authenticated user.

Owner columns, foreign keys, common status/date filters, and search text have supporting indexes. Composite ownership foreign keys prevent cross-user relationships even when an attacker guesses a UUID.

Migration `20261001094000_enforce_mfa_data_access.sql` adds restrictive MFA
policies to every existing private table and explicit checks to all nine
authenticated security-definer RPCs. A current verified factor requires AAL2;
accounts without verified factors retain normal access. New private tables and
privileged RPCs must retain this enforcement. Apply this migration with the
application release; application checks alone do not protect direct data access.

Views and ordinary callable functions use `security_invoker`. Privileged trigger
functions and the Universal Capture quota function use a fixed empty search
path and scoped inputs. The quota function reads `auth.uid()`, stores no prompt
text, and is executable only by authenticated users; its ledger has RLS and no
direct client grants.

## Secrets and environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key; protected data still depends on RLS
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; used by authenticated account deletion and the scheduled reminder worker
- `OPENAI_API_KEY`: server-only; enables Universal Capture after its migration is applied
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
removes expired endpoints. Both delivery routes validate stored destinations
against browser push providers and use a 10-second request timeout. Validation
also rejects URL authority forms interpreted differently by the delivery library.
Notification payloads contain generic text and fixed route links, without task
titles, record identifiers, counts, or monetary values. Push subscriptions can
outlive an Auth session, so private details are available only after sign-in.
Provider messages already queued before this release cannot be recalled.

## Threat assumptions and rate limiting

RLS is the final data boundary even if a route or client query is incorrect. UUIDs are not treated as secrets. The application assumes Supabase Auth and PostgreSQL are available and correctly configured.

Vercel Firewall or an equivalent edge limiter should restrict repeated login, recovery, export, and future deletion requests by IP and account signal. Hosted Supabase Auth rate-limit values have not been independently verified. Rate limiting is deployment infrastructure, not an in-memory application map.

## Verification

Implemented checks:

- unit tests for safe redirects and formula-safe CSV
- pgTAP cross-user read isolation
- pgTAP debt mutation behavior
- server-derived ownership on mutations

On 2026-10-01, all 26 pgTAP suites (316 assertions) passed against an isolated
local database with synthetic users. The live local Auth and browser test
verified password-only MFA rejection, successful TOTP verification, no-factor
compatibility, and cross-user isolation. The application also passed 1,203
enabled unit tests, lint, type checking, and a production build. The dependency
audit reported zero known vulnerabilities. All ten authenticated Chromium workflows passed against the production build with disposable local users.

The hosted migration was applied on 2026-10-01 and catalog checks confirmed
restrictive MFA policies on all 40 RLS tables and guards on all nine authenticated
security-definer RPCs. Supabase leaked-password protection remains unavailable
on the project's Free plan (requires Pro or above).

A Vercel Firewall draft logs requests above 120 per minute per IP for non-cron POST requests and GET exports. It is not published and does not block traffic. Review and publish the log-only draft before evaluating enforcement. Hosted Auth rate-limit configuration still needs a dashboard check; managed Auth access was unavailable. Authenticated browser and cross-user tests use disposable local users against the complete deployed migration chain, not production user data. See [MVP status](mvp-status.md).
