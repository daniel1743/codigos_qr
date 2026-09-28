# CRIPQER — BRIDGE 4 — LOVABLE FEATURE PORT (Magic-facing editor)

**Task:** expose the Lovable feature set in the real `/pages/$pageId/edit` Magic editor.
**Authority:** `tmp_lovable/` (the attached Lovable implementation) is the feature reference.
**Mode:** controlled implementation. No new editor shell, no route changes, no Power Editor mount.

---

## 1. How this was verified (method)

The Magic-facing editor for `/pages/$pageId/edit` is:

```
src/routes/pages.$pageId.edit.tsx
  -> src/features/magic-page-editor-production/MagicProductionEditorHost.tsx   (auth + document session)
  -> src/isolated/magic-page-editor/MagicEditorApp.tsx                          (the Magic UI boundary)
  -> src/isolated/magic-page-editor/contexts/EditorContext.tsx                  (document + Magic native actions)
  -> src/isolated/magic-page-editor/pages/Editor.tsx                            (canvas, toolbar, sheet)
```

Every file of `tmp_lovable/src/**` was compared byte-for-byte against
`src/isolated/magic-page-editor/**` to produce the delta. 45 reference files are
already identical; the remaining differences were classified as formatting-only,
already-ported, or **real gaps** (below).

## 2. Root cause of the reported symptom (“Portada > Variante only exposes 10”)

Three independent facts explain the observation:

1. **`hero: "Portada"`** is the block label (`data/blockKit.ts`), so
   “Portada > Variante” *is* the hero action that renders `HeroVariantPicker`.
2. The **committed** version of `HeroVariantPicker.tsx` (HEAD) contains only the
   10 original variants. The 30-variant list existed **only in the uncommitted
   working tree**, so any running or deployed build made from HEAD still shows 10.
3. The contract test that guarded this surface
   (`__tests__/mediaExposureContract.test.ts`) still asserted *“keeps all ten hero
   layout variants wired to the picker”*. It was the **only failing test** in the
   workspace and it actively encoded the 10-variant contract, which is why the
   port looked undone in QA output.

So the 30 variants existed in source, but the *verifiable* contract said 10, and
several controls were wired to nothing. Bridge 4 fixes the contract, proves
30/30 render differently, and removes the dead/mis-wired controls listed in §4.


## 3. Feature exposure matrix

Status legend: `ALREADY_PRESENT` · `EXPOSED` · `PORTED` · `ADAPTED` · `BLOCKED_WITH_REASON`

### 3.1 Hero

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Hero variants `simple`…`bleed` (10) | yes | yes | yes | reuse | Portada > Variante | ALREADY_PRESENT |
| Hero variants `editorialCenter`…`brandIdentity` (20) | yes | yes (working tree) | yes — proven by render test | reuse + prove | Portada > Variante | ALREADY_PRESENT |
| Own thumbnail per variant (30) | yes | **partial** — `quote` rendered the same thumbnail as `fullBleed` | partial | port (differentiate the `quote` thumbnail) | Portada > Variante | PORTED |
| 30-variant contract test | n/a | **stale** — asserted 10 | n/a (test) | adapt | `__tests__/mediaExposureContract.test.ts` | ADAPTED |
| Fusion none / fade / halo / organic / dominant | yes | yes | yes | reuse | Portada > “Fusión” · Más > “Fusión con la página” | ALREADY_PRESENT |
| Reduced 3-mode Fusion duplicate in “Más” | no (Magic-only) | yes — limited to none/fade/halo **and** read `ed.canonicalHistory`, which does not exist on `EditorValue` (TS2339 + `undefined` at runtime) | yes | adapt — reuse the shared 5-mode `HeroFusionPicker` behind a real context flag | Portada > Más > “Fusión con la página” | ADAPTED |
| Overlay levels none/soft/medium/intense | yes | yes | yes | reuse | Portada > “Superposición” | ALREADY_PRESENT |
| Overlay colour | yes | yes | yes | reuse | Portada > “Color de la superposición” | ALREADY_PRESENT |
| Free crop X / Y (numeric pad + drag) | yes | yes | yes | reuse | Portada > “Encuadre libre” | ALREADY_PRESENT |
| Continuous zoom | yes | yes | yes | reuse | Portada > “Encuadre libre” slider · “Zoom” | ALREADY_PRESENT |
| Quick position presets (9 points) | yes | yes | yes | reuse | Portada > “Posición rápida” | ALREADY_PRESENT |

