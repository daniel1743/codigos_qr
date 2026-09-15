# CRIPQER SMART PAGES — CURRENT REPO INTEGRATION AUDIT V1

**Task ID:** `CRIPQER_SMART_PAGES_1_READ_ONLY_INTEGRATION_AUDIT_V1`
**Type:** `READ_ONLY_ARCHITECTURE_AND_MIGRATION_AUDIT`

---

**Branch audited:** `feat/basic-editor-editorial-canvas-ui`  
**Repository state:** frozen; pre-existing user changes preserved.

## 1. Executive verdict

The Smart Pages package (`CRIPQER_SMART_PAGES_V1_1_1`) is a **portable semantic layer** whose core is genuinely additive and compatible with current Cripqer. Its production value is the semantic core (normalization, orchestration, presets, sales actions, retail semantics) that can sit **above the already-integrated Engine V2** and terminate at the existing canonical `BioTemplateConfig`. 

Its **runtime (`MasterPageRuntime`, `blocks.tsx`, `smart-pages.css`) must be QA-ONLY**. Adopting it as a production renderer would create a forbidden "second renderer". 

**No STOP conditions were triggered.** The authoritative tree was found, Engine V2 was located, `BioTemplateConfig` authority was confirmed, and no source modification or dependency installation was required. The only permitted write is this report.

---

## 2. Package inventory

- **AUTHORITATIVE_TREE_FOUND**: YES — inside `proyecto de integraciones/integrar pages y catalogo cripqer/CRIPQER_SMART_PAGES_V1_1_1 (1).zip`, directory `CRIPQER_SMART_PAGES_V1_1_1/`
- **OLD_TREE_FOUND**: YES — `cripqer-smart-pages-v1.1.1/` exists inside the same ZIP and was ignored.
- **PACKAGE_VERSION**: V1.1.1
- **PACKAGE_FILE_COUNT**: 52 total files: 16 source/docs/css files and 36 demo images

### Exact Tree:

The authoritative root contains `README_INTEGRATION.md`, `business-presets.ts`,
`catalog.types.ts`, `content-normalizer.ts`, `ecosystem.ts`,
`engine-v2-adapter.ts`, `index.ts`, `intake-adapters.ts`,
`page-orchestrator.ts`, `retail-presentation.ts`, `sales-actions.ts`,
`smart-pages.css`, `smart-pages.fixtures.ts`, `smart-pages.types.ts`,
`runtime/MasterPageRuntime.tsx`, `runtime/blocks.tsx`, plus 36 `.jpg` files in
`demo-media/` (hair, photo, real-estate, restaurant, retail and veterinary
fixtures). The old tree has 41 files; the authoritative tree has 52 and adds
`retail-presentation.ts`, 10 retail images, and changed runtime/CSS/fixtures/index.

The 36 media filenames are: `hair-beard.jpg`, `hair-color.jpg`,
`hair-cover.jpg`, `hair-cut.jpg`, `photo-cover.jpg`, `photo-portrait.jpg`,
`photo-wedding-1.jpg`, `photo-wedding-2.jpg`, `re-apartment.jpg`,
`re-house.jpg`, `re-office.jpg`, `rest-bruschetta.jpg`, `rest-cover.jpg`,
`rest-lemonade.jpg`, `rest-margherita.jpg`, `rest-pepperoni.jpg`,
`shop-cactus.jpg`, `shop-ceramic-pot.jpg`, `shop-collection.jpg`,
`shop-cover.jpg`, `shop-fern.jpg`, `shop-mister.jpg`, `shop-monstera.jpg`,
`shop-pothos.jpg`, `shop-snake.jpg`, `shop-soil.jpg`, `shop-stand.jpg`,
`shop-terracotta-pot.jpg`, `shop-watering-can.jpg`, `shop-zz.jpg`,
`vet-consult.jpg`, `vet-cover.jpg`, `vet-surgery.jpg`, `vet-team-1.jpg`,
`vet-team-2.jpg`, `vet-vaccine.jpg`.

---

## 3. Current Cripqer comparison

**Generation**: Engine V2 (`src/lib/parametric-engine-v2/**`) is fully integrated and consumes `EngineV2HostGenerationInput` to generate `BioTemplateConfig`.
**Canonical**: `BioTemplateConfig` is the single document format.
**Persistence**: One page per database row (`public.pages`).
**Editor**: `PowerEditorHost` edits `BioTemplateConfig`.
**Renderer**: `PublicTemplateRenderer` renders `BioTemplateConfig`.
**Onboarding**: `src/lib/onboarding-v2/**` maps intents to Engine V2.

