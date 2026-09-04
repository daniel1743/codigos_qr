# Cripqer — Full Onboarding / Engine V2 / Power Editor V2 Audit

Date: 2026-09-04  
Mode: `READ_ONLY_ARCHITECTURE_AUDIT`  
Scope: onboarding, Engine V2 host boundary, canonical persistence, Basic Editor and Power Editor V2 fit

## Executive summary

The onboarding package is a coherent six-step frontend flow, but it is not the
active production onboarding path. The only runtime route importing it is the
internal, no-index `/onboarding-preview` route. The production `/editor` route
starts with authentication and the existing Basic Editor; it does not import
or consume `OnboardingShell`.

The onboarding produces a deterministic `OnboardingIntentV1` in memory and
stores only an incomplete draft in `sessionStorage`. It performs no Supabase
write, upload, publishing, page generation, Engine V2 call, or canonical
envelope creation. Engine V2 and the canonical persistence boundary exist in
the host, but there is no active onboarding-to-Engine-to-canonical connection.

The shell is a useful semantic UI starting point, but it is not sufficient for
the current dual-editor architecture as-is. The correct readiness classification
is **`MAJOR_RESTRUCTURE_REQUIRED`** for the integration architecture. This does
not mean the visual shell must be discarded; it means the production flow and
its data contract need a deliberate integration phase before it can generate a
page safely.

## Final status matrix

| Audit question                                | Result                       | Evidence / interpretation                                                                                                |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Onboarding audited                            | YES                          | Six-step `OnboardingShell` and its contract/helpers inspected.                                                           |
| Active onboarding identified                  | YES, preview-only            | `/onboarding-preview` is the only source import; it is marked internal-only and noindex.                                 |
| Production onboarding connected               | NO                           | No production route imports `OnboardingShell`; `/editor` renders Auth/Basic Editor.                                      |
| Engine V2 connected to onboarding             | NO                           | The Engine V2 host entrypoint is present, but no onboarding import/call exists.                                          |
| Canonical persistence connected to onboarding | NO                           | Canonical RPC/service exists elsewhere; onboarding has no backend write.                                                 |
| Power Editor V2 fit                           | PARTIAL                      | Semantic choices can seed generation, but no `BioTemplateConfig` is produced and important content signals are absent.   |
| Basic Editor fit                              | PARTIAL                      | Identity, bio and one action are mappable, but there is no onboarding persistence and no durable avatar/link collection. |
| Architecture readiness                        | `MAJOR_RESTRUCTURE_REQUIRED` | Production wiring, contract mapping, persistence and several input domains are missing.                                  |
| Production files modified                     | NO                           | Only this audit report was created.                                                                                      |

## 1. Current active architecture

### What is implemented

`src/components/onboarding/OnboardingShell.tsx` is a frontend flow
controller. It manages six steps, draft state, validation, progress,
completion and restart. The package documentation describes it as an
integration pack and identifies `buildIntent(draft)` as the only producer of
the onboarding contract (`src/components/onboarding/INTEGRATION.md:66-72`).

The six steps are:

1. business/activity;
2. primary goal;
3. visual personality;
4. identity;
5. primary action and destination;
6. summary.

The shell uses `sessionStorage` under
`cripqer.onboarding.draft.v1` to restore the draft during the browser session
(`OnboardingShell.tsx:66-85`). On completion it builds the intent, clears the
draft and shows the completion screen after a short presentation delay
(`OnboardingShell.tsx:124-135`).

### What is actually active

`src/routes/onboarding-preview.tsx` is the only runtime import found:

- route: `/onboarding-preview`;
- marked as internal-only QA seam in the source comments;
- `robots` metadata is `noindex, nofollow, noarchive`;
- mounts `<OnboardingShell debug />`.

The package documentation shows a possible production mount
(`INTEGRATION.md:55-64`), but that is documentation, not runtime wiring. No
production route currently imports it.

The current production editor route is `src/routes/editor.tsx`. Its flow is
session/auth driven, loads the profile and links, and renders the existing
Basic Editor. It does not import `OnboardingShell`, call `buildIntent`, or
invoke Engine V2.

## 2. End-to-end flow reconstruction

