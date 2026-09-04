# Future roadmap

Last reviewed: 2026-09-05

The scoped MVP features are implemented. Signals, Capacity-Aware Dayline, and
Personal Runway & Financial Scenarios, the first three phases of the
[Intelligent roadmap](intelligent-roadmap.md), are also implemented.

The next product improvement is **Phase 4 — Life Timeline**. The
production-validation checklist in [MVP status](mvp-status.md) remains a parallel
release track and should not be mistaken for a new product phase.

## Ordered intelligent improvements

These phases are authoritative and must remain sequential:

1. **Life Timeline:** a useful chronological view built on existing activity
   history rather than a duplicate audit system.
2. **Knowledge & Spaced Repetition:** searchable concepts and deterministic review
   scheduling.
3. **Universal Capture:** AI-assisted structured proposals that require validation
   and user confirmation before existing mutation paths run.
4. **ATLAS Analyst:** evidence-backed explanations over bounded, owner-scoped
   ATLAS facts.
5. **ATLAS Graph:** safe cross-domain relationships before any graph visualization.

Implementation prompts, acceptance criteria, exclusions, and phase-specific
safety rules live in the [Intelligent roadmap](intelligent-roadmap.md).

## Complementary post-MVP improvements

These may be planned around the authoritative phase sequence when they do not
delay or expand an active phase:

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