---

## 4. Classification matrix

| File / module | Classification | Why | Current Cripqer counterpart | Future action |
| --- | --- | --- | --- | --- |
| `catalog.types.ts` | **ADAPT** | Useful transient normalized semantics, but cannot become a second persisted catalog schema | `ContentSourceV2`, `BioTemplateConfig` blocks | Map to existing engine content DTOs |
| `smart-pages.types.ts` | **ADAPT** | Plan contracts are useful; runtime config and `listings` are not current canonical/page contracts | `OnboardingIntentV2`, Engine host input | Keep plans transient; map to current page types |
| `content-normalizer.ts` | **KEEP** | Pure, deterministic, truth-preserving normalization | Engine `normalizeContent` | Reuse behind host intake boundary |
| `business-presets.ts` | **KEEP** | Semantic defaults, not per-industry engines | Engine presets/families | Feed as hints; filter unsupported experiences |
| `page-orchestrator.ts` | **ADAPT** | Deterministic structure layer; generated IDs are placeholders and `listings` is unsupported | PAGES_7 page generator | Sit above Engine V2 with host identity mapping |
| `sales-actions.ts` | **ADAPT** | Good action precedence, but vocabulary/fallback differs from current CTA host | Engine destinations and action policy | Map representable actions and absolute URLs |
| `retail-presentation.ts` | **ADAPT** | Presentation-only retail semantics; current canonical blocks lack all rails/benefits/detail fields | Engine product/grid/media blocks | Map supported semantics; defer the rest |
| `ecosystem.ts` | **HOST-MAP** | Explicit boundary for identity, destinations and callback analytics | page/alias/QR services and analytics | Host supplies URL and event handlers |
| `intake-adapters.ts` | **ADAPT** | JSON/CSV/text are real; other formats are only registration boundaries | Current owner input/media flows | Reuse real parsers; host supplies extractors |
| `engine-v2-adapter.ts` | **HOST-MAP** | Bundled adapter is mock-only and targets runtime config | PAGES_7 adapter + `internal-entrypoint.ts` | Do not import mock; connect once to existing host |
| `index.ts` | **ADAPT** | Barrel exports the QA runtime with portable core | Current module boundaries | Expose a host-safe production surface |
| `runtime/MasterPageRuntime.tsx` | **QA-ONLY** | Separate React production rendering tree | `PublicTemplateRenderer` | Sandbox/visual regression only |
| `runtime/blocks.tsx` | **QA-ONLY** | Second block library, DOM behavior, detail dialog and `ProductRail` | Existing canonical renderer/registry | Visual and interaction reference only |
| `smart-pages.css` | **QA-ONLY** | Coupled to runtime DOM/classes; not canonical renderer CSS | Premium studio styles | Mine tokens/cases only |
| `smart-pages.fixtures.ts` | **QA-ONLY** | Demo personas useful for deterministic QA, not production data | Existing Engine/page-generator fixtures | Use in tests only |
| `demo-media/**` | **QA-ONLY** | Demo assets are not owner media or durable storage | Supabase media bucket | Never seed production content |
| `README_INTEGRATION.md` | **QA-ONLY** | Migration reference, not executable authority | Current PAGES_7 contracts/reports | Consult during approved implementation |

**KEEP_LIST**: `content-normalizer.ts`, `business-presets.ts`
**ADAPT_LIST**: `catalog.types.ts`, `smart-pages.types.ts`, `page-orchestrator.ts`, `sales-actions.ts`, `retail-presentation.ts`, `intake-adapters.ts`, `index.ts`
**HOST_MAP_LIST**: `ecosystem.ts`, `engine-v2-adapter.ts`
**QA_ONLY_LIST**: README, runtime components, CSS, fixtures and demo media
**DO_NOT_MIGRATE_LIST**: no wholesale package import; specifically no production MasterPageRuntime/blocks/CSS/mock adapter

---

## 5. Orchestrator analysis

**PAGE_ORCHESTRATOR_COMPATIBILITY**: YES
- **Can it sit above current Engine V2?** Yes, it generates structural layouts (`PagePlanV1`) that can be fed into `EngineV2HostGenerationInput`.
- **Does it duplicate PAGES_7?** Partially: PAGES_7 already owns validation, onboarding mapping, Engine call, canonical validation and page creation. Smart Pages adds a semantic structural plan; it must not re-own those boundaries.
- **Does it produce deterministic plans?** Yes, pure and network-free for stable input ordering.
- **Does it support 1-5 page mini-sites?** Yes, but its `page_<slug>`/`page_catalog` IDs are semantic placeholders, not Cripqer UUIDs/public IDs.
- **Does it decide services/catalog/portfolio/menu?** Yes. `listings` is package-only; `promotion` and `event` require host mapping to current page types.
- **What does Onboarding V2 provide?** Identity, goal, experience hint, density, CTA intents, content needs and durable media refs. It does not provide normalized catalog/items/testimonials/FAQ/team/content.
- **Does mini-site planning map to `public.pages`?** Yes by fan-out: one plan page to one normal row, with independent canonical config and publish lifecycle.