### 3.2 Avatar

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Shapes circle / rounded / arch | yes | yes | yes | reuse | Avatar > Forma | ALREADY_PRESENT |
| Shape `square` | declared in the type only, rendered like `rounded`, absent from every picker | same (declared, unreachable) | **no** | port (`radiusFor` now returns `0px`; option added to both shape pickers; the mislabelled “Cuadrado” → `rounded` option corrected) | Avatar > Forma | PORTED |
| Free crop X/Y + continuous zoom + quick position | yes | yes | yes | reuse | Avatar > “Encuadre” / “Imagen” | ALREADY_PRESENT |
| Overlay none/soft/medium/intense + colour | yes | yes | yes | reuse | Avatar > “Superposición” | ALREADY_PRESENT |
| Badge on the avatar (show/hide + colour) | yes | yes | yes | reuse | Avatar > “Verificación” · Más | ALREADY_PRESENT |
| Verification badge **beside the name**, independently | yes — rendered in Bio, Business, Portfolio | **partial** — `VerifiedNameCheck` and the `badgeByName` control existed, but no template rendered it, so the control did nothing | **no** | port (rendered in the 3 templates) | Bio name row · Business byline row · Portfolio title row | PORTED |

### 3.3 Page variants

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Bio family 8 (signature…monogram) | yes | yes | yes | reuse | TopBar selector · Ajustes > variante | ALREADY_PRESENT |
| Business family 8 (atelier…statement) | yes | yes | yes | reuse | TopBar selector · Ajustes > variante | ALREADY_PRESENT |
| Portfolio family 8 (archive…nocturne) | yes | yes | yes | reuse | TopBar selector · Ajustes > variante | ALREADY_PRESENT |
| Mini Galería 5 (`gallery-*`) | yes | yes | yes | reuse | TopBar selector · Ajustes > variante | ALREADY_PRESENT |

The variants are read from `page.familyVariant` (consumed by the templates and
`GalleryGrid`); they are not separate routes or editors, and switching one
preserves the document content.

### 3.4 Card families

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| catalog 8 · page 8 · portfolio 8 · menu 6 · store 6 | yes | yes | yes | reuse | Bloque > “Variante” · Tarjeta > “Diseño” | ALREADY_PRESENT |
| Shared layouts left/right/top/bottom/editorial/compact/balanced/highlight | yes | yes | yes | reuse | Tarjeta > “Diseño” / “Imagen” | ALREADY_PRESENT |
| before/after (portfolio only, real renderer) | yes | yes | yes | reuse | Tarjeta > “Diseño” | ALREADY_PRESENT |
| Optional fields badge / price / previous price / description / CTA / eyebrow / meta | yes | yes | yes | reuse | Tarjeta > Más > “Campos” + inline editing | ALREADY_PRESENT |
| Price contract (`kind="price"` → price toolbar + inline editing) | yes | **broken** — `EditableText` had lost its `kind` prop, so `CardBody` failed type-check and every price registered as `text` (price actions unreachable) | **no** | port (prop restored, price inline editing restored) | Precio > toolbar · Tarjeta > Más | PORTED |
| Card/gallery media crop / zoom / overlay | yes | **partial** — `cropX`/`cropY` were never forwarded by the props→treatment adapter and `fit` was hardcoded to `cover`, so “Encuadre” / “Ajuste” were dead options on every `EditableImage` | partial | port (adapter forwards crop, `fit` honoured, drag-to-pan restored) | Tarjeta/Foto > “Imagen” | PORTED |
| Card order (Subir / Bajar) | yes | **broken** — called `ed.updateDoc`, which did not exist on `EditorValue` (TS2339, `undefined` at runtime) | no | adapt (exposed `updateDoc`; canonical documents are an explicit no-op and the buttons are disabled there) | Tarjeta > Más > “Orden y visibilidad” | ADAPTED |
| Canonical card composition picker (Magic-only block) | no | yes, but its 4 options wrote variant ids (`image-top`, …) that `resolveCard` ignores → dead options; it also read `ed.canonicalHistory` (TS2339) | no | adapt (real card layouts from `layoutsForFamily`, written to the card-level `layout`; gated by a real context flag) | Tarjeta > Más > “Composición de tarjeta” | ADAPTED |

