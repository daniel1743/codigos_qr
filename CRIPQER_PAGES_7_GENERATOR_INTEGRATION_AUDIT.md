# CRIPQER — PAGES_7 · EXISTING PAGE GENERATOR → CANONICAL PAGES INTEGRATION AUDIT

Task: `CRIPQER_PAGES_7_CONNECT_EXISTING_PAGE_GENERATOR_ENGINE_V2_V1`
Branch: `feat/basic-editor-editorial-canvas-ui` (main untouched)
Date: 2026-09-15

---

## 0. PHASE 0 — ROADMAP STATUS

`CRIPQER_MASTER_IMPLEMENTATION_ROADMAP_V2.md`:

- Pages 5 (per-page QR) → `✅ PASS / FROZEN`
- Pages 6 (alias/custom link) → `✅ PASS / FROZEN`
- Pages 7 (Page Generator integration) → `✅ PASS / FROZEN` (closed by PAGES_7B after the PageType migration was applied)
- External systems: “Page Generator / Engine V2 package” → `✅ INTEGRATED (PAGES_7)`

Disclosure: the allowed status change was Pages 6 → PASS/FROZEN and Pages 7 →
EN EJECUCIÓN. The Pages 5 status line still said “➡️ PRÓXIMO” while the task’s
authoritative current state declares PAGES_5 frozen, so it was corrected to
PASS/FROZEN as well (status wording only). No product strategy, Conversion Core
roadmap or editor strategy content was touched.

> **PAGES_7B follow-up (2026-09-15):** the PageType migration documented below was
> applied through `npx supabase db push --linked`, and the Servicios / Catálogo /
> Portafolio runtime was verified end to end. See
> `CRIPQER_PAGES_7B_PAGE_TYPES_APPLIED_RUNTIME_REPORT.md`. Where this document says
> “migration NOT APPLIED / runtime BLOCKED”, the PAGES_7B report supersedes it.

---

## 1. PHASE 1 — GENERATOR AUDIT

### GENERATOR_FOUND

**YES.** The external Cripqer Page Generator / Engine V2 package is already
inside this repository — it was imported in the earlier authorized phase
(`CRIPQER_ENGINE_V2_IMPORT_REPORT.md`, `CRIPQER_ENGINE_V2_INTERNAL_ENTRYPOINT.md`).
No second generator exists, and no package had to be copied again.

### GENERATOR_LOCATION

| Layer                                       | Path                                                  | Role                                                         |
| ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Generator core (Engine V2, frozen)          | `src/lib/parametric-engine-v2/**`                     | deterministic intents → recipe → `BioTemplateConfig`         |
| Power Editor projection (frozen)            | `src/lib/parametric-engine-v2/power-editor/**`        | recipe → canonical Power document (`to-template-config.ts`)  |
| Generator host entrypoint (host-owned seam) | `src/lib/parametric-engine-v2/internal-entrypoint.ts` | `generateCripqerPageWithEngineV2(input, options)`            |
| Semantic intent language (reused)           | `src/lib/onboarding-v2/**`                            | `OnboardingIntentV2` + adapter to the engine input           |
| Server boundary precedent                   | `src/lib/onboarding-v2/generation-server.ts`          | `createServerFn` wrapper (server-only engine)                |
| Media/AI seams (server-only)                | `src/lib/parametric-engine-v2/media/**`, `ai/**`      | optional curated media / supervisor (not used by PAGES_7 v1) |

### GENERATOR_INPUT_CONTRACT

`EngineV2HostGenerationInput` (host input) → `OnboardingIntentV1` (engine):

- `profession` (≥ 2 chars), `businessOther`, `goal`
  (`whatsapp|booking|sell|leads|portfolio|social`), `style`
  (`elegant|minimal|modern|professional|energetic|premium`),
  `selectedFeatures[]`, `content{name,bio,links[]}`, `preferredColor`,
  `userMedia{avatarUrl,bannerUrl}`, `primaryAction{type,value}`.
