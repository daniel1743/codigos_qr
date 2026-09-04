# Cripqer — Onboarding V2 Phase 1 Report

Date: 2026-09-04
Mode: `STRICT_CONTRACT_IMPLEMENTATION`
Status: **PHASE 1 READY**

## Result summary

| Requirement                          | Result                                              |
| ------------------------------------ | --------------------------------------------------- |
| `OnboardingIntentV2` implemented     | YES                                                 |
| Semantic enums/unions implemented    | YES                                                 |
| Semantic validation implemented      | YES                                                 |
| Explicit V1 → V2 adapter implemented | YES                                                 |
| Loss report implemented              | YES                                                 |
| Simple contact fixture               | PASS                                                |
| Rich service fixture                 | PASS                                                |
| Future commerce fixture              | PASS                                                |
| No-primary-CTA fixture               | PASS                                                |
| Migrated V1 fixture                  | PASS                                                |
| TypeScript new scope                 | PASS — no diagnostics under `src/lib/onboarding-v2` |
| Relevant tests                       | PASS — 3 files, 16 tests                            |
| ESLint new scope                     | PASS                                                |
| Prettier                             | PASS                                                |
| Existing production build            | PASS                                                |
| Engine V2 modified                   | NO                                                  |
| Power Editor V2 modified             | NO                                                  |
| Basic Editor modified                | NO                                                  |
| Canonical persistence modified       | NO                                                  |
| Routes modified                      | NO                                                  |
| Supabase modified                    | NO                                                  |
| Commerce implemented                 | NO                                                  |
| `PHASE_1_STATUS`                     | **READY**                                           |

## Implemented scope

The new isolated namespace is `src/lib/onboarding-v2/`. It contains:

- versioned semantic contract and stable enum catalogues;
- validation for required domains, semantic enums, custom values, timestamps,
  action destinations and durable asset references;
- rejection of browser-only `blob:` avatar/banner references;
- optional primary action with explicit no-primary-CTA support;
- ordered secondary actions;
- optional commercial intent without products, inventory, checkout or payment
  fields;
- explicit V1 → V2 conversion with deterministic loss report;
- deterministic fixtures for simple contact, rich service, future commerce,
  no-primary-CTA and migrated V1 scenarios;
- unit tests for contract, validation, fixtures and adapter invariants.

## Contract decisions

`OnboardingIntentV2` remains semantic. It contains identity, business context,
outcome, visual direction, content needs, action hierarchy, media semantics,
scope/density, optional commercial intent, versioned extensions and provenance
metadata.

It does not contain textures, frame geometry, border radius, shadows, motion
implementation, spacing, breakpoints, raw block placement, z-index, hover
states or Power Editor control values.

The V1 adapter does not mutate its input, does not fabricate missing content or
media, defaults missing domains only where the V2 contract explicitly allows
safe empty/default values, and reports missing domains, assumptions and
warnings.

## Validation evidence

- Invalid contract version is rejected.
- Missing identity is rejected.
- Invalid semantic goal is rejected.
- Malformed user action destination is rejected.
- `blob:` durable asset reference is rejected.
- Hybrid commercial intent is accepted without a commerce payload.
- Explicitly absent primary CTA is accepted without synthesizing a URL.
- Custom categories/labels/goals are required when their semantic value is
  `other`.
- Duplicate content-needs entries are rejected.
- Secondary action order is preserved.

## Fixture evidence

### Simple contact

Models a gardener needing a compact page with WhatsApp and social links. It
proves that rich-content requirements are not forced and that simple density
remains valid.

### Rich service

Models a veterinarian needing services, team, gallery, testimonials and
booking, with booking primary and WhatsApp secondary. It proves multi-feature
content, CTA priority, own-media semantics and complete density.

### Future commerce

Models a retailer with sell/contact goals and hybrid commercial intent. It
contains no catalog, product rows, inventory, checkout or payment schema. The
future experience hint remains semantic and gated.

### No primary CTA

Models a valid presence page that explicitly has no primary contact action. No
fake destination is synthesized.

### Migrated V1

Maps the current V1 fields to their V2 equivalents, creates an empty secondary
action array, uses safe media/density defaults and reports unavailable V2
domains.

## Verification commands

```text
npx vitest run src/lib/onboarding-v2/__tests__
npx eslint src/lib/onboarding-v2
npx prettier --check src/lib/onboarding-v2
npx tsc --noEmit --pretty false
npm run build
```

The targeted tests completed with **3 test files passed and 16 tests passed**.
The production build completed successfully. Repository-wide TypeScript still
reports existing errors in unrelated files; the new namespace produced no
TypeScript diagnostics. Those unrelated errors were not changed because this
phase is strictly scoped.

## Files created

- `src/lib/onboarding-v2/types.ts`
- `src/lib/onboarding-v2/validation.ts`
- `src/lib/onboarding-v2/v1-adapter.ts`
- `src/lib/onboarding-v2/fixtures.ts`
- `src/lib/onboarding-v2/index.ts`
- `src/lib/onboarding-v2/__tests__/contract.test.ts`
- `src/lib/onboarding-v2/__tests__/validation.test.ts`
- `src/lib/onboarding-v2/__tests__/v1-adapter.test.ts`
- `CRIPQER_ONBOARDING_V2_PHASE1_REPORT.md`

## Files modified

**NONE** outside the files created above. Existing V1 onboarding files remain
unchanged.

## Protected boundaries confirmed

- Engine V2 modified: **NO**
- Power Editor V2 modified: **NO**
- Basic Editor modified: **NO**
- Canonical persistence modified: **NO**
- Routes modified: **NO**
- Supabase modified: **NO**
- Commerce/Mini-Sites implemented: **NO**
- Public onboarding connected: **NO**
- Engine V2 adapter implemented: **NO** — intentionally deferred to Phase 3
- Canonical persistence wiring implemented: **NO** — intentionally deferred to Phase 4

## Phase 1 handoff

The semantic contract foundation is ready for a separately authorized Phase 2
shell adaptation. The next phase must preserve the V1 namespace, avoid direct
Engine/Power imports in the contract layer, and keep the production flow
unconnected until the explicit Engine V2 adapter and canonical persistence
phases are approved.