### 3.5 Gallery

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Layouts fila / mosaico / carrusel / masonry / stacked | yes | yes | yes | reuse (options now single-sourced from the renderer’s `galleryLayouts`) | Galería > “Diseño” | ALREADY_PRESENT |
| Photo selection per slot | yes | yes | yes | reuse | Galería > “Fotos” | ALREADY_PRESENT |
| Crop / position / zoom per photo | yes | partial (same adapter gap as cards) | partial | port (shared fix) | Foto de galería > “Imagen” | PORTED |

### 3.6 Video

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Editable URL | yes | yes | yes | reuse | Vídeo > “Enlace” | ALREADY_PRESENT |
| Cover image | yes | yes | yes | reuse | Vídeo > “Imagen” | ALREADY_PRESENT |
| Crop / position | yes | yes | yes | reuse | Vídeo > “Imagen” | ALREADY_PRESENT |
| YouTube thumbnail when recognisable | yes | yes | yes | adapt (extracted to the pure helper `utils/video.ts`; behaviour unchanged) | Vídeo (cover) | ADAPTED |
| Vimeo differentiated treatment | yes | yes | yes (own scrim + “Vimeo” label) | adapt (same helper) | Vídeo (cover) | ADAPTED |
| Local elegant fallback | yes | yes | yes (“Pega un enlace” / “Vista previa”, falling back to author cover then template image) | adapt (same helper) | Vídeo (cover) | ADAPTED |
| Play interaction inside the block | yes | yes | yes (in-block `iframe`, autoplay on click) | reuse | Vídeo | ALREADY_PRESENT |

### 3.7 Editor UX, cross-format writing, blocked items

| Lovable capability | Exists in reference | Exists in current Magic | Visible in current UI | Action | Final visible location | Status |
|---|---|---|---|---|---|---|
| Magic FloatingToolbar / Más / MobileSheet chrome | yes | yes | yes | preserve — no new surfaces were created | existing Magic chrome | ALREADY_PRESENT |
| Magic mutations → Magic service | yes | yes | yes | preserve | existing Magic native actions | ALREADY_PRESENT |
| Canonical mutations → `SemanticCommand` → canonical patch adapter → canonical service | n/a (Lovable has no canonical document) | yes, **internally**: `types/semantic-commands.ts`, `adapters/canonical-adapter.ts`, `adapters/canonical-patcher.ts`, `pageCanonicalService` | **no** — canonical documents still render through `pages/CanonicalReadOnlyPage.tsx`, and `MagicEditorApp` does not forward `onCanonicalDocumentChange` / `onCanonicalPublish` to `EditorProvider` | expose in a later, explicitly sequenced step (see §5.1) | — | BLOCKED_WITH_REASON |
| Shared visual controls never imply shared serialization | — | yes — `setProp` / `select` / `commit` branch on document kind, and a canonical document never writes a Magic `PageDoc` (the new `updateDoc` is an explicit no-op there) | yes | preserve | `contexts/EditorContext.tsx` | ALREADY_PRESENT |


## 4. Implemented deltas (files)

| File | Change |
|---|---|
| `utils/styles.ts` | `mediaTreatmentFromProps` now forwards `cropX`/`cropY` (they were dropped, so free crop never reached the shared media engine); `mediaPhotoStyle` passes the stored `fit` through instead of hardcoding `cover` |
| `components/editor/EditableImage.tsx` | restored drag-to-pan free crop (`useFreeImagePan`) next to the shared engine style |
| `components/editor/EditableText.tsx` | restored the `kind: 'text' \| 'price'` prop (fixes the `CardBody` type error and makes the price contract reachable) |
| `hooks/useEditableElement.ts` | price elements are inline-editable (`inlineText = text \| price`); badge labels open on double-click, like CTAs |
| `components/templates/BioTemplate.tsx` · `BusinessTemplate.tsx` · `PortfolioTemplate.tsx` | restored `VerifiedNameCheck` beside the name/byline/title; correct `LucideIcon` typing with a real fallback icon; removed the dead `b.type === 'hero'` hero-spacing ternary |
| `components/editor/controls/HeroVariantPicker.tsx` | `quote` thumbnail differentiated from `fullBleed` → 30/30 unique thumbnails |
| `components/editor/EditableAvatar.tsx` | `square` now renders `0px` radius (previously identical to `rounded`) |
| `components/editor/useSelectionActions.tsx` | avatar shape picker: circle / rounded / square / arch; gallery layout options single-sourced |
| `components/editor/AdvancedPanel.tsx` | hero “Fusión” reuses the shared 5-mode picker; avatar shape labels corrected; `ed.canonicalHistory` → `ed.canonicalEditing` |
| `components/cards/CardAdvanced.tsx` | real card layouts instead of invalid variant ids; reorder disabled for canonical documents; `ed.canonicalEditing` |
| `contexts/EditorContext.tsx` | `EditorValue` now exposes `updateDoc` and `canonicalEditing` — the two holes that made ported controls crash or fail type-check |
| `components/blocks/GalleryGrid.tsx` | exports `galleryLayouts` (the renderer’s own layout list) |
| `components/blocks/GenericBlock.tsx` + **new** `utils/video.ts` | video resolution / cover / label extracted into a pure, testable helper; behaviour unchanged |
| `__tests__/mediaExposureContract.test.ts` | hero contract updated from 10 to the real 30 variants (+ uniqueness) |
| **new** `__tests__/bridge4Exposure.test.ts` | 21 assertions over the whole requested exposure matrix |
| **new** `__tests__/heroVariantRender.test.tsx` | mounts the real editor document 30× and proves 30/30 distinct compositions and 30/30 distinct thumbnails |