- Hard requirements found during the audit:
  - a primary action must be representable: `whatsapp | booking(url) | website(url) | instagram(handle) | email`;
    `call/buy/request_quote/menu/contact` are `UNSUPPORTED_SEMANTICS` in the
    current host adapter, so the Page Generator exposes only the representable
    five plus “sin botón”;
  - no-CTA generation is supported (the engine composes without a conversion block);
  - the engine **never invents content**: a block is planned only when the host
    supplies the matching content (`services`, `products`, `portfolio`, `events`,
    `pricing`, `gallery`, `contact`, …).

### GENERATOR_OUTPUT_CONTRACT

- `editorConfig: BioTemplateConfig` (canonical Power document) with
  `pageInstanceId`, `theme.colors`, `theme.typography`, `layout.responsive`,
  `blocks[]`, `profile`, `settings`, `seo`.
- `canonicalEnvelope` = `{ schemaVersion: 1, editorConfig }` via
  `acceptEngineGeneratedConfig`.
- `generation` metadata (candidateId, score, family, layout, fingerprint), media
  provenance, supervisor outcome, host action policy.
- No JSX, no HTML, no routes, and no Page identity of its own.

### GENERATOR_OWN_PERSISTENCE = **NO**

The generator performs no Supabase call. Persistence is explicitly the caller’s
responsibility. The pre-existing profile handoff
(`src/lib/onboarding-v2/canonical-persistence.ts`) writes `profiles.template_config`
through the existing profile service — it was **not** reused for pages, because
PAGES_7 must write `pages.template_config` only.

### GENERATOR_OWN_RENDERER = **NO**

The generator produces structured data. Rendering stays in the single production
renderer `PublicTemplateRenderer`
(`src/premium-template-studio/engine/PublicTemplateRenderer.tsx`), reached through
`/pg/{public_id}` and `/pg/a/{slug}`. `integration/EngineV2PowerEditorPlayground.tsx`
is a QA playground, not a production renderer.

### GENERATOR_OWN_EDITOR = **NO**

The generator has no editor. Generated documents open in the current Power Editor
(`PowerEditorHost`, target `{ kind: "page", id }`).

### CANONICAL_COMPATIBILITY

**COMPATIBLE.** Generator output is already the canonical `BioTemplateConfig`
validated by the existing `validateTemplate`; `pages.template_config` stores the
`{ schemaVersion: 1, editorConfig }` envelope. No translation layer, schema fork
or second validator was needed. The PAGES_3B rule (never persist a document the
canonical validator rejects) is preserved: the adapter validates with the real

### GENERATOR_GAP_FOUND (host seam, not a generator limitation)

The imported host entrypoint mapped **only** `bio` + `links` into the engine’s
`ContentSourceV2`. The engine’s existing block capabilities (`services`,
`product`, `productGrid`, `portfolio`, `events`, `contact`) could not therefore be
reached from a host caller.

Fix applied (minimal, additive, engine core untouched):

- `EngineV2HostGenerationOptions.contentBlocks?: Partial<ContentSourceV2>` —
  forwards owner-supplied structured content, still sanitized by the engine’s own
  `normalizeContent`;
- `EngineV2HostGenerationInput.cardMedia?: boolean` — declares that the host
  really holds owner media (no media is asserted without an owner-supplied URL);
- `contentFor(input, contentBlocks)` merges both.

No file under `power-editor/`, `candidates/`, `strategy/`, `normalize/`, the block
planner or the renderer was modified.

### Media-led composition (audit finding)

The engine selects a **media strategy** per candidate. `mediaBlockAllowed()`
permits product/portfolio blocks only for
`profile-first | banner-first | immersive-background`. Without owner media the
strategy resolves to `minimal-no-media` and those blocks are never planned (the
engine refuses to fake a rich page). Verified empirically with the real engine:

