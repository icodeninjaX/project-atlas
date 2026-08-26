# Future roadmap

Last reviewed: 2026-08-26

The scoped MVP features are implemented. Immediate work is the production-validation checklist in [MVP status](mvp-status.md), not another product module.

## Post-MVP milestones

1. **Workflow depth and reporting:** dedicated career detail surfaces, bulk actions, richer filters, saved views, improved trends, and generated Supabase database types.
2. **Calendar and recurring workflows:** calendar integration, recurring tasks and reminders, revocable OAuth, visible execution history, and user-controlled failure recovery.
3. **KDV Website Services CRM:** leads, proposals, client work, invoices, delivery checklists, and clear separation from private life data.
4. **Knowledge and attachments:** a searchable knowledge base and file attachments with storage RLS, malware scanning, retention controls, and short-lived signed URLs.
5. **Reflection journals:** relationship and decision journals with stricter privacy, export, deletion, and retention controls.
6. **Habits and opportunity scoring:** inspectable rules, editable weights, provenance for every score, and a user override for every recommendation.
7. **AI Coach:** explicit consent, server-only OpenAI access, bounded and user-visible context, prompt-injection defenses, cost limits, auditability, and no autonomous financial actions.

## Architectural guardrails

- Keep the current modular monolith until measured scale or reliability evidence justifies another deployment boundary.
- Keep RLS as the final owner-data boundary and preserve integer-centavo accounting and Asia/Manila date semantics.
- Do not add autonomous background AI agents or permit AI to move money, delete data, or contact people.
- Microservices, GraphQL, Redis, and external search are not planned without a demonstrated product need.
