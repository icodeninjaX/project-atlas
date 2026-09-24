# Future roadmap

Last reviewed: 2026-09-24

The scoped MVP features are implemented. Signals, Capacity-Aware Dayline,
Personal Runway & Financial Scenarios, Life Timeline, and Knowledge & Spaced
Repetition, the first five phases of the
[Intelligent roadmap](intelligent-roadmap.md), are also implemented.

Universal Capture is implemented locally as the first AI-assisted phase, with
release closeout remaining. Local code and request caps are in place; the existing
record reports a live structured-output smoke and local migration/pgTAP validation
passing on 2026-09-24.
Production release gates still apply.

## Ordered intelligent improvements

Phases 1–8 remain the original foundation sequence. Knowledge is implemented;
Universal Capture has five single-action local flows with release closeout pending;
Analyst has seven bounded questions and a recorded typed-reservation fix; Graph
is **implemented locally**, with local acceptance recorded on 2026-09-24.
Graph hosted state is not verified. Existing validation records are historical,
not checks rerun during this roadmap update.

The [current release closeout](intelligent-roadmap.md#current-release-closeout)
covers Capture release flows, deployed Analyst/schema and authenticated-browser
verification, Graph acceptance/migration/hosted status, and baseline classification.
After required closeout checks pass, implement the **Analyst Retrieval / Tool Layer**.

The [authoritative delivery-priority table](intelligent-roadmap.md#stable-identifiers-and-delivery-priority)
orders the remaining work: Tool Layer → Query Planner → Freeform Analyst →
Historical Metrics → Cross-domain/Longitudinal Analyst → Association Discovery →
Scenario Intelligence → Next Best Action → Capture 2.0 → Multimodal Capture →
**Decision → Outcome Intelligence** (the final capability).

Existing phase identifiers are preserved: the new Tool Layer is Phase 18 (priority
9), and Association Discovery is Phase 19 (priority 14). Use delivery priorities,
not numerical IDs, to select work. Hard prerequisites are separate; scenario
explanations need no association phase, Capture 2.0 can be reprioritized without
Next Best Action, and deliberate decision recording can begin before advanced
outcome analysis. These extensions remain planned.

Implementation prompts, acceptance criteria, exclusions, and phase-specific
safety rules live in the [Intelligent roadmap](intelligent-roadmap.md).

## Complementary post-MVP improvements

These are an explicitly non-blocking backlog outside the ordered intelligent phases:

1. **Workflow depth and reporting:** dedicated career detail surfaces, bulk
   actions, richer filters, saved views, improved trends, and generated Supabase
   database types.
2. **Calendar and recurring workflows:** calendar integration, recurring tasks and
   reminders, revocable OAuth, visible execution history, and user-controlled
   failure recovery.
3. **KDV Website Services CRM:** leads, proposals, client work, invoices, delivery
   checklists, and clear separation from private life data.
4. **Attachments:** storage RLS, malware scanning, retention controls, and
   short-lived signed URLs. Attachments may support Knowledge later but should not
   block its deterministic core.
5. **Reflection journals:** relationship and decision journals with stricter
   privacy, export, deletion, and retention controls.
6. **Habits and opportunity scoring:** inspectable rules, editable weights,
   provenance for every score, and a user override for every recommendation.

## Experience and verification requirements

Every future improvement must:

- work as a complete flow on narrow mobile screens as well as desktop;
- use touch-friendly controls without hiding critical actions behind hover;
- keep explanations, amounts, and status labels readable without horizontal page
  scrolling;
- include meaningful loading, empty, validation, offline, and error behavior;
- receive responsive visual checks at representative mobile and desktop viewport
  sizes before it is called complete;
- preserve keyboard and screen-reader usability alongside touch behavior.

## Architectural guardrails

- Keep the current modular monolith until measured scale or reliability evidence justifies another deployment boundary.
- Keep RLS as the final owner-data boundary and preserve integer-centavo accounting and Asia/Manila date semantics.
- Do not add autonomous background AI agents or permit AI to move money, delete data, or contact people.
- AI features must propose or explain; deterministic ATLAS services remain the
  source of truth and the only mutation path.
- Microservices, GraphQL, Redis, and external search are not planned without a demonstrated product need.
