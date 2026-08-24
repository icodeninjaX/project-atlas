# ATLAS Playwright polish backlog

Last reviewed: 2026-08-08
Target: `https://atlas.kdvwebsiteservices.com`
Browsers: Playwright Desktop Chrome and Pixel 7 emulation

## Test summary

- Existing public and accessibility suite: **12 passed, 0 failed**.
- Existing authenticated suite: **10 skipped** because `E2E_EMAIL` and `E2E_PASSWORD` are not configured.
- New production-safe edge suite: **8 passed, 4 failed**. The four failures are two reproducible product issues, each failing on desktop and mobile.
- Health endpoint returned `200`, `Cache-Control: no-store`, and the expected service payload.
- No production records were created or changed during this review.

Local implementation verification on 2026-08-09: **16 passed, 0 failed** across
Desktop Chrome and Pixel 7 emulation. This includes the fixed API-auth and 404
routing behavior plus redirect sanitization coverage.

## Work next

### P1 — Return API authentication errors as API responses

**Status:** Implemented and verified locally on 2026-08-09.

**Evidence:** An anonymous request to `/api/export/csv` follows the proxy redirect to `/login` and ends as an HTML `200`. The route itself contains a JSON `401`, but the proxy intercepts it first.

**Why polish it:** API clients, tests, and monitoring can misread an unauthenticated export as success. A caller attempting `response.json()` receives HTML instead of the documented error shape.

**Suggested direction:** Handle `/api/*` separately in `src/proxy.ts`. For unauthenticated API requests, return a JSON `401` response or allow the route to perform its own authentication. Keep browser page redirects for protected UI routes.

**Acceptance criteria:**

- Anonymous `GET /api/export/csv` returns HTTP `401` without a redirect.
- Response content type is JSON and body is `{ "error": "Unauthorized" }`.
- Authenticated exports still download successfully.

### P1 — Enable authenticated production E2E coverage

**Evidence:** Ten existing tests are skipped without dedicated E2E credentials. They cover money, debts, tasks, career, reviews, dashboard aggregation, onboarding, and sign-in.

**Why polish it:** The highest-value workflows currently have no production-level browser signal. Public pages can be green while real user mutations are broken.

**Suggested direction:** Create a dedicated least-privilege E2E account, store `E2E_EMAIL` and `E2E_PASSWORD` as protected CI/Vercel test secrets, and add deterministic cleanup for records prefixed with `E2E`.

**Acceptance criteria:**

- All authenticated tests run in CI against an isolated environment or dedicated test user.
- Test data is uniquely named and cleaned up.
- Tests prove one user cannot access another user's records.
- Credentials never appear in source, logs, traces, or Playwright reports.

### P2 — Let unknown routes reach the 404 page

**Status:** Implemented and verified locally on 2026-08-09.

**Evidence:** An anonymous visit to `/this-route-does-not-exist` is treated as protected and redirected to `/login`, ending as HTTP `200`; `src/app/not-found.tsx` is never shown.

**Why polish it:** Mistyped or stale public links misleadingly appear to require authentication, and crawlers receive a false-success status.

**Suggested direction:** Protect known application route prefixes rather than treating every route not in a public allowlist as private. Preserve a deny-by-default rule for genuinely sensitive routes.

**Acceptance criteria:**

- Unknown URLs return HTTP `404` and render the ATLAS not-found state.
- Known protected routes still redirect anonymous visitors to login.
- Unknown `/api/*` routes return API-appropriate `404` responses.

### P2 — Honor the preserved destination after sign-in

**Status:** Implemented locally on 2026-08-09. The destination is validated and
submitted with the login form; a successful authenticated return still requires
the dedicated E2E credentials described above.

**Evidence:** The proxy correctly sends `/tasks?view=completed` to `/login?next=...`, but `signInAction` always redirects to `/dashboard` and does not consume a validated `next` value.

**Why polish it:** Users following a deep link lose their destination after authenticating.

**Suggested direction:** Include `next` in the login form action, validate it as a same-origin relative path, and redirect there after successful sign-in. Reject protocol-relative paths and absolute URLs to prevent open redirects.

**Acceptance criteria:**

- Successful sign-in from a protected deep link returns to the full path and query string.
- Invalid, absolute, or protocol-relative `next` values fall back to `/dashboard`.

### P2 — Turn on leaked-password protection

**Evidence:** The live Supabase security advisor reports that leaked-password protection is disabled.

**Why polish it:** Users can choose credentials known to be compromised.

**Suggested direction:** Enable Supabase Auth leaked-password protection if the current plan supports it, then verify signup and password-reset behavior.

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### P3 — Make browser setup deterministic

**Status:** Documented in `docs/testing.md` on 2026-08-09.

**Evidence:** The first Playwright run failed because the pinned Chromium binary was absent; the browser installation then took several minutes.

**Suggested direction:** Add `npx playwright install --with-deps chromium` to CI/bootstrap documentation and cache the Playwright browser directory where supported.

## Edge cases already passing

- Protected deep links preserve their full destination in the login URL.
- Malformed email and short-password submissions are blocked by native form validation.
- Invalid credentials return a generic error that does not reveal whether an account exists.
- Opening the password-reset page without a valid session fails safely.
- Public landing, login, signup, and forgot-password pages have no automated Axe violations at the tested viewports.
- Public landing navigation and the health endpoint behave correctly.

## Working test file

The executable edge-case checks live in `e2e/edge-cases.spec.ts`. The API-auth,
404 routing, deep-link preservation, and redirect-sanitization checks now pass
locally in both configured browser projects.

## Recommended implementation order

1. Configure an isolated authenticated E2E account and run the existing protected workflow suite.
2. Enable leaked-password protection in Supabase and verify signup/password reset behavior.
3. Add the documented browser installation step and Playwright cache to CI.
