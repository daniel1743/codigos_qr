# CRIPQER ENGINE / EDITOR / CANONICAL / RENDERER CAPABILITY RECONCILIATION AUDIT V1

**Task ID:** `CRIPQER_ENGINE_EDITOR_CAPABILITY_RECONCILIATION_AUDIT_V1`  
**Type:** `READ_ONLY_FORENSIC_CAPABILITY_ALIGNMENT_AUDIT`  
**Agent:** CODEX  
**Branch audited:** `feat/basic-editor-editorial-canvas-ui`

## EXECUTIVE VERDICT

`RETAIL_READY_WITH_DEFERRED_GAPS`

The current Power Editor, `BioTemplateConfig`, `PublicTemplateRenderer`, and
Engine V2 are aligned for the existing canonical visual vocabulary and the
registered block set. Engine V2 can generate canonical documents containing
the current profile, theme, layout, responsive, motion, media, commerce,
proof, navigation, and utility blocks. The public renderer consumes the same
canonical document and has one registered component for each of the 37 current
block types.

The alignment is not complete at two boundaries:

1. The editor exposes a substantially finer manual surface than the Engine's
   semantic input and resolvers. Several valid canonical fields are therefore
   editor-preserved values rather than Engine-generated values.
2. `toBioTemplateConfig()` reconstructs a fresh document from a recipe. It does
   not merge with an existing edited `BioTemplateConfig`. A later regeneration
   can therefore erase valid manual values even though ordinary editor save,
   publish, and public rendering preserve them.

This is a cross-layer preservation risk, not evidence that a second renderer or
second canonical schema exists. Retail can proceed with explicit deferral of
category tiles, secondary collections, benefit strips, density semantics,
rich item detail, stock, checkout, and native forms. No Engine V2 patch is
required before `SMART_PAGES_4` unless an implementation chooses to regenerate
an already-edited document and promises preservation.

### Required summary counts

The matrix uses 83 grouped contract capabilities. A grouped row is counted as
one capability only when the fields share the same authority and outcome.

| Metric | Count |
| --- | ---: |
| `TOTAL_CAPABILITIES_AUDITED` | 83 |
| `FULLY_ALIGNED_COUNT` | 58 |
| `ENGINE_GENERATION_GAP_COUNT` | 8 |
| `ENGINE_PRESERVES_ONLY_COUNT` | 6 |
| `CANONICAL_GAP_COUNT` | 8 |
| `RENDERER_GAP_COUNT` | 0 |
| `EDITOR_GAP_COUNT` | 1 |
| `GHOST_CONTROL_COUNT` | 0 |
| `FUTURE_ONLY_COUNT` | 1 |
| `NOT_VERIFIED_COUNT` | 1 |
| `P0_COUNT` | 1 |
| `P1_COUNT` | 4 |
| `P2_COUNT` | 4 |
| `P3_COUNT` | 3 |

## CURRENT AUTHORITY MAP