```text
User
  -> /onboarding-preview only
  -> OnboardingShell draft state
  -> sessionStorage draft (temporary)
  -> buildIntent(draft)
  -> in-memory OnboardingIntentV1
  -> CompletionScreen/debug payload
  -> STOP

Production /editor
  -> Auth/session
  -> profileService + links
  -> Basic Editor
  -> existing profile/canonical persistence paths
  -> does not consume onboarding output

Prepared Engine V2 path
  -> explicit host input
  -> generateCripqerPageWithEngineV2
  -> BioTemplateConfig
  -> acceptEngineGeneratedConfig
  -> canonical envelope
  -> requires a separate caller; onboarding is not that caller
```

The onboarding path therefore terminates at an intent preview. It does not
create a profile, choose a template, generate a `PageRecipeV1`, produce a
`BioTemplateConfig`, or persist `profiles.template_config`.

## 3. Onboarding field inventory and current consumption

The onboarding contract is defined in `src/lib/onboarding/types.ts` and the
catalogues in `src/lib/onboarding/config.ts`.

| Field / choice                        |           Captured |                                                 Validated |         Persisted durably | Consumed downstream today |
| ------------------------------------- | -----------------: | --------------------------------------------------------: | ------------------------: | ------------------------: |
| `business_type`                       |                YES |                                                       YES |                        NO |                        NO |
| `business_other`                      |     YES for `otro` |                                         YES when required |                        NO |                        NO |
| `primary_goal`                        |                YES |                                                       YES |                        NO |                        NO |
| `visual_personality`                  |                YES |                                                       YES |                        NO |                        NO |
| `identity.name`                       |                YES |                                           YES, 2–60 chars |                        NO |                        NO |
| `identity.profession`                 |                YES |                                           YES, 2–60 chars |                        NO |                        NO |
| `identity.bio`                        |                YES | carried/truncated to 160; not required by `validateDraft` |                        NO |                        NO |
| `identity.avatar_preview`             | YES, local preview |                                           object URL only | NO; deliberately stripped |                        NO |
| `primary_action.type`                 |                YES |                                                       YES |                        NO |                        NO |
| `primary_action.value`                |                YES |                                             type-specific |                        NO |                        NO |
| secondary links/actions               |                 NO |                                                        NO |                        NO |                        NO |
| content/features/density/media intent |                 NO |                                                        NO |                        NO |                        NO |

The identity avatar is explicitly an in-memory object URL. It is removed by
`toPersistedDraft`, never restored by `fromPersistedDraft`, and the integration
notes state that there are no uploads or Supabase writes
(`INTEGRATION.md:74-84`).

The summary displays activity, goal, personality, name/profession and the one
primary action. It does not display bio or avatar as a durable result. The
completion screen says that the design intent was saved, while also stating
that page generation belongs to a later phase; in code it only receives the
in-memory intent and optionally renders a debug JSON payload.

## 4. Engine connection audit

### Engine V1

Engine V1 is a separate pure TypeScript engine. Its README describes the
contract as converting an approved intent into a validated `PageRecipeV1`, not
as a renderer or persistence layer (`src/lib/parametric-engine/README.md:1-8`).

Its mirrored `OnboardingIntentV1` shape is structurally close to the onboarding
contract (`src/lib/parametric-engine/types.ts:38-56`), but the engine consumes
an explicit engine call. The source graph contains no call from
`OnboardingShell` or `/onboarding-preview` to Engine V1.

### Engine V2

The prepared host entrypoint is
`src/lib/parametric-engine-v2/internal-entrypoint.ts`. It accepts a richer host
input, maps style and goal, normalizes content links/bio, selects a primary
action, invokes the V2 generator and then calls
`acceptEngineGeneratedConfig` (`internal-entrypoint.ts:181-207`). Its result
includes `editorConfig`, a canonical envelope, generation metadata and media
metadata.

This entrypoint requires an explicit caller and suitable fields such as
`profession`, `goal`, `style`, `selectedFeatures`, content and/or a primary
action. The onboarding intent currently supplies only the narrower semantic
set; it does not itself call or adapt that entrypoint. Therefore:

**Onboarding → Engine V2: NO — prepared boundary exists, active connection does not.**

## 5. Canonical persistence audit

