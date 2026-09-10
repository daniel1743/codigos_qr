# CRIPQER - PROJECT STATUS - 2026-09-09

Type: DATED EXECUTION / READINESS SNAPSHOT  
Date: 2026-09-09  
Repository: `daniel1743/codigos_qr`  
Branch: `feat/basic-editor-editorial-canvas-ui`

---

## PURPOSE OF THIS DOCUMENT

This document preserves an accurate dated snapshot of what exists, what has been
runtime-verified, what remains incomplete, what is external, and the recommended
implementation order as of 2026-09-09.

Critical rule: distinguish runtime-confirmed facts from audit estimates and
code-only status.

This is a reference document. It does not authorize implementation, refactoring,
redesign, migration, external package integration, or changes to frozen areas.

See also: [CRIPQER_PRODUCT_NORTH_STAR.md](./CRIPQER_PRODUCT_NORTH_STAR.md)

## STATUS BADGES

- ✅ PASS / FROZEN: runtime-confirmed or accepted complete area; do not keep
  reworking without a new explicit task.
- 🟡 ACTIVE: currently active work area.
- ⏭️ NEXT: next prioritized execution item.
- 🆕 NEW: newly identified or newly documented item.
- 🅿️ PENDING: required but not yet implemented or fully verified.
- ⛔ BLOCKED: cannot proceed without dependency, decision, or external input.
- 🧪 NOT_VERIFIED: code exists or audit evidence exists, but live runtime proof is
  still missing.
- ❌ FAIL: known failure.

## CURRENT HIGH-LEVEL AUDIT SNAPSHOT

Date: 2026-09-09.

The percentages below originated from the Creation Core readiness audit. They
are readiness indicators, NOT claims of production readiness.

| System | Audit Estimate |
| --- | ---: |
| Overall Creation Core | 58% |
| Power Editor | 72% |
| Persistence / autosave audit before runtime fix | 65% |
| Desktop workflow | 68% |
| Mobile functional | 42% |
| Mobile visual polish | 55% |
| Onboarding | 60% |
| Engine V2 | 63% |
| Page System host readiness | 35% |
| Publication / public runtime | 52% |
| SEO public infrastructure | 58% |
| Analytics foundation | 30% |

## IMPORTANT RUNTIME UPDATES AFTER THE AUDIT

Autosave: ✅ PASS / FROZEN.

Manual save: ✅ PASS / FROZEN.

Canonical roundtrip: ✅ PASS / FROZEN.

Durable avatar assets: ✅ PASS / FROZEN.

Durable banner assets: ✅ PASS / FROZEN.

User performed approximately 8 live runtime tests after the persistence and
durable media fixes and confirmed that changes now remain saved.

Confirmed canonical flow:

```text
EDIT
  ↓
CANONICAL CONFIG
  ↓
SAVE
  ↓
SUPABASE RPC
  ↓
profiles.template_config
  ↓
RELOAD
  ↓
SAME CONFIG
```

Media root cause resolved: Power Editor previously persisted browser-local
`blob:` URLs for Avatar/Banner uploads. Those references died after reload.
Power now uses durable Supabase Storage URLs for new uploads.

Important legacy note: old profiles may still contain historical broken `blob:`
asset references. Do not confuse this legacy residue with the fixed new upload
path.

## POWER EDITOR COMPLETED CAPABILITIES

Camera selection:

- ✅ independent scroll
- ✅ Camera Core
- ✅ zoom
- ✅ pan
- ✅ bounds
- ✅ selection registry
- ✅ contextual autofocus
- ✅ Inspector ↔ Canvas focus foundation

Hero:

- ✅ contextual Inspector
- ✅ visual capabilities
- ✅ Hero CTA content/styles
- ✅ exact contextual focus
- ✅ Hero Image
- ✅ Hero Background / Overlay

Page background: ✅ PASS / FROZEN.

- Solid
- Gradient
- Image
- Pattern

Profile cover full-bleed: ✅ PASS / FROZEN.

- Contained
- Full-Bleed
- desktop height
- mobile height
- image
- focal X/Y
- blur
- overlay
- radius

Profile cover blend fade: ✅ PASS / FROZEN.

- enabled
- distance
- strength

Avatar rim: ✅ PASS / FROZEN.

- ON/OFF
- color

Avatar rim thickness: 🅿️ FUTURE / NON-ESSENTIAL.

Autosave: ✅ PASS / FROZEN.

Manual save: ✅ PASS / FROZEN.

Media assets: ✅ PASS / FROZEN.

## KNOWN POWER / CREATION CORE GAPS

### P0

Contextual focus regression: ⏭️ NEXT.

Evidence: one targeted contextual focus test failed because
`computeInspectorFocusScroll` returned `-130` where the older expectation was
`0`.

Required: determine whether the test expectation is stale or runtime behavior
regressed before changing runtime behavior.

Publish authority: ⏭️ REQUIRED.

Issue: Publish UI exists, but the audit did not prove a complete real publish
authority / draft-vs-published contract.

Must define:

- what is draft
- what becomes public
- public identity
- public URL
- QR target
- renderer source

Mobile functional core: ⏭️ REQUIRED.

Audit readiness: 42%.

Must verify or implement:

- touch selection
- pinch zoom
- pan
- scroll
- gesture conflict handling
- Inspector access
- virtual keyboard
- full edit session
- save/reopen

Save profile isolation: 🧪 NEEDS FINAL REAL A/B GATE.