| Concern | Current authority | Finding |
| --- | --- | --- |
| Canonical document | `src/premium-template-studio/types/index.ts` — `BioTemplateConfig` | Single document contract for theme, layout, profile, blocks, SEO, settings, and motion. |
| Canonical validation | `src/premium-template-studio/engine/TemplateValidator.ts` | `validateTemplate()` is the publish/import gate; it validates structure and registered block types and does not strip unknown object keys. |
| Editor state | `src/premium-template-studio/state/templateReducer.ts` and `state/StudioProvider.tsx` | Reducer patches canonical paths; provider owns history, authorization, save, publish, and validation. |
| Editor UI | `src/components/power-editor/PowerEditorHost.tsx`, `src/premium-template-studio/components/inspector/Inspector.tsx`, `components/editor/Sidebar.tsx` | Exposes both coarse design controls and detailed profile/block/responsive controls. |
| Editor persistence | `PowerEditorHost` adapters and `src/services/page.service.ts` / canonical page services | Page mode writes the page canonical document; no Smart Pages storage path was found. |
| Engine semantic input | `src/lib/parametric-engine-v2/power-editor/content-source.ts`, `types-v2.ts` | Normalized owner facts plus semantic design and content inputs. |
| Engine capability vocabulary | `src/lib/parametric-engine-v2/power-editor/capabilities-v2.ts` | Declares renderer-backed maximum vocabulary; it is broader than the older V1.5 catalog. |
| Engine generation | `src/lib/parametric-engine-v2/power-editor/to-recipe-v2.ts`, `resolvers.ts`, `blocks-v2.ts` | Resolves semantics to a fresh recipe and plans current registered blocks. |
| Engine canonical conversion | `src/lib/parametric-engine-v2/power-editor/to-template-config.ts` | Creates a fresh `BioTemplateConfig`; no existing-config merge/preservation input. |
| Engine invocation | `src/lib/parametric-engine-v2/internal-entrypoint.ts` | Existing Engine V2 entrypoint remains authoritative. |
| Block registry | `src/premium-template-studio/engine/BlockRegistry.ts` | 37 current registered block types, each mapped to a renderer component. |
| Editor/public renderer | `src/premium-template-studio/engine/TemplateRenderer.tsx` | Shared renderer implementation with `mode="edit"` or `mode="public"`. |
| Published renderer | `src/premium-template-studio/engine/PublicTemplateRenderer.tsx` | Public wrapper; no inspector, drag/drop, history, or editor camera. |
| Published routes | `src/routes/pg.$publicId.tsx`, `src/routes/pg.a.$slug.tsx`, `src/components/profile/PublicProfileView.tsx` | Published snapshot is resolved to canonical config and rendered by `PublicTemplateRenderer`. |
| Smart Pages host seam | `src/lib/page-generator/smart-pages-host-map.ts` | Maps transient Smart Pages plans to the existing PAGES_7/Engine V2 seam; it is not a renderer or persistence authority. |

## FULL CAPABILITY MATRIX

Classification is mutually exclusive:

- **FULLY_ALIGNED** — editor/canonical/renderer and Engine V2 agree for the
  supported generated value or capability.
- **ENGINE_GENERATION_GAP** — canonical/editor/renderer can represent the
  capability, but current Engine inputs/resolvers do not generate it.
- **ENGINE_PRESERVES_ONLY** — editor save and renderer preserve/use it, but a
  fresh Engine reconstruction does not carry the later manual value.
- **CANONICAL_GAP** — the visual idea has no explicit durable canonical field.
- **RENDERER_GAP** — canonical data is present but the public renderer does not
  consume it. None was confirmed in the audited registered surface.
- **EDITOR_GAP** — renderer/Engine vocabulary exists but no corresponding
  visible editor control was found.
- **FUTURE_ONLY** — explicitly reserved or disabled in the current capability
  layer; it must not be emitted.
- **NOT_VERIFIED** — source evidence was insufficient for a production claim.

