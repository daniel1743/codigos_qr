# CRIPQER ENGINE SEMANTIC SIGNAL AND VISUAL AUTHORING REPAIR V1

**Task ID:** `CRIPQER_ENGINE_SEMANTIC_SIGNAL_AND_VISUAL_AUTHORING_REPAIR_V1`  
**Status:** `IMPLEMENTED — TARGETED UPSTREAM CATEGORY REPAIR`  
**Source trace:** `CRPQ-BLACKBOX-NBSZ`

## Repaired root cause

The onboarding category was not part of the Smart Pages request. The host then
re-inferred category from the free-form activity, causing `beauty` to become
`other`. The explicit category now travels through Smart Pages, PAGES_7 and
the Engine V2 input into `normalizeIntent`.

The Engine's existing vocabulary remains authoritative. `beauty` now reaches
the Engine as `beauty`; `retail`, which is not currently in the Engine
vocabulary, remains visible in diagnostics and uses the existing safe `other`
fallback rather than a new category or hardcoded business behavior.

## Additional signal handling

- Existing goal mapping is preserved, including `bookings → booking` and
  `contacts → leads`; no new goal enum was introduced.
- Archetype and family-bias selection now receive the repaired category signal.
- No family was forced based on a displayed score; candidate-level deterministic
  ranking remains the authority.
- Existing durable avatar threading was preserved; no stock fallback was added.

## Scope and safety

Added fields are transient semantic adapter fields only. No renderer redesign,
CSS workaround, database migration, provider behavior, persistence architecture
or random visual selection was changed.

## Verification

- Static mapping audit: PASS.
- Engine vocabulary fallback audit: PASS.
- Runtime Black Box rerun and authenticated avatar reload evidence: **PENDING**.
- Automated Vitest/TypeScript commands did not complete in the current
  environment and are not reported as passing.