| Case                           | Blocks                    |
| ------------------------------ | ------------------------- |
| Catálogo, sin portada          | `cta`                     |
| Catálogo + portada del dueño   | `product` / `productGrid` |
| Portafolio + portada del dueño | `portfolio`               |

Therefore `catalog` and `portfolio` require the owner’s cover image, and the
adapter selects the engine’s **existing** option `mediaStrategy: "banner-first"`
only when that real cover exists. No engine logic changed; the deterministic
choice is simply not left to the candidate hash when the product requires the
blocks to appear.

### PAGE_TYPE_GAP

- Live DB contract: `page_type_check CHECK (page_type IN ('landing','promotion','menu','campaign','event'))`.
- Product experiences required: **Servicios, Catálogo, Portafolio**.
- The generator already distinguishes these semantics
  (`show_services | sell | show_portfolio`, content needs
  `services | products | portfolio`, experience hints `service_page | catalog`),
  but the canonical `pages.page_type` could not represent them.

### PAGE_TYPE_DECISION

**Extend, do not mislabel.** `services`, `catalog` and `portfolio` were added to
the canonical contract; the five existing types are preserved byte-for-byte.

| Objective  | canonical `page_type` | goal           | experience hint      | content needs      | item kind |
| ---------- | --------------------- | -------------- | -------------------- | ------------------ | --------- |
| Servicios  | `services`            | show_services  | service_page         | services, contact  | service   |
| Catálogo   | `catalog`             | sell           | catalog              | products, contact  | product   |
| Portafolio | `portfolio`           | show_portfolio | professional_landing | portfolio, contact | project   |
| Menú       | `menu`                | show_services  | service_page         | services, contact  | service   |
| Promoción  | `promotion`           | sell           | professional_landing | services, contact  | service   |
| Evento     | `event`               | bookings       | professional_landing | contact            | event     |

Migration prepared (one CHECK replacement only, no other DDL):
`supabase/migrations/20260920000000_extend_page_type_services_catalog_portfolio.sql`.

**Migration APPLIED on the live project (2026-09-15, PAGES_7B).** It was pushed through
the normal flow (`npx supabase db push --linked`); the dry run listed exactly this one
pending migration, the ledger afterwards shows Local = Remote, and the live contract now
accepts all eight types (`landing, promotion, menu, campaign, event, services, catalog,
portfolio`). Existing rows were byte-identical before/after. Servicios, Catálogo and
Portafolio were then generated, validated, edited, published and rendered end to end — see
`CRIPQER_PAGES_7B_PAGE_TYPES_APPLIED_RUNTIME_REPORT.md`.

---

## 2. PHASE 2 — ADAPTER CONTRACT (AS IMPLEMENTED)

```
GeneratedPageInput (owner intent)
  → PageGeneratorAdapter           src/lib/page-generator/{types,validation,intent,adapter}.ts
      · validation (no fabrication, no silent loss)
      · semantic intent (existing OnboardingIntentV2 contract)
      · content blocks (existing engine content contract)
      · engine option selection (existing `mediaStrategy`)
  → Engine V2 via server boundary  src/lib/page-generator/generation-server.ts
  → canonical BioTemplateConfig
  → validateTemplate()             (existing validator, real, not mocked)
  → acceptEngineGeneratedConfig()  (existing envelope)
  → existing page services         src/lib/page-generator/create-page.ts
      · pageService.createPage       (owner = authenticated user)
      · pageCanonicalService.saveDraft (pages.template_config only)
      · read-back verification
```

- No renderer-specific hack, no draft fallback, no post-publish repair, no silent
  loss of generated content, no duplicated validator.
- `/pages/new` opens the generated document in the **existing** editor
  (`/pages/$pageId/edit` → `PowerEditorHost target={{kind:"page"}}`).
- Generation never publishes automatically: the owner reviews/edits first.

### Files added / changed (write scope only)