| Domain | Capability group | Classification | Count | Evidence and consequence |
| --- | --- | --- | ---: | --- |
| Typography | Global font family, heading/body size, weights, line height, letter spacing, and theme text/alignment defaults | FULLY_ALIGNED | 6 | `ThemeTypography`, Engine resolvers, style engine, and editor controls agree for global values. |
| Typography | Per-element/per-field typography route | ENGINE_GENERATION_GAP | 1 | Canonical and Inspector support it, but Engine V2 resolves global typography rather than owner-selected per-field values. |
| Typography | Text transform, text decoration, and responsive typography | CANONICAL_GAP | 3 | No durable canonical fields for these values; CSS defaults or fixed renderer behavior cannot be reconstructed as document settings. |
| Typography | Explicit block/profile typography override after generation | ENGINE_PRESERVES_ONLY | 1 | Reducer and renderer preserve it after editor save; fresh Engine conversion does not merge it. |
| Buttons | Solid, outline, ghost, glass, gradient, soft variants; radius, height, weight, shadow, and border width | FULLY_ALIGNED | 6 | Theme button contract, `buttonStyle`, Editor controls, and Engine resolver agree. |
| Buttons | Generated CTA sizing/color/padding as theme-level defaults versus independently styled primary/secondary CTAs | ENGINE_GENERATION_GAP | 2 | Engine generates theme defaults; Inspector can write per-CTA `CTAStyle` values not represented in the semantic source recipe. |
| Buttons | Explicit icon position and durable active/pressed state | CANONICAL_GAP | 2 | Engine design axes contain `button_icon_position`, but canonical CTA/BlockItem has no explicit position; pressed feedback is CSS interaction, not persisted state. |
| Buttons | Manual primary/secondary CTA style overrides | ENGINE_PRESERVES_ONLY | 1 | `heroCtaStyle` and Inspector prove mutation/render behavior; fresh `toTemplateConfig` does not carry pre-existing overrides. |
| Cards | Background, border, radius, shadow, media ratio, media position, card layout, and spacing | FULLY_ALIGNED | 8 | `ThemeCards`, `BlockStyle`, `BlockLayout`, style engine, Editor, and V2 block planning cover these values. |
| Cards | First-class card separator/divider property | CANONICAL_GAP | 1 | A separate `divider` block exists; cards do not have a durable separator field. |
| Media | Supplied image/cover/avatar, object fit, focal/position handling, overlays, video, and gallery | FULLY_ALIGNED | 7 | Profile banner and registered media blocks are renderer-backed; Engine emits the supported subset and preserves supplied assets. |
| Media | Generic image crop and persistent image zoom | CANONICAL_GAP | 2 | Banner has focal coordinates, but generic image blocks do not expose a canonical crop/zoom document contract. Canvas zoom is editor camera behavior. |
| Media | Manual banner full-bleed/blend-fade refinements | ENGINE_PRESERVES_ONLY | 1 | `ProfileBanner` renders `widthMode` and `blendFade`; Engine V2 banner recipe does not emit them, so regeneration can remove them. |
| Layout | Section spacing, content width, alignment, columns, grid, responsive layout, section order, and visibility | FULLY_ALIGNED | 8 | `TemplateLayout`, responsive rules, `TemplateRenderer`, Editor controls, and V2 layout/block planning agree. |
| Layout | Manual block ordering/constraints/offset refinement after generation | ENGINE_PRESERVES_ONLY | 1 | Canonical and renderer support order, span, constraints, overlap, offset, sticky, and floating; fresh generation is not a merge. |
| Decoration | Solid/linear/radial/image background, overlay, supported patterns, supported textures, supported frames, and surface/card tokens | FULLY_ALIGNED | 8 | `POWER_EDITOR_CAPABILITIES`, `pageBackground`, `textureStyle`, `frame`, and `cardStyle` are renderer-backed. |
| Decoration | Renderer-backed pattern/advanced background selection in the visible editor | EDITOR_GAP | 1 | Older inventory evidence found pattern/type capabilities without a matching visible selector; this is an exposure gap, not a ghost mutation. |
| Interaction | Entrance/hover animations, duration, delay/stagger, per-block motion, sticky and floating behavior | FULLY_ALIGNED | 5 | Motion config, responsive layout classes, Engine V2 motion fields, and public renderer behavior agree. |
| Interaction | Semantic tracking intent generated for every CTA/item interaction | ENGINE_GENERATION_GAP | 1 | Renderer exposes `onTrack`, and canonical interaction has `trackingId`, but Engine does not establish a complete event taxonomy for every semantic action. |
| Interaction | Manual motion overrides | ENGINE_PRESERVES_ONLY | 1 | Editor and renderer use local motion overrides; a fresh Engine recipe re-resolves them. |
| Interaction | Exact browser/SSR behavior for all animated and sticky combinations | NOT_VERIFIED | 1 | Source implementation is present, but the full browser matrix was not completed in this read-only audit. |
| Blocks | Identity/profile header, text, heading, links, featured links, CTA/button groups, social, and navigation blocks | FULLY_ALIGNED | 1 | Current registry and V2 planner cover the supported identity/navigation family. |
| Blocks | Image, gallery, video, and media card blocks | FULLY_ALIGNED | 1 | Current registry, V2 planner, content source, and integration tests cover the visual media family. |
| Blocks | Portfolio, featured media, and document blocks | FULLY_ALIGNED | 1 | Current registry and V2 planner cover supplied project/media/document content. |
| Blocks | Trust, stats, services, testimonials, pricing, FAQ, and timeline blocks | FULLY_ALIGNED | 1 | Current registry and V2 block planner emit these canonical block types when owner content is available. |
| Blocks | Product and product-grid blocks | FULLY_ALIGNED | 1 | Registered renderer components and V2 product content cover owner product presentation. |
| Blocks | Contact, QR, map, events, music, calendar, booking, carousel, tabs, bottom navigation, divider, and spacer blocks | FULLY_ALIGNED | 1 | Registered renderer components exist; supported Engine content is mapped without inventing owner facts. |
| Blocks | Team, hours, service-area, category-navigation, secondary-collection, benefit-strip, and rich retail-detail semantics | ENGINE_GENERATION_GAP | 4 | Some can be approximated with existing blocks, but no complete first-class Engine/source/canonical contract was found. |
| Blocks | Native checkout, stock mutation, quote form, and native contact/booking submission surfaces | FUTURE_ONLY | 1 | Do not infer these from the existence of product or external booking blocks; no current canonical transaction backend is present. |
| Responsive | Per-breakpoint columns, visibility, order, padding/gap, spans, alignment, and layout overrides | FULLY_ALIGNED | 4 | `getMergedBlock`, `TemplateRenderer`, layout rules, and V2 recipe responsive output agree for supported fields. |
| Responsive | Manual responsive values added after Engine generation | ENGINE_PRESERVES_ONLY | 1 | Editor save preserves them, but `toBioTemplateConfig` reconstructs responsive data from the new recipe. |