---

## 6. Engine V2 adapter comparison

**ENGINE_V2_COMPATIBILITY**: HOST-MAPPED
- Package adapter provides `EngineV2Input` and a mock runtime.
- Cripqer`s `internal-entrypoint.ts` uses `EngineV2HostGenerationInput` which is richer and maps straight to `BioTemplateConfig`.
- **Decision**: complementary only at the boundary; duplicate if both become wrapper chains. The PAGES_7 adapter remains host authority.
- **Future Flow**: Smart Pages Orchestrator → one host adapter → existing `parametric-engine-v2` → `BioTemplateConfig` → existing validation/persistence/editor.

---

## 7. Retail analysis

**RETAIL_COMPATIBILITY**: ADAPTED
- `retail-presentation.ts` extracts category tiles/counts, featured IDs, real-media banner, secondary collection, supplied benefits and grid density without inventing claims.
- Current Engine V2 can express product/grid, price labels, owner media, identity, contact and CTA. It cannot be assumed to express category tiles, rail/banner, benefit strip, density and rich item-detail semantics as first-class canonical blocks today.
- **Preferred result**: Retail semantics → existing Engine V2 → `BioTemplateConfig` → `PublicTemplateRenderer`; unsupported fields are deferred. `MasterPageRuntime` will NOT be used for production.

---

## 8. MasterPageRuntime decision

**MASTER_PAGE_RUNTIME_DECISION**: QA-ONLY
- Using this runtime for production violates the one-renderer architectural law.
- `PublicTemplateRenderer` is the sole production renderer.
- MasterPageRuntime remains strictly for sandbox evaluation and Engine Lab validation.

---

## 9. MiniSite mapping

**MINISITE_COMPATIBILITY**: CAPABLE WITH FLATTENING
- `MiniSitePlanV1` proposes multiple pages in a single project.
- Current Cripqer has 1 row = 1 page (`public.pages`).
- **RECOMMENDED_MAPPING**: One `MiniSitePlanV1` results in multiple independent `public.pages` rows. Each row gets a stable UUID/public ID and independent canonical `BioTemplateConfig`; shared business context remains orchestration input. Do not create a mega-document or Smart Pages database.

---

## 10. Onboarding compatibility

**ONBOARDING_MAPPING_STATUS**: PARTIAL — do not freeze an invented direct map
- `PageGenerationRequest` needs `businessType`, `goal`, `density`, `content`, `actions`.
- Current `OnboardingIntentV2` contains identity, coarse business category, goal, experience hint, density, content-needs, CTA intents and media intent. It does not contain normalized catalog records, prices, stock/attributes, testimonials, FAQ, team or full contact content.
- Current onboarding can safely map to the existing Engine V2 input through its established adapter. A separate host-owned content/intake boundary is required before it can produce a complete `PageGenerationRequest`.

---

## 11. Destinations

**INTERNAL_PAGE_DESTINATION_STATUS**: V1 absolute canonical URL; future page-UUID mapping
- Ecosystem boundary supports `internal_page` destinations.
- Current Cripqer safely renders absolute URLs such as `https://www.cripqer.dev/pg/{public_id}`. The stable QR identity is `/pg/{public_id}`; `/pg/a/{slug}` is only an alias.
- A bare relative `/pg/{public_id}` has a known frozen normalization defect and is not acceptable V1. Future `{ kind: "page", page_id }` should resolve host-side to the absolute stable URL. No implementation now.

---

## 12. Analytics

**ANALYTICS_HOST_MAPPING_STATUS**: HOST-MAPPED
- Ecosystem defines `AnalyticsEventV1`.
- Cripqer currently has `qr_analytics` with `view`/`link_click` RPCs. Package events for sections, items and CTA/conversion kinds are callback-only and need future host/Conversion Core mapping.
- The `onAnalyticsEvent` hook must pipe into the existing analytics authority. No secondary analytics database will be created.

---

## 13. Intake