The host canonical boundary is present in `src/lib/canonical-page/contract.ts`
and `src/services/canonical-page.service.ts`. It preserves an envelope with
`schemaVersion: 1` and opaque `editorConfig`, and its write path uses
`set_profile_canonical_editor_config`.

That path is used by the prepared Engine/Power integration and was validated
in the separate dual-editor E2E work. It is not used by onboarding. The
onboarding package explicitly has no backend writes, uploads or publishing.

**Onboarding → canonical `template_config`: NO.**

This distinction is important: the canonical persistence implementation may be
ready, while onboarding remains an unconnected producer of a temporary intent.

## 6. Fit with Basic Editor and Power Editor V2

### Basic Editor: PARTIAL

Good mappings exist for:

- profile name;
- profession/role;
- bio/description;
- one initial destination/action;
- possible semantic selection of a starting presentation.

The fit is not complete because onboarding does not persist anything, captures
only one action, does not capture a durable avatar or link collection, and does
not call the Basic save flow. The current Basic Editor uses its own authenticated
profile/link loading and save responsibilities.

### Power Editor V2: PARTIAL

The Power Editor consumes a full `BioTemplateConfig` containing schema version,
metadata, theme, layout, profile, blocks, SEO, settings and optional motion.
Its adapters allow the host to supply load/save behavior, and the editor
exposes controls for colors, typography, layout, cards, buttons, texture,
banner and motion.

Onboarding can provide useful semantic seeds: business category, goal,
personality, identity and one action. It does not provide enough information to
fully describe content structure, link hierarchy, media availability, density,
feature selection or page composition. Those values should be inferred or
generated by Engine V2, not exposed as a long list of Power controls in
onboarding.

The authoritative Power source is already hosted under
`src/premium-template-studio/`; this audit found no onboarding import into that
package. The Power Editor fit is therefore a potential adapter fit, not an
active runtime fit.

## 7. Simple versus rich page capability

### Confirmed current capability

The onboarding can express a small semantic brief:

- who the user is;
- what category they belong to;
- the main business goal;
- broad visual direction;
- one contact destination.

### Not confirmed / not currently possible from onboarding

It cannot currently produce either a simple or rich page because it produces
no page/config at all. If connected without expanding the contract, it would
also lack:

- multiple links and CTA hierarchy;
- selected content/features;
- content density or page scope;
- media strategy and durable asset references;
- services/products/portfolio/gallery/video intent;
- audience or conversion context;
- explicit constraints for responsive composition.

Engine V2 can derive many visual and structural decisions from a richer input,
but the current onboarding provides no active bridge for those decisions.

## 8. Dead, legacy and disconnected paths