The rows sum to 83. The matrix deliberately does not call editor camera zoom,
undo/redo, preview mode, save/publish, or selection focus document capabilities;
those are editor workflow behavior rather than canonical visual properties.

## ENGINE V2 GENERATION GAPS

Confirmed gaps are narrower than the full Editor surface:

1. Engine V2 resolves global typography, not the Editor's per-field and
   per-block typography choices.
2. Engine V2 emits theme-level button decisions, not every independently
   styled CTA value available through `CTAStyle`.
3. The Engine has no complete semantic event/action taxonomy for every CTA,
   item, section, and conversion event even though the renderer exposes a
   tracking hook.
4. There is no complete first-class generation contract for team, hours,
   service area, category navigation, secondary retail collections, benefits,
   density semantics, or rich retail detail.
5. `hero_replaces_profile_header` is intentionally false. A standalone hero
   block is opt-in because the renderer already composes the profile header;
   this is a safe constraint, not a defect.
6. The old V1.5 `future-capabilities.ts` and `control-catalog.ts` still gate
   services, gallery, testimonials, booking, and sticky CTA as future, while
   current V2 and the renderer already support many corresponding blocks.
   This is a catalog reconciliation gap and must not be used as evidence that
   the current renderer lacks those blocks.

The old capability catalogs are therefore stale relative to
`power-editor/capabilities-v2.ts`, `blocks-v2.ts`, and `BlockRegistry.ts`.
They should be reconciled in a future maintenance task, but they do not justify
importing a second runtime or adding a second capability authority now.

## ENGINE V2 PRESERVATION RISKS

### P0 — regeneration overwrites valid manual editor state

`toTemplateConfig.ts` creates a new `BioTemplateConfig` from the recipe. It
sets new page/template metadata, theme, layout, profile, blocks, SEO, settings,
and motion. There is no `existingConfig` parameter and no field-level merge.

Consequently, this sequence is safe only for a new generated document:

`owner input → Engine V2 recipe → fresh BioTemplateConfig → editor save`

This sequence is unsafe if the product promises preservation:

`generated document → manual Editor edits → Engine regeneration → fresh config`

The second path can remove or reset profile avatar rim, banner full-bleed and
blend fade, per-field typography, per-block typography, CTA style overrides,
manual responsive refinements, constraints, offsets, local motion, and other
valid canonical fields not present in the new recipe.

This is the only P0 finding because it can cause silent user-visible data loss.
It is conditional: it becomes an active production defect only when a later
regeneration is allowed to replace an already edited document.

### Ordinary editor round-trip is not the same risk

`templateReducer` patches nested paths and `StudioProvider` saves the complete
current config. `validateTemplate` does not reconstruct or strip fields.
The durable page adapter in `PowerEditorHost` writes the canonical page path.
Therefore editor save → load → render is structurally preservation-friendly,
subject to the host adapter implementation and the unverified browser/DB
environment checks listed below.