- **REAL_INPUT_SUPPORT**: JSON, CSV, Plain Text
- **BOUNDARY_ONLY_INPUT_SUPPORT**: PDF, DOCX, XLSX, Images, URL
- Package provides the boundary `registerIntakeAdapter` for boundary-only formats. Cripqer will provide the host implementations.

---

## 14. Dependencies

- **NEW_DEPENDENCIES_IF_MIGRATED**: None observed; package has no manifest and imports React only in runtime.
- **BROWSER_ONLY_COUPLING**: Semantic core is portable; runtime uses React hooks, `window`, `document`, DOM focus/keyboard handling and package CSS.
- **PORTABILITY_RISKS**: importing the runtime barrel, treating `RuntimePageConfigV1` as canonical, using demo media as owner facts, and assuming boundary-only intake adapters are real extractors.

---

## 15. Gap matrix

| Capability | Smart Pages package | Current Cripqer | Overlap | Gap | Recommended owner |
| --- | --- | --- | --- | --- | --- |
| Page orchestration | `PagePlanV1`, `MiniSitePlanV1`, presets | PAGES_7 page generator + Engine planner | Partial | No host fan-out/UUID mapping yet | Smart Pages semantics + Cripqer host |
| Content normalization | `NormalizedContentV1`, JSON/CSV/text | Engine `normalizeContent`, owner forms | Partial | Rich catalog/profile fields need boundary mapping | Host intake/content layer |
| Business presets | Experience/section/CTA defaults | Engine presets, families and objective presets | Partial | Avoid conflicting duplicate rules | Smart semantic hints; Engine visual owner |
| Sales actions | Safe action precedence, WhatsApp/quote/contact | Engine destinations + `CRIPQER_ACTION_HOST_POLICY_V1` | Partial | Different vocabulary and fallbacks | Current Cripqer CTA host |
| Retail semantics | Tiles, featured, banner, rail, benefits, density | Product/grid/media canonical blocks | Partial | Several premium surfaces absent in canonical blocks | Engine V2/canonical capability work |
| Mini-sites | Real 1–5 page plan | One `public.pages` row per Page | Complementary | Stable IDs and independent persistence mapping | Cripqer host coordinator |
| Engine V2 generation | Neutral interface + mock | Real `internal-entrypoint.ts` + PAGES_7 adapter | Boundary overlap | Mock is not production and wrapper duplication is forbidden | Existing PAGES_7 host adapter |
| Canonical validation | Host-required; no validator | `validateTemplate` + canonical envelope | None | Must validate before persistence | Cripqer canonical authority |
| Persistence | None | `pages.template_config` and published snapshot | None | Package must not add storage | `page.service` / `page-canonical.service` |
| Editor | None | `/pages/$pageId/edit` + `PowerEditorHost` | None | No gap | Current Power Editor |
| Renderer | `MasterPageRuntime` + blocks | `PublicTemplateRenderer` | Duplicate risk | Runtime semantics need canonical representation | Current public renderer |
| QR | `EcosystemContextV1.qrContext` only | Stable `/pg/{public_id}` QR authority | Boundary only | No gap for V1 | Cripqer QR/page service |
| Alias | No owner implementation | `/pg/a/{slug}` alias route/service | Boundary only | No gap for V1 | Cripqer alias service |
| Internal navigation | `internal_page`, `section` | Absolute canonical URLs and section blocks | Partial | Future page UUID resolver | Host router/link adapter |
| Analytics | Callback taxonomy, no database | `view`/`link_click` RPC pipeline | Partial | Section/item/conversion events need mapping | Current analytics + Conversion Core |
| Media | URL-based `MediaAssetV1`, demo images | Durable Supabase upload + Engine media seams | Boundary overlap | Provenance and upload owned by host | Current media/storage adapter |
| Intake | JSON/CSV/text real; other adapters only | Current owner input and media flows | Partial | Real document/OCR/URL extractors absent | Host-owned extractors |

---

## 16. Recommended migration sequence

Migration is proposed only; it was **not executed**.

### Phase A — Semantic Core

**Files:** package `catalog.types.ts`, `smart-pages.types.ts`,
`content-normalizer.ts`, `business-presets.ts`, `page-orchestrator.ts`,
`sales-actions.ts`. **Risk:** second DTO/schema, invented fields, unsupported
`listings`, unstable semantic IDs. **Dependencies:** none new. **Tests:**
determinism, no-fabrication/review flags, CTA precedence, current page-type
mapping and stable ordering. **Runtime gate:** output maps to existing Engine V2
input and passes the existing canonical validator.

### Phase B — Engine V2 Host Mapping