| Area                                | Finding                                                    | Risk                                                                                         |
| ----------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/onboarding-preview`               | Only runtime onboarding mount; explicitly preview/internal | High: users can complete a flow that does not create a page.                                 |
| `INTEGRATION.md` production example | Documents a production mount but no matching route exists  | Moderate: documentation can imply a capability that is not active.                           |
| Onboarding completion               | In-memory intent and debug display only                    | Critical for product continuity: no persistence or next action.                              |
| Engine V1 intent mirror             | Similar but separate type/namespace                        | Moderate: future direct wiring could silently mismatch assumptions.                          |
| Engine V2 host entrypoint           | Present and canonical-aware, but dormant from onboarding   | High: generation readiness is not onboarding readiness.                                      |
| Avatar preview                      | Blob URL intentionally discarded                           | Moderate: a user-selected avatar cannot survive as a page asset without a later upload step. |
| Bio validation                      | Not required in `validateDraft`                            | Low/moderate: empty bio is accepted and Engine V2 may synthesize fallback content.           |
| Primary action model                | Exactly one action                                         | Moderate: insufficient for richer pages and link preservation expectations.                  |

No legacy Power Editor replacement was found in the onboarding path. The
current Basic Editor, Engine V1, Power Editor V2 and canonical services remain
separate surfaces.

## 9. Gaps and risks, ranked

### Critical

1. No onboarding-to-generation handoff exists.
2. No onboarding-to-canonical persistence exists.
3. The apparent onboarding route is preview-only and not part of production
   registration or signup.
4. The output contract is not directly the Engine V2 host input or a
   `BioTemplateConfig`.

### Moderate

1. Only one primary action is captured; there is no link collection or CTA
   hierarchy.
2. Avatar handling is temporary and cannot become a durable canonical asset
   without an authorized upload/persistence stage.
3. No content, feature, media or density intent is collected.
4. Engine V1 and onboarding have similar names but distinct namespaces and
   potential mapping expectations.
5. Empty bio is allowed even though it is a meaningful identity input.

### Low

1. Draft persistence is limited to the current browser session by design.
2. A fixed six-step flow may be too rigid once richer intent is introduced.
3. The debug payload inspector must remain internal if the flow is later
   mounted in a production-adjacent route.

## 10. Recommendation matrix (architecture only; no changes made)

| Decision                         | Recommendation                                                                                                 | Reason                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Keep                             | Identity, profession, business category, primary goal, visual direction and one primary CTA                    | These are high-value semantic inputs for generation and Basic defaults.           |
| Adapt                            | Map onboarding names explicitly to the frozen Engine V2 host input                                             | Avoid treating similar `OnboardingIntentV1` names as automatic compatibility.     |
| Add in a future authorized phase | Selected features/content needs, link collection, content scope/density and media availability                 | These are required to distinguish simple and rich page generation.                |
| Add in a future authorized phase | A durable asset step or host upload handoff for avatar/banner                                                  | Blob preview URLs are not canonical assets.                                       |
| Avoid in onboarding              | Textures, frame geometry, spacing, responsive breakpoints, card radius, motion and other direct Power controls | Those belong to Engine inference or Power Editor, not the initial semantic brief. |
| Preserve                         | `schemaVersion: 1`, opaque `editorConfig`, canonical RPC and ownership boundaries                              | Required for Basic/Power round-trip safety.                                       |
| Do not do in this audit          | Route wiring, schema changes, migrations, renderer changes or UI redesign                                      | Explicitly outside the read-only audit scope.                                     |

## 11. Final readiness classification

**`MAJOR_RESTRUCTURE_REQUIRED`**

Reason: the existing onboarding UI is reusable as a presentation shell, but the
active production path, generation handoff, canonical persistence, durable
asset handling and several semantic input domains are absent. It cannot be
classified as `READY_AS_IS` or `READY_WITH_MINOR_ADJUSTMENTS` without making
claims contradicted by the current source graph.

This classification applies to onboarding integration with Engine V2 and the
dual-editor architecture. It does not invalidate the already-passing isolated
Basic/Power round-trip or the existing Engine V2 canonical boundary; it records
that onboarding is not yet connected to those capabilities.

## Files inspected

- `src/components/onboarding/OnboardingShell.tsx`
- `src/components/onboarding/StepBusiness.tsx`
- `src/components/onboarding/StepGoal.tsx`
- `src/components/onboarding/StepPersonality.tsx`
- `src/components/onboarding/StepIdentity.tsx`
- `src/components/onboarding/StepPrimaryAction.tsx`
- `src/components/onboarding/StepSummary.tsx`
- `src/components/onboarding/CompletionScreen.tsx`
- `src/components/onboarding/primitives.tsx`
- `src/components/onboarding/index.ts`
- `src/components/onboarding/INTEGRATION.md`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/config.ts`
- `src/lib/onboarding/validation.ts`
- `src/routes/onboarding-preview.tsx`
- `src/routes/editor.tsx`
- `src/lib/parametric-engine/types.ts`
- `src/lib/parametric-engine/README.md`
- `src/lib/parametric-engine-v2/internal-entrypoint.ts`
- `src/lib/parametric-engine-v2/power-editor/to-template-config.ts`
- `src/lib/canonical-page/contract.ts`
- `src/services/canonical-page.service.ts`
- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/adapters/index.ts`
- `src/premium-template-studio/state/StudioProvider.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/__tests__/registryCounts.test.ts`
- `src/premium-template-studio/components/editor/Sidebar.tsx`

## Scope confirmation

- Source files modified: **NONE**
- Routes modified: **NONE**
- Supabase/schema modified: **NONE**
- Engine V2 modified: **NONE**
- Power Editor V2 modified: **NONE**
- Basic Editor modified: **NONE**
- Audit report created: `CRIPQER_ONBOARDING_ENGINE_V2_POWER_EDITOR_AUDIT.md`