## CANONICAL GAPS

The following ideas are not represented as explicit durable canonical fields:

- text transform and text decoration;
- responsive typography values;
- explicit button icon position;
- persistent active/pressed button state;
- generic image crop and persistent image zoom;
- card separator as a card property;
- first-class retail category tile/navigation semantics.

The existence of CSS press feedback or a design-axis token does not close a
canonical gap. A value is aligned only when it can be represented, saved,
validated, and consumed consistently by the public renderer.

## RENDERER GAPS

No confirmed renderer gap was found for the current registered canonical block
set. `BlockRegistry.ts` contains 37 registered types and `TemplateRenderer.tsx`
resolves the public components, responsive layout, visibility, order, spans,
constraints, overlap, offset, sticky/floating classes, motion, page
background, texture, profile banner, avatar, CTA styles, and block styles.

Important boundaries remain:

- `booking` is a rendered block surface, not proof of a native booking backend;
- product/productGrid are presentation blocks, not proof of checkout, stock,
  SKU, or transactional detail;
- editor camera zoom/pan is not a public image zoom capability;
- the public wrapper intentionally contains no editor controls.

These are deferred capability boundaries, not missing public rendering of an
existing canonical field.

## EDITOR GHOST CONTROLS

`GHOST_CONTROL_COUNT = 0` on the evidence available.

No confirmed control satisfied the full ghost-control failure chain:

`visible control → mutation → persistence → public renderer`

The inspected Inspector, Sidebar, reducer, validator, and renderer paths show
that the visible profile, banner, avatar, CTA, block style, block layout,
responsive, and motion controls have canonical mutation and renderer paths.

The following must not be misclassified as ghost controls:

- canvas zoom/pan/pinch: editor camera state, intentionally not persisted;
- preview/breakpoint/undo/redo/save/publish: editor workflow state;
- stale V1.5 control descriptors: documentation/catalog drift, not proof of a
  visible current control;
- renderer-backed patterns without a visible selector: an editor exposure gap,
  not a mutation that disappears after save.

## ROUND-TRIP PRESERVATION

| Round-trip | Result | Assessment |
| --- | --- | --- |
| Editor patch → reducer state | PASS by source inspection | Nested canonical paths are cloned and patched; history and guarded mutation are centralized. |
| Editor state → save adapter | PASS by source inspection | `StudioProvider` saves the complete current config; page mode uses the page canonical adapter. |
| Save/load → validator | PASS by source inspection | Validator checks required envelope, IDs, block types, and URL warnings without normalizing away fields. |
| Published snapshot → public route | PASS by source inspection | `/pg/$publicId` and `/pg/a/$slug` read published canonical snapshots only and call `PublicTemplateRenderer`. |
| Canonical config → public rendering | PASS for current registered vocabulary | Shared `TemplateRenderer` and `BlockRegistry` consume the fields listed above. |
| Engine recipe → fresh canonical config | PASS with reset semantics | Deterministic and canonical-valid, but not a preservation merge. |
| Existing edited config → Engine regeneration | FAIL for preservation promise | No existing-config input or merge exists in `toBioTemplateConfig`. |

## RETAIL READINESS

`RETAIL_READY_WITH_DEFERRED_GAPS`

### Safe today

- product and product-grid blocks;
- owner product names, descriptions, prices, images, and supplied links;
- featured media/link treatment when backed by supplied owner media;
- CTA destinations already supported by the host;
- responsive columns, layout, visibility, and public rendering;
- canonical validation before persistence/publication.

### Deferred, without fabrication

- first-class category tiles/navigation;
- a separate featured or secondary collection rail;
- a dedicated benefits strip;
- retail density as an explicit canonical semantic rather than layout columns;
- rich item-detail interaction/modal/page contract;
- stock, SKU, checkout, discount, urgency, availability, or transactional claims.

The correct retail result is therefore supported canonical product presentation
plus diagnostics/deferred fields. It is not a new `listings` page type, a new
retail database, or the Smart Pages runtime.

## SMART PAGES IMPACT

The Smart Pages 3 host seam can continue to map a plan into the existing PAGES_7
adapter and Engine V2 entrypoint. For Smart Pages 4:

1. Map retail owner data to `product`/`productGrid`, `featuredMedia` or
   `featuredLink`, supported media, and supported CTA destinations.
2. Gate every package retail semantic against the current canonical/renderer
   capability matrix.
3. Preserve supplied owner data; report unsupported categories, rails,
   benefits, density, and detail as deferred rather than inventing fields.
4. Validate the resulting `BioTemplateConfig` before the existing draft/publish
   path.
5. Do not regenerate an already manually edited canonical document unless the
   caller explicitly accepts replacement semantics or a future preservation
   merge exists.

## P0/P1/P2/P3 PRIORITIES

### P0 — 1 item

1. Define and enforce regeneration semantics: new-document generation versus
   replacement of an edited document. If replacement is allowed, label it and
   preserve or reject fields explicitly; do not silently reset them.

### P1 — 4 items

1. Add a Smart Pages retail capability gate and diagnostics for deferred
   category/rail/benefit/detail semantics.
2. Add a generated-retail smoke contract that checks owner product/media/price
   preservation, canonical validation, and public renderer compatibility.
3. Establish one explicit host policy for unsupported stock/checkout/discount
   claims.
4. Reconcile the current V2 capability registry with the stale V1.5 future
   catalog before exposing any catalog-driven controls to users.

### P2 — 4 items

1. Teach Engine V2 to express first-class retail category and collection
   semantics only after canonical blocks are designed.
2. Add explicit benefit and density contracts only when the canonical renderer
   has an agreed representation.
3. Add Engine-side support for banner full-bleed/blend-fade and avatar rim if
   generation should intentionally author those properties.
4. Add a merge/preservation-aware generation mode if regeneration of edited
   pages becomes a product requirement.

### P3 — 3 items

1. Consider canonical fields for responsive typography, text decoration/
   transform, generic crop/zoom, and icon position only when product value
   justifies schema expansion.
2. Improve visible editor exposure for renderer-backed patterns and data-only
   design tokens.
3. Add full browser/SSR visual regression coverage for sticky, motion, media,
   mobile, and public published paths.

## MINIMUM REQUIRED FIXES BEFORE SMART_PAGES_4

No cross-layer repair is required before starting Smart Pages 4 under the
deferred-gap contract. The minimum safe gate is:

- a host-side capability mapper that emits only current canonical product,
  media, featured, CTA, and layout fields;
- explicit diagnostics for every deferred retail field;
- one generated retail fixture that passes `validateTemplate` and is rendered
  through `PublicTemplateRenderer`;
- an owner-data preservation assertion for names, descriptions, prices, links,
  and supplied media;
- no use of `MasterPageRuntime`, `runtime/blocks.tsx`, Smart Pages CSS, demo
  media, package mock adapters, or new persistence;
- no regeneration of manually edited documents without explicit replacement or
  preservation semantics.

If the Smart Pages 4 design requires first-class category tiles, rails,
benefits, rich detail, or checkout, the minimum changes become a later
canonical/renderer design task. They are not safe to smuggle in as package-only
fields.

## CAPABILITIES THAT SHOULD REMAIN EDITOR-ONLY

These should not be added to Engine V2 generation merely because the Editor has
them:

- canvas camera zoom, pan, pinch, fit-to-viewport, selection autofocus, and
  Inspector focus;
- undo/redo, preview mode, breakpoint switching, save/publish status, and
  template-application workflow;
- manual fine tuning that represents an intentional post-generation override,
  unless the product explicitly wants the Engine to own it;
- browser press feedback and other transient interaction state;
- editor-only diagnostics, discovery hints, and selection metadata.

The last three are not necessarily non-persistable today; they are simply not
required to become semantic generation inputs.

## CAPABILITIES ENGINE V2 SHOULD LEARN LATER

In priority order after canonical design approval:

- retail category navigation, secondary collections, benefit sections, explicit
  density, and rich item detail;
- preservation-aware regeneration/merge of existing canonical documents;
- responsive typography and selected per-element typography when there is a
  stable semantic input contract;
- avatar rim, banner full-bleed/blend-fade, and other newly added profile visual
  tokens;
- a complete host-mapped event taxonomy for sections, items, CTAs, and
  conversions;