**Files:** host mapping alongside existing `src/lib/page-generator/adapter.ts`;
existing `src/lib/parametric-engine-v2/internal-entrypoint.ts` remains authority.
**Risk:** duplicate wrapper chain or bypassing PAGES_7 validation.
**Dependencies:** existing Engine V2 only. **Tests:** plan-to-host-input,
owner content preservation, invalid output rejection and one-engine proof.
**Runtime gate:** real generation -> canonical envelope -> existing editor/page
draft path.

### Phase C — Retail Semantic Mapping

**Files:** `retail-presentation.ts` plus host mapping to supported canonical
blocks. **Risk:** importing `ProductRail`/runtime or implying unsupported stock,
discount, urgency or detail semantics. **Dependencies:** none new. **Tests:**
category/featured/media truthfulness and empty-data fallback. **Runtime gate:**
supported retail data renders through `PublicTemplateRenderer`; unsupported data
is deferred.

### Phase D — Onboarding → PageGenerationRequest

**Files:** host-owned adapter near `src/lib/page-generator/intent.ts` and a
content/intake boundary; existing onboarding adapter remains Engine V2 owner.
**Risk:** inventing normalized catalog/contact data from absent onboarding
fields. **Dependencies:** explicit owner content and real extractors.
**Tests:** diagnostics for missing fields, action mapping, durable media refs,
density and experience hints. **Runtime gate:** no generation until required
real data/destinations are present and canonical validation passes.

### Phase E — Mini-site multi-Page orchestration

**Files:** host fan-out coordinator, `page.service`, canonical page service and
existing routes only after approval. **Risk:** mega-document, unstable IDs,
partial persistence and placeholder navigation. **Dependencies:** current
`public.pages` RLS/publish pipeline. **Tests:** 1–5 normal rows, independent
snapshots, failure handling, stable public IDs and cross-page navigation.
**Runtime gate:** every row independently edits, publishes and renders at
`/pg/{public_id}`.

### Phase F — Internal Page destinations

**Files:** future host destination type/resolver and canonical CTA mapping.
**Risk:** known relative-URL defect or alias becoming identity. **Dependencies:**
page/alias services and renderer contract. **Tests:** UUID-to-absolute-URL,
section anchors and unpublished target behavior. **Runtime gate:** QR and
canonical links remain stable public IDs.

### Phase G — Analytics host mapping

**Files:** callback-to-host adapter; later Conversion Core event/touchpoint
schema if approved. **Risk:** second event store, taxonomy mismatch and false
conversion certainty. **Dependencies:** existing analytics RPCs first.
**Tests:** callback mapping, metadata/privacy policy and one-store proof.
**Runtime gate:** one analytics authority, no hidden Smart Pages database.

**RECOMMENDED_FIRST_IMPLEMENTATION_PHASE:** Phase A — Semantic Core  
**FILES_FOR_FIRST_PHASE:** `catalog.types.ts`, `smart-pages.types.ts`,
`content-normalizer.ts`, `business-presets.ts`, `page-orchestrator.ts`,
`sales-actions.ts`  
**NEXT_GATE:** architecture approval, then contract tests before integration.

---

## 17. STOP findings

No task-level STOP condition was triggered. Hard stops for later work:

1. No production `MasterPageRuntime`, `runtime/blocks.tsx` or package CSS.
2. No package mock adapter as real Engine V2 integration.
3. No Smart Pages persistence, second canonical schema, page database or publish path.
4. No `listings` DB page type merely because the package defines it.
5. No demo media/fixtures as owner content.
6. No claim that PDF/DOCX/XLSX/images/URL are supported without extractors.
7. No bare relative `/pg/{public_id}` CTA under the frozen renderer.
8. No second analytics database.

## 18. NOT_VERIFIED items

- No integration, source migration, test/build/browser run or live database write was executed.
- Package has no manifest; dependency conclusions come from imports/README, not lockfile resolution.
- Full production PDF/DOCX/XLSX/OCR/image/URL extraction is not present in the package.
- Exact future canonical blocks for retail tiles, rails, benefits and rich detail remain an Engine V2/canonical design decision.
- Mini-site transaction/rollback policy remains to be designed.
- UUID-based internal page destination remains future; V1 is absolute canonical URLs.

---
**SOURCE_CHANGED = NO**
**PACKAGE_CHANGED = NO**
**DB_CHANGED = NO**
**GIT_MUTATION_PERFORMED = NO**
**SUCCESS_GATE = SMART_PAGES_1_CURRENT_REPO_INTEGRATION_AUDIT_PASS**