A whitespace-only pass removed trailing spaces from the 13 files flagged by
`git diff --check` (including one line of `FuxionAssistant.tsx`); no code changed
in that pass.

## 5. QA evidence

| Gate | Result |
|---|---|
| Bridge 1 tests (host write boundary) | PASS — `MagicProductionEditorHost.bridge.test.tsx` 4/4 |
| Bridge 2/3 tests (adapters, patcher, magic document, session) | PASS — `adapters.test.ts` 7/7 · `canonical-patcher.test.ts` 7/7 · `magic-document.test.ts` 2/2 · `document-session.test.ts` 5/5 |
| Bridge 4 tests (new) | PASS — `bridge4Exposure.test.ts` 21/21 · `heroVariantRender.test.tsx` 3/3 |
| Updated media contract | PASS — `mediaExposureContract.test.ts` 7/7 |
| **Focused vitest total** | **8 files · 56 tests · all passing** (`src/isolated/magic-page-editor` + `src/features/magic-page-editor-production`) |
| Hero 30/30 visible · selectable · visually different | PASS — `heroVariants` = 30 unique ids with 30 unique labels/hints; 30 mounts of the real document produce 30 distinct compositions with `data-hero` stripped; 30 distinct thumbnails |
| Bio 8/8 · Business 8/8 · Portfolio 8/8 · Mini Gallery 5/5 | PASS — asserted by id against the required list |
| catalog 8 · page 8 · portfolio 8 · menu 6 · store 6 | PASS |
| hero overlay / fusion / crop / zoom | PASS |
| avatar crop / zoom / badge colour / badge beside name | PASS (badge beside name now renders in all three templates) |
| card optional fields / card media | PASS |
| gallery variants / video URL + cover | PASS |
| Focused TypeScript | 1272 → **1253** error lines repo-wide; every error caused by a Bridge 4 target was removed (`EditableText`/`CardBody` price contract, `ed.updateDoc`, `ed.canonicalHistory`, `BoxIcon`-as-type, dead `hero` comparisons). New/edited files `utils/video.ts`, `EditableImage.tsx`, `EditableText.tsx`, `GenericBlock.tsx` report **0** errors. The remaining baseline is pre-existing (`TS4111` from `noPropertyAccessFromIndexSignature`, plus older admin/basic-template code) |
| Client build | PASS — `vite build` ✓ built, client assets emitted |
| SSR / Nitro build | PASS — `.vercel/output/functions/__server.func/index.mjs` + `nitro.json` generated (`nitro` preset `vercel`) |
| `git diff --check` | PASS (exit 0) |
| Focused ESLint | No new error-level finding. The subtree carries a **pre-existing** baseline: 4325 `prettier/prettier` + 26 other findings, including untouched files (`pages/Editor.tsx`, `TopBar.tsx`, `FamilyCard.tsx`, `data/templates.ts` also fail `prettier --check`). Files created by Bridge 4 **are** `prettier --check` clean |


## 6. Blocked / intentionally not changed

### 6.1 Editing canonical documents inside the common Magic UI — BLOCKED_WITH_REASON