Scenario:

```text
Profile A save in flight
  ↓
switch to Profile B
  ↓
A completes late
  ↓
B must remain untouched
```

### P1

Early access entitlements: 🅿️ REQUIRED CLEANUP.

Policy: Power Editor editing capabilities are open during Early Access.

Required:

- remove/hide stale Pro locks in Power where appropriate
- ensure visible intended-open controls are not silently blocked

Onboarding audit: 🅿️ REQUIRED.

Audit current: 60%.

Goal:

```text
Question
  ↓
stored data
  ↓
Engine consumption
  ↓
actual page decision
```

Classify fields as USED, PARTIAL, DEAD, or MISSING.

Engine V2 audit: 🅿️ REQUIRED.

Audit current: 63%.

Power capability contract: 🅿️ REQUIRED.

Purpose: teach Engine V2 all current Power Editor capabilities and when each one
is appropriate.

Image provider layer: 🅿️ REQUIRED.

Note: verify actual provider names/integrations before implementation. Do not
assume remembered provider names are exact.

Page System: 🅿️ CRITICAL INTEGRATION.

Host readiness audit: 35%.

Required:

- Landing
- Catalog
- Services
- Menu
- Portfolio
- Listings
- Detail Pages

Architecture:

```text
semantic input
  ↓
Page Plan
  ↓
Host Engine V2
  ↓
canonical
  ↓
host renderer
```

Public analytics: 🅿️ REQUIRED.

Audit note: public canonical renderer supports tracking capability, but audit
found public wiring incomplete.

SEO public runtime: 🅿️ REQUIRED.

Audit readiness: 58%.

## EXTERNAL PACKAGES

Smart Pages: 🅿️ EXTERNAL / PENDING INTEGRATION.

Rule: do not copy the package blindly. Integrate through a host audit and
explicit adapter contract.

Intelligent Analytics: 🅿️ EXTERNAL / PENDING INTEGRATION.

Rule: do not create a second analytics architecture.

## FUTURE / DEFERRED

Future Editor Enhancements: 🅿️ FUTURE.

Items:

- Avatar Rim Thin / Medium / Thick
- Fixed/Parallax
- advanced Brand Assist
- direct Canvas quick actions
- additional animation/effects
- advanced editor visual polish

Rule: these must not delay Creation Core completion.

## CURRENT EXECUTION ORDER

```text
✅ AUTOSAVE / PERSISTENCE
        ↓
⏭️ CONTEXTUAL FOCUS REGRESSION
        ↓
⏭️ REAL PUBLISH AUTHORITY
        ↓
⏭️ MOBILE FUNCTIONAL CORE
        ↓
⏭️ REAL PROFILE A/B SAVE ISOLATION
        ↓
⏭️ EARLY ACCESS ENTITLEMENT CLEANUP
        ↓
⏭️ ONBOARDING AUDIT
        ↓
⏭️ ENGINE V2 AUDIT
        ↓
⏭️ POWER CAPABILITY CONTRACT
        ↓
⏭️ IMAGE PROVIDER LAYER
        ↓
⏭️ SMART PAGES / PAGE SYSTEM
        ↓
⏭️ PUBLIC ANALYTICS + SEO WIRING
        ↓
⏭️ FINAL CREATION CORE ROUND-TRIP
        ↓
✅ CREATION CORE COMPLETE
        ↓
BEGIN CONVERSION CORE
```

## FINAL CREATION CORE GATE

Required flow:

```text
NEW USER
  ↓
ONBOARDING
  ↓
ENGINE V2
  ↓
LANDING
  +
REQUIRED SMART PAGES
  ↓
POWER EDITOR
  ↓
EDIT
  ↓
AUTOSAVE
  ↓
RELOAD
  ↓
DATA PRESERVED
  ↓
PREVIEW
  ↓
PUBLISH
  ↓
PUBLIC PAGE
  ↓
QR
  ↓
MOBILE
  ↓
COMPLETE
```

## AFTER CREATION CORE

Conversion Core status: DO NOT IMPLEMENT YET.

Sequence:

```text
EVENT MODEL
  ↓
OUTCOME MODEL
  ↓
CONTEXT / HANDOFF
  ↓
OUTCOME ATTRIBUTION
  ↓
MINI CRM
  ↓
FOLLOW-UP
  ↓
INTENT ENGINE
  ↓
OUTCOME-FIRST ANALYTICS
  ↓
LEARNING ENGINE
  ↓
VERTICAL INTELLIGENCE
```

Future Conversion Core is documented here but is NOT represented as implemented.

## KNOWN TECHNICAL DEBT / NOTES

- One historical contextualFocus assertion may reflect pre-5C2D behavior and
  needs verification before changing runtime behavior.
- QA route diagnostics such as camera-binary overlays/logging remain QA cleanup
  work and are not core product functionality.
- Mobile pinch/pan remains a major unresolved functional area.
- External Smart Pages and Intelligent Analytics packages remain outside the
  principal host integration.
- Basic Editor remains optional/simplified. Do not automatically map
  incompatible Basic templates into Power.

## DOCUMENT DISCOVERY

This file and `CRIPQER_PRODUCT_NORTH_STAR.md` live at repository root so any
agent listing the project root can immediately discover them.

## FROZEN SCOPE REMINDER

This status document does not authorize implementation.

No source code, tests, package files, migrations, README files, or existing audit
files should be changed by documentation-only tasks unless explicitly authorized.
