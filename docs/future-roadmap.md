# Future roadmap

Last reviewed: 2026-09-24

The scoped MVP features are implemented. Signals, Capacity-Aware Dayline,
Personal Runway & Financial Scenarios, Life Timeline, and Knowledge & Spaced
Repetition, the first five phases of the
[Intelligent roadmap](intelligent-roadmap.md), are also implemented.

Universal Capture is being implemented as the first AI-assisted phase. The local
code and request caps are in place, and a live structured-output smoke passed.
The migration and local pgTAP validation passed on 2026-09-24.
Production release gates still apply.

## Ordered intelligent improvements

These phases remain ordered:

1. **Knowledge & Spaced Repetition — complete:** searchable concepts and
   deterministic review scheduling.
2. **Universal Capture — in progress:** structured AI proposals, preview, and
   confirmed writes through existing actions; release checks remain.
3. **ATLAS Analyst — next:** evidence-backed explanations after Universal Capture.
4. **ATLAS Graph — later:** cross-domain relationships after the preceding phases.

Implementation prompts, acceptance criteria, exclusions, and phase-specific
safety rules live in the [Intelligent roadmap](intelligent-roadmap.md).

## Complementary post-MVP improvements

These are complementary improvements outside the ordered intelligent phases:

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
