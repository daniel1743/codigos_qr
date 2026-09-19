# Cripqer — Phase 8 Power Editor Runtime Certification V1

**Status:** `CRIPQER_PHASE_8_RUNTIME_CERTIFICATION_BROWSER_GATE_READY_FRESH_FIXTURE_REQUIRED`

## Certification rule

Phase 8 was treated as an end-to-end runtime certification. React SSR,
construction tests and reducer tests were not used as substitutes for real
save/reload, mobile, media-adapter and public-browser validation.

The final gate is therefore **not frozen**.

## Verified baseline

Phase 7B remains valid:

- 29/29 exposed presets construction and real React render pass;
- 3/3 canonical full-template real React render pass;
- 18/18 Phase 7B supporting tests pass;
- zero known undefined runtime helpers in the audited renderer files.

The Phase 8 supporting regression run also passed:

- **13 test files passed**;
- **122 tests passed**;
- covered preset render sweep, collection lifecycle, Portfolio media,
  profile/header mode, Button Group CTA, contextual selection, public
  renderer, save coordinator and save/publish contracts.

This is code-level supporting evidence, not Phase 8 runtime certification.

## Browser gate evidence

`CRIPQER_PHASE_8_BROWSER_GATE_READY` was reached on the authenticated Chrome
session at `http://localhost:8081/editor`.

- Profile `daniel falcon · /qa-dual-editor-test` loaded the canonical `Modern Bento` document.
- Power Editor DOM, canvas, sidebar, Inspector and all preset controls were visible.
- Click/read was verified by switching to `Móvil`; the Inspector updated to the mobile values.
- A 29-preset browser smoke found all 29 controls and reported no `ReferenceError`, `TypeError` or generic error surface.
- One Hero text edit (`Phase 8 Hero QA`) survived save and browser reload.

The preset smoke used the real editor insertion path. Preset insertion autosaved
the QA document, so it accumulated 74 blocks. The attempted undo sequence did
not restore the prior 28-block document; no claim of restoration is made.

## Controlled fixture baseline — read-only canonical capture

| Field | Observed value | Evidence/status |
|---|---|---|
| Title | `prueba` | `public.pages` row |
| Page type | `menu` | `public.pages` row |
| Page ID | `7ee36173-67df-45cc-9695-743113a18122` | Authenticated browser tab inventory |
| Edit route | `/pages/7ee36173-67df-45cc-9695-743113a18122/edit` | Authenticated browser tab inventory |
| `public_id` | `nP4gSJr` | `public.pages` row |
| slug | `null` | `public.pages` row |
| Initial block count | `5` | persisted `template_config.editorConfig.blocks.length` |
| Draft/published state | draft (`published=false`, revision `0`) | `public.pages` row |
| Starter identity | `restaurant-visual`, but pre-fix creator signature | persisted `template_config` |

No Phase 8 mutation was started after this read. The metadata baseline is
captured, but the content is stale/pre-fix and must not be treated as a
post-fix Menu starter PASS.

## Runtime status matrix

| Area | Status | Evidence |
|---|---|---|
| 29 preset render safety | PASS from Phase 7B | Real React SSR sweep |
| 8 family interactive runtime | BLOCKED | Browser gate ready, but only the 29-preset no-error smoke completed; family save/reload did not |
| Hero text save/reload | PASS | Edited `Phase 8 Hero QA`, observed `Guardado`, reloaded, and observed the text in the canvas/structure |
| Page-type Menu starter mapping | BLOCKED | Supplied route `a4114cc7-fd1a-44fd-b01b-a8846728ea87` hard-reloaded, but canonical row is `sofia` and still contains `Shop`/creator copy; not accepted as fresh post-fix evidence |
| Save/reload across all families | BLOCKED | Browser document was contaminated by autosaved preset insertion before the family matrix completed |
| 3 full-template end-to-end flows | BLOCKED | Not exercised after the browser gate became ready |
| Owner-media upload/persistence | BLOCKED | Upload/replace/clear flow not exercised; no adapter-backed evidence |
| Collection lifecycle save/reload | BLOCKED | No complete browser add/edit/reorder/delete/undo/redo cycle |
| Desktop contextual selection | BLOCKED | Not exercised as an exact item-to-Inspector matrix |
| Mobile contextual selection | BLOCKED | Breakpoint button was verified, but 360/390/430px viewport evidence is absent |
| CTA editor/public parity | BLOCKED | Not exercised against public output |
| Header mode persistence | BLOCKED | Custom-header ↔ full-Hero save/reload was not exercised |
| Motion/hover/reduced motion | BLOCKED | No complete visual preference matrix |
| Keyboard focus | BLOCKED | Not exercised |
| Public parity | BLOCKED | No public browser comparison |

## Runtime continuation blocker

The original environment blocker was cleared by the authenticated handoff.
The remaining blocker is fixture integrity: the supplied Menu route is
operational, but its canonical row is titled `sofia` and persisted before the
latest semantic repair. It must not be mutated to manufacture evidence.
Destructive collection deletion, owner-media upload/removal, publishing, and
public parity were not performed without a clean controlled fixture.

Phase 8B found the safe fixture path at `/pages/new`. A fresh post-fix child
page must be created through that path and read canonically before starting the
remaining matrix; the current stale route and all pre-fix evidence pages remain
untouched.

## No repairs applied

No P0/P1 product defect was proven by Phase 8 runtime evidence, so no code or
schema repair was applied in this phase. Existing Phase 7B fixes and the
repository's prior changes were preserved.

## Required continuation to close Phase 8

Resume with a functioning local browser session and execute the specified
matrix:

- one interactive save/reload flow for each of the eight preset families;
- collection add/edit/reorder/delete/undo/redo/save/reload;
- owner-media upload, replace, undo, clear and reload;
- desktop and 360/390/430px mobile contextual selection;
- CTA editor/public destination and style parity;
- custom-header ↔ full-Hero switching and persistence;
- desktop hover, reduced-motion and keyboard focus;
- representative public parity for all families and all three templates.

Only after those paths produce browser evidence may the
`CRIPQER_POWER_EDITOR_TEMPLATE_PRODUCTIZATION_RUNTIME_PASS_FROZEN` gate be
claimed.

Authentication, Pages, analytics, custom URLs, Engine V2, Smart Pages,
Dashboard, landing and global asset garbage collection were not touched.
