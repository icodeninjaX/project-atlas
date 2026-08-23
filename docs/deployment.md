# Deployment

## Supabase

1. Create a dedicated Supabase project in the intended region.
2. Link the CLI with `npx supabase link --project-ref <project-ref>`.
3. Preview with `npx supabase db push --linked --dry-run`, then apply with
   `npx supabase db push --linked`.
4. Run `npm run supabase:test` against a disposable branch or local project.
5. Configure Auth site URL and allowed redirect URLs:
   - production application origin
   - `http://localhost:3000/auth/callback`
6. Enable email confirmations and configure a production SMTP provider.
7. Do not run `supabase/seed.sql` in production.

## Vercel

1. Import the repository.
2. Use Node.js 22 and npm.
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Keep `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` unset until a reviewed server-only feature requires them.
5. Deploy after CI succeeds.

## PWA and offline sync

- Serve production over HTTPS; browsers only allow mobile installation and service workers in secure contexts (localhost is the development exception).
- Deploy the Supabase migrations before the application so `offline_mutation_receipts` is available when queued writes begin syncing.
- Atlas caches the public shell and signed-in pages after they are visited. Private page caches are isolated by user and removed on logout.
- Money, task, goal, career, debt, and review changes are saved to IndexedDB first, then replayed through `/api/offline-sync`. Authentication and onboarding still require a connection.
- Do not clear browser storage or uninstall the PWA while the header shows pending changes; that device-local queue has not reached Supabase yet.

## Post-deployment checks

- health endpoint returns `200` and `Cache-Control: no-store`
- sign-up confirmation returns through `/auth/callback`
- anonymous requests to `/dashboard` redirect to login
- one test user cannot read another test user’s records
- exports download after authentication and fail when signed out
- security headers are present
- `/manifest.webmanifest`, `/sw.js`, and all manifest icons return `200`
- a previously visited page reloads offline and an uncached route shows the offline fallback
- a queued test mutation syncs exactly once after reconnecting
- primary mobile and desktop workflows remain keyboard accessible

## Rollback

Application releases roll back through Vercel. Database rollback requires a reviewed forward migration; do not manually edit production tables or delete migration history.