The semantic boundary is fully implemented (`SemanticCommand` →
`applyCanonicalPatch` → `pageCanonicalService`) but nothing connects it to the UI:

- `features/magic-page-editor-production/MagicProductionEditorHost.tsx` accepts
  `onCanonicalDocumentChange` / `onCanonicalPublish` and passes **neither** to
  `MagicEditorApp`; `MagicEditorApp` forwards only `canonicalDocument` /
  `canonicalIsNew` to `EditorProvider`.
- `contexts/EditorContext.tsx` refuses canonical writes by design (`checkWrite`),
  so unknown props and document commits are ignored for canonical documents.
- `pages/Editor.tsx` renders `CanonicalCanvas` (`pages/CanonicalReadOnlyPage.tsx`)
  for canonical documents, and that component declares
  `data-bridge-write="disabled"`.
- The repository’s own Bridge-1 test freezes this contract: *“opens canonical in
  the common UI without Magic write callbacks or no-edit writes”*.

Enabling it is a separate, explicitly sequenced step (canonical save, publish,
undo and validation), and it is outside the capability list of this task. Because
canonical and Magic documents deliberately share no serializer, exposing the
shared visual controls over a canonical document without that step would be a
silent data-loss risk. The sharing rule itself is already honoured: every Magic
control branches on document kind, and the new `updateDoc` is an explicit no-op
for canonical documents (with the affected buttons disabled rather than dead).

### 6.2 Prettier formatting of `src/isolated/magic-page-editor` — pre-existing

ESLint reports 4325 `prettier/prettier` findings in that subtree. Untouched files
(`pages/Editor.tsx`, `components/editor/TopBar.tsx`, `components/cards/FamilyCard.tsx`,
`data/templates.ts`) fail `prettier --check` as well, i.e. the subtree was imported
with its own style and has never been reformatted. Reformatting it would rewrite
the whole port in one commit and hide the Bridge 4 delta, so it was left as-is.
Files created by Bridge 4 are `prettier --check` clean.

### 6.3 Repository-wide TypeScript baseline — pre-existing

`tsc --noEmit` reports ~1250 error lines across the repo, dominated by `TS4111`
(`noPropertyAccessFromIndexSignature` is enabled) in files that are out of scope
(admin panels, basic-template, `lib/direct-page-editor`, `premium-template-studio`
engine). Bridge 4 removed every error it was responsible for and reduced the total
from 1272 to 1253 lines; the edited code paths add none.

## 7. Definition of done — self assessment

| Requirement | State |
|---|---|
| Portada > Variante exposes all 30 variants, each with its own thumbnail and a real visual difference | **yes**, proven by test |
| Hero media controls (free crop X/Y, continuous zoom, quick positions, overlay levels + colour, fusion none/fade/dominant/halo/organic) | **yes**, hero was already complete; the same crop/zoom/overlay now also reaches cards, galleries and gallery photos |
| Avatar (shapes incl. square, crop/zoom/position, overlay, badge on avatar, badge colour, badge beside name independently) | **yes** |
| Page variants Bio 8 / Business 8 / Portfolio 8 / Mini Galería 5, content preserved, no new routes | **yes** |
| Card families catalog 8 / page 8 / portfolio 8 / menu 6 / store 6 with shared layouts, optional fields, media | **yes** |
| Gallery layouts fila / mosaico / carrusel / masonry / stacked + photo selection + crop/zoom | **yes** |
| Video URL, cover, crop/position, YouTube thumbnail, Vimeo treatment, local fallback, in-block play | **yes** |
| Magic FloatingToolbar / Más / MobileSheet preserved; no second Inspector, no Power Editor mount, no Lovable shell | **yes** — the only new surfaces are pure helper modules and tests |
| Canonical mutations stay on `SemanticCommand` → patch adapter → canonical service | **preserved**; the UI wiring for canonical editing remains deliberately read-only (see §6.1) |
| Shared visual controls never imply shared serialization | **yes** — adaptation happens at the prop-bag / semantic-command boundary, never by sharing a document shape |
| All Bridge 1–4 tests, builds and `git diff --check` | **PASS** |

No work was started on the separate “Magic Visual Expansion” folders.

## 8. Bridge 4.1 canonical write reconciliation

