# Landing Bot — Owner Mode + Intent Routing (FUTURE)

> **status: CONTEXT_ONLY / DO_NOT_IMPLEMENT**
> `implementation_now: false`
>
> This document is a **north star only**. It MUST NOT expand the current F1/F1.1
> implementation. Do **not** implement Owner Mode, role resolution, intent
> routing, private analytics, owner tools, monthly-plan gating, CRM access, or
> private data retrieval until **explicitly authorized**.

## Purpose
Keep this future direction in mind while implementing the current Landing Bot.
Do not implement these features yet unless explicitly requested later.

## Core vision
- **public_mode (visitors on `/pg/...`):** the bot helps visitors understand the
  page owner/business and reach the right action — information, WhatsApp,
  catalog, prices, social links, location, etc.
- **owner_mode (future):** the same assistant can later recognize the
  authenticated owner of the page and act as a private business assistant.

## Identity rule (CRITICAL)
- The LLM must **NEVER** decide whether someone is the owner based on text such
  as "I am Darwin".
- **Source of truth:** owner identity must come from the **authenticated
  Cripqer session**, verified **server-side** against the page ownership relation
  (`pages.owner_user_id`).

## Future flow (NOT implemented)
1. Resolve current page / `publicId`.
2. Resolve authenticated user (if any).
3. Determine role **server-side**: `visitor | authenticated_non_owner | owner`.
4. Detect intent from natural language.
5. Check permissions.
6. Route to the correct data / tool.
7. Return **only** authorized information.

## Intent examples (future)
- **public:** `general_information`, `whatsapp_contact`, `catalog`, `prices`,
  `social_links`, `location`, `hours`, `purchase_guidance`.
- **private_owner:** `activity_summary`, `analytics_summary`, `traffic`, `clicks`,
  `qr_activity`, `leads`, `conversion_summary`.

## Owner mode example (future)
- user_text: "actividad" · "resumen de mi actividad" · "¿cómo me fue esta semana?"
- expected_behavior: if the authenticated user is the **verified owner** of the
  current page, understand this as an owner analytics intent and return a concise
  summary **without** forcing the owner to open the Analytics section.

## Analytics convenience (future)
- principle: the bot should become a conversational shortcut to Cripqer analytics.
- default_period (free/base owner summary): **current week**.
- examples:
  - "actividad" → `weekly_activity_summary`
  - "resumen de mi actividad" → `weekly_activity_summary`
  - "¿cómo me fue esta semana?" → `weekly_activity_summary`

## Future tier theory (CONCEPT ONLY — do not implement pricing/gating now)
- base/lower tier owner_analytics: current-week summary; basic visits/clicks.
- higher tier owner_analytics: monthly summaries, custom date ranges, deeper
  trends, comparisons, conversion insights, recommendations.
- example: "actividad" → this week's summary; "actividad de este mes" → allowed
  **only** if the plan includes monthly/deeper analytics.

## Security boundary (owner data is never public)
A **visitor must never receive**: private analytics, traffic counts, private
leads, customer data, internal bot usage, billing data, owner-only configuration.
- denied example: visitor asks "¿cuántas visitas tiene Darwin?" → respond that
  this information is only available to the page owner. Expose nothing.

## Architecture guidance (keep separate)
- identity resolution
- intent classification
- authorization
- data / tool routing
- LLM response generation

```
PAGE → IDENTITY → INTENT → PERMISSION → TOOL / DATA SOURCE → RESPONSE
```

## Important future goal
The Landing Bot should evolve into the conversational interface of Cripqer:
- For visitors: "Help me understand this business."
- For owners: "Help me understand my business."

## Authorized build order (ONLY when Owner Mode is explicitly authorized)
1. Server-side identity.
2. Role: `visitor | authenticated_non_owner | owner`.
3. Deterministic intent.
4. Permissions by tier.
5. First private tool: **weekly summary**.
6. LLM only phrases the response.

Always **fail-closed**. Never allow free text (e.g. "soy Darwin") to change the role.

## Current scope rule
- Preserve compatibility with this future architecture, but **do not implement**
  any of it yet.
- The next step remains: **close and fully validate F1/F1.1 at runtime**.