| File                                                                                                            | Change                                                  |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/lib/page-generator/types.ts`                                                                               | new objective/input contract (host-owned)               |
| `src/lib/page-generator/objective-presets.ts`                                                                   | objective → canonical PageType + generator semantics    |
| `src/lib/page-generator/validation.ts`                                                                          | pre-generation validation (no fabrication)              |
| `src/lib/page-generator/intent.ts`                                                                              | input → existing `OnboardingIntentV2`                   |
| `src/lib/page-generator/adapter.ts`                                                                             | `PageGeneratorAdapter` (map + canonical boundary)       |
| `src/lib/page-generator/generation-server.ts`                                                                   | server boundary to the existing generator               |
| `src/lib/page-generator/create-page.ts`                                                                         | creation flow on the existing services                  |
| `src/lib/page-generator/index.ts`                                                                               | public surface                                          |
| `src/lib/page-generator/__tests__/*`                                                                            | adapter / canonical / creation tests                    |
| `src/routes/pages.new.tsx`                                                                                      | “¿Qué quieres crear?” entry + generator form            |
| `src/types/database.ts`, `src/services/page.service.ts`, `src/routes/pages.tsx`, `src/routes/pages.$pageId.tsx` | PageType extension + owner-facing labels                |
| `src/lib/parametric-engine-v2/internal-entrypoint.ts`                                                           | additive host-seam pass-through (engine core untouched) |
| `supabase/migrations/20260920000000_extend_page_type_services_catalog_portfolio.sql`                            | one CHECK constraint replacement                        |
| `src/services/__tests__/page.service.test.ts`                                                                   | allowlist assertion updated (8 canonical types)         |
| `CRIPQER_PAGES_7_GENERATOR_INTEGRATION_AUDIT.md`, `CRIPQER_MASTER_IMPLEMENTATION_ROADMAP_V2.md`                 | this document + status-only roadmap update              |

### ARCHITECTURE

- ADAPTER_CREATED = **YES**
- SECOND_ENGINE_CREATED = **NO**
- SECOND_RENDERER_CREATED = **NO**
- SECOND_CANONICAL_MODEL_CREATED = **NO**
- SECOND_EDITOR_CREATED = **NO**
- GENERATOR-OWNED persistence / public routes / public_id / QR / alias = **NO**

---

## 3. GENERATED CONTENT QUALITY

- No demo persona, no invented testimonials, no fabricated prices, no fabricated
  business facts, no Lorem Ipsum — asserted by tests and observed in the live
  runtime document (only owner-written values reached the canonical blocks).
- Empty optional fields are dropped, never replaced by invented text.
- Missing required real data (product image, portfolio image + link, catalog
  cover, invalid CTA destination) is **rejected before generation** with a
  user-readable reason; nothing is dropped silently.
- Professional default theme comes from the engine. The UI uses owner-facing
  language only — `BioTemplateConfig`, `canonical`, `orchestrator` and `adapter`
  are never shown (verified in the browser).

---

## 4. TESTS

### Baseline

- PAGES baseline suites (`src/services/__tests__`, `src/lib/__tests__`, `src/routes/__tests__`) + the new PAGES_7 suite:
  **87 passed · 1 skipped · 1 failed (84 → 89 total)**.
- The single failure is the pre-existing, environment-dependent
  `src/lib/__tests__/env.test.ts` → “rejects server work while the flag is off”:
  the local `.env.local` sets `VITE_ENABLE_ONBOARDING_V2=true`, so
  `requireOnboardingV2Enabled()` cannot throw. Unrelated to PAGES_7 (no PAGES_7
  file touches that flag).
- The skipped test is the pre-existing guarded live repair test
  (`page-canonical.repair.live.test.ts`, `RUN_P3B_REPAIR` off).
- Frozen editor + engine suites
  (`src/premium-template-studio`, `src/components/power-editor`,
  `src/lib/onboarding-v2`, `src/lib/parametric-engine-v2/__tests__`):
  **566 passed · 1 skipped · 1 failed** — the failure is the pre-existing
  environment-dependent media-provider key test; the two “failed files” are a
  Playwright spec collected by vitest in this and in the sibling project copy.

### New PAGES_7 tests (24)

`src/lib/page-generator/__tests__/page-generator.adapter.test.ts` (11)

- complete services input accepted; missing CTA destination rejected;
- invalid WhatsApp destination rejected before the engine runs;
- invalid catalog media (product without image) rejected — never fabricated;
- unsupported primary action type rejected;
- objective → canonical PageType mapping loses no product meaning;
- the existing semantic intent contract is reused as the generator language;
- owner items map to the engine’s existing structured-content contract
  (services / products / portfolio / events + contact);
- mapping goes through the existing adapter rules (no duplicated mapping);
- explicit no-CTA document when the owner supplies no action;
- owner cover forwarded as real media + existing `banner-first` option selected
  (and not selected when there is no cover);
- catalog requires an owner cover.

`src/lib/page-generator/__tests__/page-generator.canonical.test.ts` (7) — REAL
generator + REAL `validateTemplate`, nothing mocked:

- services objective produces a renderer-valid canonical document
  (`theme.colors`, `theme.typography`, `layout.responsive`, blocks);
- owner service items (including the owner’s price) survive into the document;
- a CTA block bound to the owner destination exists for every objective;
- owner products and portfolio items stay renderable (`productGrid`, `portfolio`);
- the generated document is accepted by the existing envelope contract;
- a malformed document is **rejected** instead of repaired (real validator);
- no demo persona / invented price / testimonial / Lorem Ipsum.

`src/lib/page-generator/__tests__/page-generator.create.test.ts` (6) — real
generator + real validator through the real services against an in-memory
Supabase stub:

- the generated Page belongs to the authenticated owner and the canonical draft
  is written to `pages` (never to `profiles`);
- the persisted document is canonical (theme/layout/blocks) and only
  `template_config` is written by the draft save;
- publishing the validated snapshot works through the existing service;
- invalid owner input is rejected before generation runs;
- an invalid engine output is rejected and **no** Page row is created;
- an unauthenticated session or a foreign profile cannot generate a Page.

---

## 5. RUNTIME ACCEPTANCE (real browser + real Supabase)

Tools: local dev server (`vite dev`, `http://localhost:8080`), real Chromium
(Playwright), real QA owner session, service-role verification reads.
Script: `scratch/qa-p7-generator.cjs` (evidence: `scratch/qa-p7-runtime.json`),
plus `scratch/qa-p7-db-probe.cjs` and `scratch/qa-p7-save-probe.cjs`.

### Flow executed

| Step                               | Result                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pages/new` loads                 | H1 `¿Qué quieres crear?`; Servicios, Catálogo, Portafolio, Menú, Promoción, Evento, Página simple all visible; **no** internal jargon                                                                                                                                                               |
| Servicios objective                | submission rejected by the live `page_type_check` (migration not applied); **0 rows created**; error surfaced                                                                                                                                                                                       |
| Menú objective → generate          | Page created and canonical draft saved, then the editor opened automatically                                                                                                                                                                                                                        |
| Canonical document                 | envelope `schemaVersion: 1`; `theme.colors`, `theme.typography`, `layout.responsive` present; blocks `text → services → cta → contact`; owner item `Corte clásico`, owner price `$8.000` and owner CTA `+56912345678` present                                                                       |
| Editor                             | `/pages/<id>/edit` mounted `[data-testid="power-editor"]`; generated content visible                                                                                                                                                                                                                |
| Edit + persist                     | a safe canonical field (theme colour, an `EDIT_BASIC_STYLE`-owned domain) was edited in the frozen editor; the studio autosaved it to `pages.template_config` (2 `PATCH /rest/v1/pages` observed in the network trace); the edit is present in both the draft and the published snapshot afterwards |
| Publish                            | `published: true`, `published_revision: 1`, snapshot present, `snapshot_equals_draft: true`, `snapshot_is_canonical: true`                                                                                                                                                                          |
| Public route                       | `/pg/9umuhJk` → **HTTP 200**, generated content + title visible, **no** editor chrome, no runtime exception                                                                                                                                                                                         |
| QR                                 | page detail QR panel opens and shows the stable `/pg/{public_id}` destination (the QR keeps using `getPublicPageUrl(public_id)`)                                                                                                                                                                    |
| Alias                              | alias assigned → `/pg/a/{alias}` → **HTTP 200**, same published snapshot                                                                                                                                                                                                                            |
| Mobile 360×800 / 390×844 / 430×932 | generator usable, `scrollWidth - innerWidth = 0` on the generator **and** on the public page, CTA reachable, no runtime exception                                                                                                                                                                   |
| Cleanup                            | temporary QA Page deleted (`HTTP 200`); remaining `QA*` rows = **0**                                                                                                                                                                                                                                |

### Observed nuance (frozen Power Editor, not a PAGES_7 defect)

The explicit **“Guardar”** click inside the current Power Editor did not flip the
`power-editor-save-status` indicator within the observation window, while the
studio’s own autosave **did** persist to `pages.template_config`. The edit is
verified in canonical persistence, in the published snapshot and after reopening
the editor. This is pre-existing Power-Editor save-coordinator behaviour (frozen
in PAGES_0–PAGES_6, outside the PAGES_7 write scope) and is flagged for the
Editor Core phase.

### Regressions (live, service-role read)

| Object               | Result                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| Profile `sY9wHGm`    | `published_revision` still **4**; slug and canonical config unchanged              |
| Child Page `yfLEdka` | `published_revision` still **3**; slug, canonical config and `qr_config` unchanged |
| Page QR route        | `/pg/{public_id}` renders the published snapshot of the new page                   |
| Page alias route     | `/pg/a/{slug}` renders the same published snapshot                                 |
| PAGES_5 / PAGES_6    | no code path touched; alias + QR verified live on the new page                     |

---

## 6. REPORT

### Audit

- `GENERATOR_FOUND = YES`
- `GENERATOR_LOCATION = src/lib/parametric-engine-v2/**` (+ `internal-entrypoint.ts` host seam, `src/lib/onboarding-v2/**` semantic contract)
- `GENERATOR_INPUT_CONTRACT = EngineV2HostGenerationInput → OnboardingIntentV1` (profession, goal, style, selectedFeatures, content{name,bio,links}, userMedia, primaryAction; representable actions: whatsapp / booking / website / instagram / email)
- `GENERATOR_OUTPUT_CONTRACT = BioTemplateConfig + { schemaVersion: 1, editorConfig } envelope + generation metadata`
- `GENERATOR_OWN_PERSISTENCE = NO`
- `GENERATOR_OWN_RENDERER = NO`
- `CANONICAL_COMPATIBILITY = COMPATIBLE (no translation layer, no second validator)`
- `PAGE_TYPE_GAP = live CHECK only allows landing|promotion|menu|campaign|event; services/catalog/portfolio were not representable`
- `PAGE_TYPE_DECISION = EXTEND (services, catalog, portfolio added; existing five preserved; migration APPLIED in PAGES_7B — ledger Local = Remote, all eight types accepted live)`

### Architecture

- `ADAPTER_CREATED = YES` (`src/lib/page-generator/**`)
- `SECOND_ENGINE_CREATED = NO`
- `SECOND_RENDERER_CREATED = NO`
- `SECOND_CANONICAL_MODEL_CREATED = NO`
- `SECOND_EDITOR_CREATED = NO`
- `HOST_SEAM_CHANGE = minimal additive pass-through in the host-owned entrypoint only; engine core untouched`

### Generation

- `GENERATED_PAGE_TYPE = menu`
- `GENERATED_PAGE_ID = fa874e9c-b8ca-4099-9035-470e2237e7bd` (temporary QA page, deleted after verification)
- `GENERATED_PUBLIC_ID = 9umuhJk`
- `CANONICAL_VALIDATION = PASS (real validateTemplate + real envelope contract)`
- `OWNER_CONFIRMED = YES (owner_user_id = QA authenticated user, profile_id = QA profile; a foreign profile is rejected in the service tests)`
- `SERVICES_CATALOG_PORTFOLIO_RUNTIME = PASS in PAGES_7B (generated, validated, edited, published, rendered; see the PAGES_7B report)`

### Editor

- `EDITOR_OPEN_RESULT = Power Editor mounted with the generated content (automatic redirect after generation)`
- `EDITOR_PAGE_TARGET = { kind: "page", id } via /pages/$pageId/edit`
- `SAVE_REFRESH_RESULT = the edit persisted in pages.template_config (studio autosave PATCH) and in the published snapshot; reopening the editor shows the edit; the manual Guardar indicator nuance is reported in section 5`

### Publish

- `PUBLISH_RESULT = published_revision 1, published snapshot equals the validated draft`
- `PUBLIC_HTTP = 200`
- `PUBLIC_RENDERER = existing PublicTemplateRenderer`
- `GENERATED_CONTENT_VISIBLE = YES`

### Child identity

- `QR_DESTINATION = /pg/{public_id} (stable route, shown in the page QR panel)`
- `ALIAS_RESULT_IF_TESTED = alias → /pg/a/{alias} HTTP 200 with the same published snapshot`

### Bio → child linking

- `BIO_CAN_TARGET_CHILD_PAGE = YES` — a normal canonical CTA/link can point at the
  stable `/pg/{public_id}` URL. Neither `LinksBlock`/`ButtonBlock` nor the primary
  profile had to be modified. The richer internal `{ kind: "page", page_id }`
  semantics remains an optional, later enhancement.

### Mobile

- `GENERATED_PAGE_MOBILE_RESULT = generator usable and public page renders at 360×800, 390×844 and 430×932`
- `HORIZONTAL_OVERFLOW = 0 (none) at all three viewports`

### Regressions

- `sY9wHGm_CHANGED = NO` (revision 4; slug and canonical unchanged)
- `yfLEdka_CHANGED = NO` (revision 3; slug, canonical and QR unchanged)
- `PAGES_5_REGRESSION = NO`
- `PAGES_6_REGRESSION = NO`
- `FROZEN_EDITOR_AND_ENGINE_SUITES = 566 passed / 1 skipped / 1 pre-existing environment-dependent failure`

### Tests

- `FINAL_TEST_TOTAL = 87 passed · 1 skipped · 1 pre-existing environment-dependent failure` across the PAGES baseline suites plus the new PAGES_7 suite (24 new tests included).

### Repository

- `UNRELATED_FILES_CHANGED = NO`
- `GIT_MUTATION_PERFORMED = NO` — no add / commit / push / reset / restore / clean / checkout / stash / merge / rebase; only `git status` and `git diff` were used.

### Remaining work (explicitly not done here)

1. ~~Apply the PageType migration~~ — **DONE in PAGES_7B** (`npx supabase db push --linked`;
   Servicios, Catálogo and Portafolio now pass end to end).
2. A real image upload/asset path so Catálogo and Portafolio do not depend on the
   owner pasting image URLs.
3. Optional later: first-class internal CTA target `{ kind: "page", page_id }` — note the
   PAGES_7B finding that a _bare relative_ `/pg/{public_id}` CTA target is normalized by the
   frozen renderer, while the canonical absolute public URL works exactly.
4. Optional later: server-curated media injection (Pexels/Unsplash curator) when the
   owner has no photos — requires a product decision on licensed stock media.

**SUCCESS GATE (as far as this environment allows):**
`PAGES_7_EXISTING_GENERATOR_CANONICAL_INTEGRATION_RUNTIME_PASS`
— with the single exception of the `services` / `catalog` / `portfolio` page type,
which stays blocked solely by the unapplied migration above.

`validateTemplate` **before** persistence and rejects invalid generation.