- native forms, checkout, stock, and booking only after canonical, backend,
  validation, and renderer authorities are approved together.

## EXPLICIT ANSWERS Q1–Q10

**Q1 — Is Engine V2 behind the current Power Editor?**  
Partially. It is not behind the current registered block renderer vocabulary,
but it is behind the manual Editor in fine-grained overrides and in several
retail semantics. It is also behind the Editor in preservation behavior when a
fresh generation replaces an edited document.

**Q2 — Which Editor controls are generated, preserved, or lost?**  
Theme-level typography, background, cards, buttons, layout, supported media,
registered blocks, responsive layout, and motion are generated in supported
forms. Ordinary editor saves preserve canonical values. Per-element typography,
CTA overrides, banner/avatar refinements, manual responsive values, and local
layout/motion refinements are editor-preserved but can be lost by later fresh
Engine reconstruction.

**Q3 — Does `BioTemplateConfig` support the current visual capability surface?**  
Mostly. It supports the current theme, profile, block, layout, responsive,
motion, CTA, media, and style vocabulary. It does not have explicit durable
fields for transform/decoration, responsive typography, icon position,
persistent active state, generic crop/zoom, card separators, or first-class
retail category semantics.

**Q4 — Does the public renderer render what the Editor and canonical document support?**  
Yes for the current registered canonical surface; no confirmed renderer gap was
found. The renderer does not turn product/booking blocks into checkout or
native transaction systems, and editor camera behavior is intentionally absent
from public output.

**Q5 — Are there ghost controls?**  
No confirmed ghost controls. The inspected visible controls have reducer,
persistence, and renderer paths. Stale capability catalogs and unexposed
renderer tokens are catalog/exposure issues, not ghost mutations.

**Q6 — Are manual Editor modifications after generation preserved?**  
Yes through the ordinary editor save/publish round-trip. No when a later Engine
generation replaces the document, because `toBioTemplateConfig()` is a fresh
reconstruction and does not merge the existing config.

**Q7 — Is the current system retail-ready?**  
Yes with deferred gaps: `RETAIL_READY_WITH_DEFERRED_GAPS`. Product grids,
products, owner media, prices, links, CTAs, responsive layout, validation, and
public rendering are ready. Category/rail/benefit/detail/transaction surfaces
must remain explicitly deferred.

**Q8 — What must be fixed before Smart Pages 4?**  
Only the safe host-side capability gate, diagnostics, owner-data preservation
smoke path, canonical validation, and public-renderer verification described in
the minimum gate. A core Engine patch is not required for the supported retail
subset.

**Q9 — What should remain editor-only?**  
Canvas camera and focus behavior, undo/redo, preview/breakpoint workflow,
save/publish status, selection metadata, transient press feedback, and other
workflow concerns should remain outside semantic generation.

**Q10 — What should Engine V2 learn later?**  
First-class retail semantics, preservation-aware regeneration, selected
fine-grained typography/profile tokens, complete analytics intent mapping, and
native forms/checkout only after their canonical and backend contracts exist.

## NOT_VERIFIED

1. A complete browser/SSR visual matrix for every responsive, animation,
   sticky/floating, media, and public route combination was not completed. The
   broad Vitest invocation was not used as a pass claim because the repository's
   `happy-dom` browser tasks remained open; no source was changed and no
   successful full-suite result is asserted here.
2. Concrete host asset adapters, font loading/head integration, and any AI
   generation wiring outside the inspected editor/Engine paths were not used as
   evidence for alignment.
3. Live Supabase persistence, publication, and database behavior were not
   exercised; conclusions are source-level and contract-level only.

## REPOSITORY SAFETY / AUDIT GATE

- `SOURCE_CHANGED = NO`
- `ENGINE_V2_CHANGED = NO`
- `EDITOR_CHANGED = NO`
- `CANONICAL_SCHEMA_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `DB_CHANGED = NO`
- `DEPENDENCY_CHANGED = NO`
- `GIT_MUTATION_PERFORMED = NO`
- `SMART_PAGES_RUNTIME_USED = NO`
- `SUCCESS_GATE = CRIPQER_ENGINE_EDITOR_CAPABILITY_RECONCILIATION_AUDIT_COMPLETE`

`SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING` is not started automatically.
