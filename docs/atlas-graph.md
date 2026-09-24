# ATLAS Graph (Phase 8)

ATLAS Graph provides direct, owner-scoped relationships between existing records. It is a one-hop relationship layer, not a visual graph or an AI decision system.

## Entity and relationship vocabulary

The registry in `src/lib/graph/registry.ts` supports goals, tasks, goal milestones, knowledge concepts, debts, career applications, weekly reviews, and transactions. Its definitions supply each type's table, safe display label, and canonical link. New entity types require a registry entry, an allowed pair in the database and TypeScript, an endpoint validator branch, and a deletion trigger.

Existing `tasks.related_goal_id` and `goal_milestones.goal_id` remain canonical. Graph reads those links as **native** relationships and never copies them into `atlas_relationships`. The Goal UI links and unlinks tasks through a task-domain action that updates `related_goal_id`; it never deletes a Graph row for them. Milestones remain owned by their goal and can be changed through the milestone flow.

The `atlas_relationships` table stores only user-confirmed **manual** links:

| Source             | Target            | Kind                  |
| ------------------ | ----------------- | --------------------- |
| Knowledge concept  | Goal              | `supports_goal`       |
| Debt               | Goal              | `tracks_goal`         |
| Career application | Goal              | `supports_goal`       |
| Weekly review      | Goal              | `reflects_goal`       |
| Transaction        | Goal              | `financially_related` |
| Goal milestone     | Knowledge concept | `related_knowledge`   |

The pair direction is canonical. A single row can be read from either endpoint. Signals remain ephemeral. Specific goal and debt signals now carry source references, which `getSignalSourceReferences` exposes as **derived** provenance; aggregate signals with no single record do not invent an endpoint.

## Integrity and security

`atlas_relationships` has a pair check constraint, a unique constraint, and owner/source/target/kind indexes. RLS permits only authenticated owner select, insert, and delete. Updates are not granted. The insert trigger verifies authenticated identity, the exact allowed endpoint types, both endpoint rows under their existing RLS policies, and takes key-share locks to serialize against deletion. All unavailable endpoints return the same error, so a caller cannot distinguish another user's ID from a missing ID. The pair check constraint and unique constraint remain the final database guards. A trigger on every supported endpoint removes its explicit links in the same transaction as deletion. Automatic cleanup does not create activity entries.

User-initiated link and unlink actions write title-free activity history entries. They do not appear as separate Life Timeline events. The public count RPC is invoker-secured and aggregates native plus manual links for up to 200 goal IDs per call.

## Read and product surfaces

`getRelatedEntities({ entityType, entityId, limit })` is the bounded, depth-one read helper for UI and future Analyst work. It authenticates the request, checks the anchor's ownership, loads native and manual edges, batch-resolves endpoint summaries, and returns provenance and removability. It makes no model calls and does no recursive traversal. `getGoalRelationshipCounts` batches aggregate count requests. Goal cards show counts; the Goal relationship page groups linked records and supports searching, adding, and intentionally removing manual links. A milestone relationship page shows its native goal and linked knowledge, with add and remove controls. Search results can show a batched direct goal context. The existing Analyst contract is unchanged; it can adopt the read helper in a later phase.

JSON export version 3 includes `atlas_relationships`, knowledge concepts, and knowledge reviews. Graph CSV export contains manual relationship rows. Native links remain in the canonical task and milestone fields and are not repeated as export edges.

## Current limits

The related page displays at most 100 direct edges per request; very large goals need a future cursor-based list. Signal provenance is available only for rules that identify a specific goal or debt. Other entity detail pages can consume the same read helper but currently rely on the Goal hub and existing source links. No permanent relationship is created by AI.

## Acceptance and validation — 2026-09-24

Graph acceptance: **Complete locally**. This records local implementation and
validation, not production deployment. The phase introduces no observed
validation regressions. All 23 formatter-supported Graph files pass the project
formatter; the migration is intentionally ignored by Prettier and the database
test SQL has no configured Prettier parser. Neither SQL file was manually
reformatted to imitate an unsupported formatter.

| Requirement                   | Evidence                                                     | Result |
| ----------------------------- | ------------------------------------------------------------ | ------ |
| Graph schema exists           | Additive migration and live local pgTAP                      | Pass   |
| Relationship integrity        | Allowed-pair and endpoint constraints/tests                  | Pass   |
| RLS                           | Owner read/delete and denied UPDATE pgTAP assertions         | Pass   |
| Cross-user links blocked      | Source and target ownership pgTAP assertions                 | Pass   |
| Duplicate links blocked       | Database uniqueness and UI error tests                       | Pass   |
| Deletion cleanup              | Source and target deletion pgTAP assertions                  | Pass   |
| Native task → goal            | Count pgTAP, domain/action tests, browser link/unlink        | Pass   |
| Native milestone → goal       | Count pgTAP, domain and component tests                      | Pass   |
| Explicit relationships        | Registry/pair tests, pgTAP, authenticated browser flow       | Pass   |
| Relationship deletion         | Owner isolation pgTAP and browser removal                    | Pass   |
| Goal Graph UI                 | Component tests and authenticated E2E                        | Pass   |
| Bounded retrieval             | One-hop server inspection and output-limit tests             | Pass   |
| Analyst read helper           | Owner-scoped `getRelatedEntities` server helper              | Pass   |
| Mobile UX                     | E2E at 390px and 1280px, long titles and overflow assertions | Pass   |
| Graph-specific tests          | Registry, model, component, task-action and E2E suites       | Pass   |
| Database tests                | 131 assertions, including 22 Graph assertions                | Pass   |
| Graph files formatted         | Targeted formatter run: all 23 unchanged                     | Pass   |
| No new validation regressions | Baseline comparison and final full suite                     | Pass   |

The six roadmap acceptance criteria are covered above: safe links and ownership
by database tests; related detail UI by component/E2E tests; Search integration
and the Analyst helper by inspected server reads; user control by explicit
link/unlink actions; and no autonomous permanent links by the manual-only write
path and ephemeral Signal provenance tests.

Final validation: format check, lint, typecheck, 358 unit/component tests,
production build, 131 database tests, and authenticated Graph E2E pass. Public
and accessibility E2E checks also pass after the separate formatting cleanup.
The original 45 repository formatting failures were unrelated to Graph; all
were resolved in a separate mechanical cleanup. See the exact historical file
list and attribution in [repository formatting debt](repository-formatting-debt.md).

## Hosted rollout — 2026-09-25

The Graph migration was applied to ProjectAtlas before the Phase 11 freeform
quota migration. Hosted checks verified the table, RLS, grants, count RPC,
endpoint cleanup triggers, two-owner visibility, and cleanup after endpoint
deletion. The temporary checks were rolled back. The production app serves
commit `d5cbed2`; a complete authenticated hosted Graph browser flow with a
disposable account remains open. See the [hosted rollout record](hosted-phase11-rollout.md)
for version mapping, exact checks, and the remaining release check.