This section supersedes the earlier Bridge 4 conclusion that canonical editing
was blocked. The earlier conclusion was correct for the exact working-tree
state it inspected, but the Bridge 3 report described the semantic write layer
as if it were already exposed through the common UI. The two reports were
therefore measuring different layers: Bridge 3 had the patcher/history/service
pieces, while Bridge 4 found that the final UI/host exposure was incomplete.

### 8.1 Actual write path after the targeted fix

`/pages/$pageId/edit` mounts `MagicProductionEditorHost`. For a canonical
envelope, `createPageEditorSession()` returns `CANONICAL_V1` (or `NULL` for a
new page) with `canWrite: true`. The host passes
`onCanonicalDocumentChange` and `onCanonicalPublish` to `MagicEditorApp`, and
`MagicEditorApp` now forwards them to `EditorProvider`.

The real mutation path is:

`Magic-facing selection/control` → `EditorContext` semantic target →
`SemanticCommand` → `applyCanonicalPatch()` → canonical history `present` →
`onCanonicalDocumentChange()` → debounced `pageCanonicalService.saveDraft()`.

Publish flushes the pending canonical draft, then calls
`pageCanonicalService.publish()`, which writes the validated canonical snapshot
to `pages.published_template_config` and increments `published_revision`.
The public renderer resolves the published snapshot, never the draft. The
Magic path remains independent: `MagicEditorStateV1` →
`serializeMagicEditorState()` → `magicPageService`; canonical flows never call
that serializer or Magic service.

### 8.2 Reconciled defects

- `MagicEditorApp` declared canonical callbacks but did not forward them.
- The host checked for the nonexistent kind `"CANONICAL"`, so canonical save
  and publish callbacks returned before calling the service.
- The canonical canvas advertised `data-bridge-write="disabled"` and the
  adapter reported `readOnly: true`.
- The stale `checkWrite()` read-only guard was removed; canonical writes now
  use the semantic boundary, while Magic-only `PageDoc` operations remain
  blocked for canonical documents.
- `canonical-patcher.ts` read `target.id`, while the canonical contract emits
  `targetId`. The patcher now accepts the canonical field and the legacy test
  shape at its boundary.
- The canvas now renders the canonical history `present`, so successful edits
  are visible before persistence returns.

### 8.3 Evidence

- Bridge 4.1 component integration: canonical text edit and visual zoom through
  `EditorProvider`, semantic patch, save callback, undo/redo, publish callback,
  and no Magic callbacks: **PASS**.
- Magic host regression: Magic callbacks remain present and canonical pages
  receive only canonical callbacks: **PASS**.
- Canonical persistence/service validation, public published-snapshot bridge,
  Bridge 1 session tests, Bridge 2 adapter tests, Bridge 3 patcher tests and
  Bridge 4 exposure tests: **64/64 PASS across 10 files**.
- Production build: **PASS**.
- `tsc --noEmit`: repository baseline remains failing in unrelated existing
  admin/basic-template/direct-page/router files; no new diagnostics were
  reported for the Bridge 4.1 files or their focused test path.

### 8.4 Files changed for Bridge 4.1

`src/isolated/magic-page-editor/MagicEditorApp.tsx`,
`src/isolated/magic-page-editor/contexts/EditorContext.tsx`,
`src/features/magic-page-editor-production/MagicProductionEditorHost.tsx`,
`src/features/magic-page-editor-production/document-session.ts`,
`src/isolated/magic-page-editor/adapters/canonical-adapter.ts`,
`src/isolated/magic-page-editor/adapters/canonical-patcher.ts`,
`src/isolated/magic-page-editor/pages/CanonicalReadOnlyPage.tsx`, plus the
Bridge 1/2/3/4 regression tests and the new
`canonicalWriteFlow.test.tsx` integration test.

### 8.5 Git state at completion

- Branch: `codex/ui-migration-phase-1a-shell-home`
- HEAD: `5c99328654c67b3e214a0cd50ef8f2be640523e1`
- Working tree: already heavily modified before this reconciliation; no reset,
  checkout, discard, rebase, amend or force-push was performed.
- Bridge 1–4 implementation and test artifacts listed above are present only
  in the working tree relative to HEAD (some are tracked modifications and
  some are untracked files). Existing unrelated modified/untracked files were
  preserved.

### 8.6 Gate

`PASS` for the canonical write path, save/publish separation, Magic regression,
focused tests and build. `READY_FOR_MAGIC_VISUAL_EXPANSION`.
