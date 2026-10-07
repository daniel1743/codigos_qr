# CRIPQER_APPROVED_CHAT_LANDING_PORT_CLOSE_OUT_V1

**Spec:** `CRIPQER_APPROVED_CHAT_LANDING_EXACT_PORT_V1`  
**Mode:** `STRICT_EXACT_PORT`  
**Date:** 2026-10-07  
**Verdict:** `EXACT_PORT_PARTIAL`

---

## Executive summary

The approved Magic Patterns conversational landing ("aprovada landing chat") was **ported file-for-file** into the TanStack Start host as `src/features/approved-chat-landing/`, its 30 approved assets were deployed unchanged to `public/`, and the whole experience was given a runtime-capable, fully-scoped host shell (wrapper + generated scoped stylesheet + a client-only review route). No component was redesigned, re-implemented, substituted, re-styled or re-worded.

`28` of `39` ported files are **byte-identical (SHA-256) to the reference**; the remaining `11` differ only by documented minimal edits required to compile under this repo's stricter `tsconfig` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`), of which **exactly one is not purely type-level** and that one is runtime-invisible. All 30 approved images are byte-identical.

**Parity was verified at the DOM and behaviour level, not yet at the pixel level.** The port and the frozen reference render **byte-identical DOM** in an in-process SSR pass (discover / converse / editor) and after **every one of 36 button interactions** across those three states in a real DOM (happy-dom). The generated stylesheet covers **483/483** classes the port actually emits with **zero** unscoped selectors leaking into the rest of the app. A real-browser pixel review (desktop + mobile) is **not possible in this environment** (see *Remaining blocks*), so the visual parity gate is **NOT fully closed** and the pre-authorised §8 signature-border taper was deliberately **not** applied.

---

## Source reference location

- Archived source: `COMPRIMIDOS/aprovada landing chat.zip`
- Extracted, read-only, immutable copy kept in-repo: `.approved-chat-landing-reference/` (complete: `src/`, `public/`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig*.json`, `package.json`).
- Reference stack: Vite 5, React 18.3, TypeScript 5.5, **Tailwind CSS v3**, framer-motion 11, lucide-react 0.522.
- Host stack: TanStack Start, React 19, TypeScript 5.8, **Tailwind CSS v4** (CSS-first), framer-motion 13, lucide-react 0.575.

> `.approved-chat-landing-reference/` is the authority for this UI and is never edited. It is excluded from lint/format/typecheck so its bytes cannot drift.

---

## Implementation order actually executed

| Spec step | Name | Status |
|---|---|---|
| 1 | REFERENCE_AUDIT (read-only) | ✅ done |
| 2 | DESTINATION_MAPPING (read-only) | ✅ done |
| 3 | EXACT_VISUAL_PORT (no real services) | ✅ done |
| 4 | VISUAL_PARITY_GATE | ⚠️ DOM/behaviour verified; **browser pixel pass NOT executed** |
| 5 | AUTHORIZED_SIGNATURE_BORDER_REFINEMENT | ⏸️ **not applied** (gate not fully passed) |
| 6–11 | Business context / assistant / MagicPageV1 / editor handoff / auth | ⏸️ not started (phase isolation) |

§30 (phase isolation) and §31 were respected: no backend/service work was started while the UI is still being frozen.

---

## Files copied exactly (byte-identical)

Ported source, identical to `.approved-chat-landing-reference/src/` (SHA-256 match):

- `src/features/approved-chat-landing/App.tsx`
- `src/features/approved-chat-landing/components/AppHeader.tsx`
- `src/features/approved-chat-landing/components/CripqerExperience.tsx`
- `src/features/approved-chat-landing/components/GeneratingStage.tsx`
- `src/features/approved-chat-landing/components/TemplatePreview.tsx`
- `src/features/approved-chat-landing/components/brand/CripqerLogo.tsx`
- `src/features/approved-chat-landing/components/brand/SignatureBorder.tsx`
- `src/features/approved-chat-landing/components/catalog/TemplateCatalog.tsx`
- `src/features/approved-chat-landing/components/catalog/TemplateSheet.tsx`
- `src/features/approved-chat-landing/components/converse/ConverseStage.tsx`
- `src/features/approved-chat-landing/components/converse/InlineTemplates.tsx`
- `src/features/approved-chat-landing/components/converse/MessageItem.tsx`
- `src/features/approved-chat-landing/components/converse/ReadyCard.tsx`
- `src/features/approved-chat-landing/components/discover/TemplateShowcase.tsx`
- `src/features/approved-chat-landing/components/editor/EditorBlocksPanel.tsx`
- `src/features/approved-chat-landing/components/editor/MagicEditor.tsx`
- `src/features/approved-chat-landing/components/editor/RegisterDialog.tsx`
- `src/features/approved-chat-landing/components/templates/TemplateHero.tsx`
- `src/features/approved-chat-landing/components/templates/serviceIcons.ts`
- `src/features/approved-chat-landing/data/business.ts`
- `src/features/approved-chat-landing/data/contentPacks.ts`
- `src/features/approved-chat-landing/data/familyFit.ts`
- `src/features/approved-chat-landing/data/images.ts`
- `src/features/approved-chat-landing/data/templates.ts`
- `src/features/approved-chat-landing/hooks/useCripqerSession.ts`
- `src/features/approved-chat-landing/hooks/useMediaQuery.ts`
- `src/features/approved-chat-landing/utils/seed.ts`
- `src/features/approved-chat-landing/utils/templateStyle.ts`

Approved assets deployed unchanged from `.approved-chat-landing-reference/public/` to `public/` (30 files, all SHA-256 identical):

08fcd094-a3a3-40ba-8775-225bb98c7123.jpg, 0a89d991-d9ce-4d7d-a7a0-c3f394388676.jpg, 13d9dc24-a417-4f4a-ac2d-ae0531baadec.jpg, 23e6e597-9f20-4dc5-bb61-883f646960b3.jpg, 25c41ea0-554d-4065-8c99-c057d780f74d.jpg, 2cd66c1b-0ce2-402f-a0ce-a1a16fc39734.jpg, 38309cd2-ab9a-43c9-8d81-166a9e9873a8.jpg, 408a840f-d60f-4be5-bd82-7d5a3beadbec.jpg, 41d9adbb-77eb-409c-bbaa-4c5612f3c01b.jpg, 44dd6d74-ca4c-417f-8ee1-4d43115400ef.jpg, 5cda359f-e2a9-4b2a-8f25-bc8560b800cf.jpg, 5e051c94-5666-43a4-89ef-303b54f9a3c0.jpg, 7022cd25-0a04-430f-b91d-afa883dbc730.jpg, 71e6a99e-32ca-44db-8973-f94cd27347c4.jpg, 9f912cc0-7a58-4850-9fcb-4d35978172ca.jpg, a47e1212-8547-4932-9ec7-8070e7c472a9.jpg, a61212a8-bfd5-4fcd-be68-793b2bddf74c.jpg, a9de611e-7451-4d6b-a731-abf1b0be9e4a.jpg, b1096a45-1f39-4f89-bbb9-bd18b7b0d888.jpg, b22c63dc-d99a-4dc6-a2e8-9136b2d8679d.jpg, b2a15d0e-f417-45d6-bdcf-b2d002267e0d.jpg, b360ac35-ddad-4142-871c-8269bdaf2451.jpg, b5ce6858-7534-44b7-8a12-30a12eb58813.jpg, d8336d46-a68a-4a1e-9f89-a840ec773565.jpg, e7b01654-a24f-4a32-99de-4801f0701a95.jpg, edf40ac8-4106-48b9-8052-d297b1ece50e.jpg, f2e5381d-28d4-4752-8917-c665a001bc3b.jpg, f3daa79d-b02e-4742-9481-700c730adfcd.jpg, f6608328-b4c0-43d5-95b6-10a571b5662c.jpg, fdbbadea-2793-45e7-94a6-c4649b09b881.jpg

---

## Files wrapped / added by the host (no reference counterpart)

| File | Role |
|---|---|
| `src/features/approved-chat-landing/index.tsx` | **THIN WRAPPER** — imports `./styles/landing.css`, renders `<div className="cripqer-chat-landing"><App/></div>`. Adds the design-token root class only. |
| `src/features/approved-chat-landing/styles/landing.css` | Bridged + scoped stylesheet (see below). |
| `src/routes/landing-chat-parity.tsx` | Client-only review route `/landing-chat-parity?state=discover\|converse\|editor` (`noindex`). The approved entry is **not** wired to the public route yet — see phase isolation. |
| `src/routeTree.gen.ts` | Regenerated by TanStack Router; net diff is **+17 / −0 lines** (only the new route). TanStack Start `declare module` tail preserved. |
| `scripts/generate-approved-chat-landing-css.mjs` | Deterministic generator for the scoped utility block. |
| `CRIPQER_APPROVED_CHAT_LANDING_PORT_MANIFEST_V1.sha256` | Integrity manifest. |

### Why the stylesheet is bridged instead of copied
The reference owns the whole document (its own Tailwind entry + preflight). The host compiles a single Tailwind v4 stylesheet and several existing areas (Magic Editor, premium editor) already use class names `text-ink`, `bg-canvas`, `border-line`, `hover:text-ink`, `font-display`. Registering the reference theme globally would change those areas, so the reference's Tailwind v3 theme and **every utility the port uses** are compiled and emitted **scoped under `.cripqer-chat-landing`**. Structure of `landing.css`:

1. the approved font `@import`, byte-identical, kept first;
2. `[HOST BRIDGE]` rules (page background via `html:has(.cripqer-chat-landing)`, root background/antialiasing, and a two-rule Tailwind-v3 preflight parity for `cursor: pointer` on buttons);
3. the approved custom CSS of the reference, byte-identical (`.no-scrollbar`, the `sig-*` signature-border keyframes/classes);
4. the `GENERATED:REFERENCE-SCOPED-UTILITIES` block (regenerable).

---

## Files adapted (changed-file report, §27)

All 11 files below were copied from the reference and then edited in place. Everything else is byte-identical.

| source_file | destination_file | copied_exactly | hash_match | modifications | reason |
|---|---|---|---|---|---|
| `.approved-chat-landing-reference/src/components/composer/Composer.tsx` | `src/features/approved-chat-landing/components/composer/Composer.tsx` | no | no (`d4192cc892c9eae6…` → `ea561f178d6aaf51…`) | Added `return undefined;` on the effect's early-exit path so the callback satisfies `noImplicitReturns`. Control-flow only; identical runtime behaviour. | see modifications |
| `.approved-chat-landing-reference/src/components/discover/DiscoverStage.tsx` | `src/features/approved-chat-landing/components/discover/DiscoverStage.tsx` | no | no (`52578cbf8b24b820…` → `2c34573b2f16c76f…`) | `BoxIcon` no longer exists in the installed lucide-react (0.575) — replaced the type-only import with the official `LucideIcon`; added `!` on `QUICK_ICONS[i]` for `noUncheckedIndexedAccess`. Identical runtime icons/order. | see modifications |
| `.approved-chat-landing-reference/src/components/templates/ScaledTemplate.tsx` | `src/features/approved-chat-landing/components/templates/ScaledTemplate.tsx` | no | no (`325fe0ab4d3805c9…` → `2e1e1c42cfdf92de…`) | Optional props widened from `x?: T` to `x?: T \| undefined` for `exactOptionalPropertyTypes`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/components/templates/TemplateBlock.tsx` | `src/features/approved-chat-landing/components/templates/TemplateBlock.tsx` | no | no (`6a63f57da0c56f25…` → `3f2ed550ea3730e5…`) | `c.reviews[0]!` non-null assertion for `noUncheckedIndexedAccess`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/components/templates/TemplateCard.tsx` | `src/features/approved-chat-landing/components/templates/TemplateCard.tsx` | no | no (`e22739572127ff4c…` → `347ab01e778f6d20…`) | `index?: number` widened to `index?: number \| undefined` for `exactOptionalPropertyTypes`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/components/templates/TemplatePage.tsx` | `src/features/approved-chat-landing/components/templates/TemplatePage.tsx` | no | no (`1eb0866b5a8e115e…` → `82efcf557a259cde…`) | Optional props widened to `T \| undefined` for `exactOptionalPropertyTypes`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/hooks/useTemplateRotation.ts` | `src/features/approved-chat-landing/hooks/useTemplateRotation.ts` | no | no (`ce3516238e796c03…` → `99787b370144abf5…`) | Two non-null assertions (`SLOT_ORDER[...]!`, `prev[slot]!`) for `noUncheckedIndexedAccess`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/types/cripqer.ts` | `src/features/approved-chat-landing/types/cripqer.ts` | no | no (`45a32396b286de34…` → `d61247575cd6b2ce…`) | `attachment?: Attachment` widened to `attachment?: Attachment \| undefined`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/utils/agent.ts` | `src/features/approved-chat-landing/utils/agent.ts` | no | no (`c2378e788c581658…` → `874424969390f803…`) | `attachment?: Attachment \| undefined` (type-only) AND `heroVariant: t.hero` → `t.hero.variant`. The second edit is the only non-type-only edit in the port: `hero` is a `HeroSpec` object while `heroVariant` is typed `HeroVariant \| null`, so the reference line was a genuine type error (it fails under the reference project's own strict tsconfig too). NOTE: `heroVariant` is written by the prototype agent but never read by any component (3 references total: the type, the initialiser, this writer), so the change is runtime-invisible — confirmed by byte-identical DOM across every tested state. | see modifications |
| `.approved-chat-landing-reference/src/utils/recommend.ts` | `src/features/approved-chat-landing/utils/recommend.ts` | no | no (`ec526762ed299ec2…` → `e592fc24562563ad…`) | Non-null assertions on `first`/`second` for `noUncheckedIndexedAccess`. Type-only. | see modifications |
| `.approved-chat-landing-reference/src/utils/templates.ts` | `src/features/approved-chat-landing/utils/templates.ts` | no | no (`1aaba8d4330d0d69…` → `1d763740d9bc14e3…`) | Non-null assertions on `templates[0]` / `contentPacks[0]` for `noUncheckedIndexedAccess`. Type-only. | see modifications |

**Not copied from the reference at all:**

| Reference file | Disposition | Reason |
|---|---|---|
| `src/index.tsx` | replaced by the host wrapper `index.tsx` | mounts into `#root` via `ReactDOM.createRoot`; the host owns the document and route. Behaviour it contributed is unchanged. |
| `src/index.css` | merged into `styles/landing.css` | the reference stylesheet is reproduced (font import, custom CSS verbatim) plus the host bridge; the Tailwind v3 entry it implied is re-created as the scoped generated block. |
| `src/package.json` | dropped (a copy had been left inside the port and was removed) | it is the reference's own build manifest (React 18.3 / react-router-dom / @radix-ui/react-icons). A nested `package.json` inside `src/` changes Node's module-type resolution for that directory and would confuse the host build. |

---

## Reference hash results

Manifest: `CRIPQER_APPROVED_CHAT_LANDING_PORT_MANIFEST_V1.sha256` (SHA-256, 4 sections: reference source, reference assets, ported source with status, deployed assets).

| Group | Count | Identical | Adapted | Host-only |
|---|---|---|---|---|
| Ported source | 41 | 28 | 11 | 2 |
| Approved assets (public/) | 30 | 30 | 0 | — |

Any reference file intended to be copied exactly retains identical bytes except the 11 documented edits above. No asset was re-encoded, re-cropped or substituted.

---

## Visual parity results

Target was 1:1. Verified with two independent in-process harnesses (no browser needed):

**(a) SSR DOM parity — byte-identical.** Both the port and the frozen reference were transpiled in-process and rendered with the *same* React/framer-motion/lucide instances, then compared byte-for-byte:

| State | Port | Reference | Result |
|---|---|---|---|
| discover | 64 688 chars | 64 688 chars | **identical** |
| converse | 50 058 chars | 50 058 chars | **identical** |
| editor | 24 515 chars | 24 515 chars | **identical** |

**(b) Live-DOM behaviour parity — identical.** With happy-dom, each tree was mounted in isolation and driven through the same script; innerHTML compared after every action. **36/36** single-button interactions (12 discover + 10 converse + 14 editor) produced **identical DOM**, and an 8-step discover sequence (open preview → close → four quick actions → composer focus/typing → send) was identical at every step. Every visual state named in §4 that the prototype reaches (discover desktop, focused composer, template preview, template selected, conversation first turn, contextual options, generating, summary/ready card, editor transition) rendered identically.

**(c) Stylesheet coverage — complete.** Of 483 distinct classes emitted by the port, **483 are covered** by `landing.css`; the only uncovered tokens are `lucide-*` / `sig-root`, which the reference also leaves unstyled. **0** unscoped selectors exist outside `.cripqer-chat-landing`, `.sig-*` and `.no-scrollbar`; `text-ink`, `bg-canvas`, `border-line`, `font-display` are emitted **only** as scoped descendants, so the Magic Editor is unaffected. The generator reproduces `landing.css` byte-identically (`a4efab8c…0947b0`).

**What was NOT verified:** real-browser geometry/scale/typography/animation feel, and responsive breakpoints.

---

## Desktop results

**NOT VERIFIED in a browser.** The port renders the reference's desktop layout under the in-process DOM and the markup is byte-identical to the reference in that layout (the approved `useMediaQuery` resolves to desktop). Pixel-level geometry, spacing, shadows, fonts and animation character could not be compared. No substitute-component or spacing decisions were made to "fix" anything.

## Mobile results

**NOT VERIFIED.** No viewport/mobile pass could be executed. The reference's responsive rules were copied verbatim and are untouched; nothing was normalised or substituted.

## Interaction results

✅ Verified (DOM-level, in-process): template preview open/close, template selection ("Usar este estilo"), all four quick actions, contextual option pills, inline template cards, composer focus/typing/send, template drawer ("Plantillas"), "Ideas", and every editor button (Guardar / Publicar / block panels / Conversación). All identical between port and reference.

⚠️ Not verified: animated transitions (framer-motion timing), hover/focus *visual* states, scroll behaviour, and the exact "Generating" stage timing — these need a real browser.

---

## Business context integration

**Not started (phase isolation).** The reference's own single shared `BusinessContext` and its prototype agent (`utils/agent.ts`, `utils/recommend.ts`, `data/familyFit.ts`, `data/contentPacks.ts`) are ported **verbatim** and left untouched as the parity reference (§16: PROTOTYPE_ONLY). No adapter to production data shapes has been written yet.

## Assistant service status

**Not started.** The approved conversational UI is not yet bound to `Cripqer_Assistant_Service`; the reference's local prototype agent is preserved temporarily for parity/interaction testing, exactly as §16 requires. The UI/action contract (`UPDATE_BUSINESS_CONTEXT`, `RECOMMEND_TEMPLATES`, `SHOW_TEMPLATES`, `PREVIEW_TEMPLATE`, `SELECT_TEMPLATE`, `SHOW_OPTIONS`, `CREATE_PAGE`, `OPEN_MAGIC_EDITOR`, …) is the shape the adapter must satisfy.

## MagicPageV1 status

**Not started.** No `MagicPageDocumentV1` generation adapter was added; `CRIPQER_MAGIC_TEMPLATE_DESIGN_CONTRACT_V1.md` was read as context only. No schema, migration or contract was touched.

## Real Magic Editor handoff status

**Not started.** The port still terminates in the reference's **mock** Magic Editor (`components/editor/MagicEditor.tsx`), which is retained **only** to demonstrate the transition for parity testing (§18) and is explicitly *not* a production editor. The real Magic Editor (`src/isolated/magic-page-editor`, `src/features/magic-page-editor-production`) was **not modified**. The public entry route was therefore deliberately **not** switched over to the port yet.

## Auth status

**Not started / unchanged.** The reference's auth UI (Iniciar sesión → `RegisterDialog`) is ported as a visual-flow reference only; existing Cripqer auth was not replaced, no second auth system was created, no fake auth was hardcoded in production.

---

## Test results

| Check | Command | Result |
|---|---|---|
| TypeScript (whole repo) | `tsc --noEmit` (via TS API) | **1258** diagnostics in 190 files — **0 in any ported/new file** |
| ESLint — new route | `eslint src/routes/landing-chat-parity.tsx` | **0 errors, 0 warnings** |
| ESLint — port | (policy) | ignored by design, hash-protected (see `.prettierignore` / `eslint.config.js`) |
| Prettier | (policy) | port + reference ignored so hashes cannot drift |
| Scoped CSS generator | `node scripts/generate-approved-chat-landing-css.mjs` | runs clean, output byte-identical (deterministic, in sync) |
| SSR parity harness | in-process | 3/3 states byte-identical vs reference |
| Interaction parity harness | in-process (happy-dom) | 36/36 button interactions + 8-step sequence identical |
| CSS coverage | in-process | 483/483 emitted classes covered; 0 unscoped selectors |
| SHA-256 manifest | in-process | 28 identical / 11 adapted / 2 host; 30/30 assets identical |
| `vite build` / `vite dev` / Playwright | — | **could not run** (see Remaining blocks) |

## Preexisting failures

The **1258** TypeScript diagnostics are **pre-existing** and all live outside this work (`src/isolated/magic-page-editor`, `src/lib/direct-page-editor`, `src/premium-template-studio`, `src/features/experimental-premium-editor`, `src/features/magic-page-editor-production`, …). The largest concentrations: `useSelectionActions.tsx` (130), `page-document.ts` (77), `TemplateValidator.ts` (74). Per §28 these were **not** fixed. (The previous hand-off counted 1257; the current count is 1258, still 0 from this port — the delta is outside the port and unrelated.)

---

## Remaining blocks

1. **No shell in this environment.** Every `exec_command`/child-process spawn fails with `CreateProcessAsUserW failed: 5 (Acceso denegado)`. Consequently `npm run dev`, `npm run build`, the ESLint/Prettier CLIs, Vitest and Playwright **cannot be executed**, and no browser can be served. All verification above was therefore done **in-process** through Node APIs (`fs`, `crypto`, `vm`, the TypeScript compiler API, the Tailwind v4 compile API, ESLint's Node API, happy-dom).
2. **Browser-level visual parity gate (step 4) is not fully closed** — no pixel/desktop/mobile pass.
3. **Phases 5–11 are not started** and must not start until the parity gate passes, per §30.
4. **The port is reachable only at `/landing-chat-parity`** (review route), not at the public entry route, because it still ends in the mock editor.

### Known integration risk to re-check when a shell returns
- `landing.css` opens with the approved remote font `@import`. It must stay the **first** statement of whatever CSS chunk Vite emits for the port; Vite normally hoists `@import` to the top of a CSS chunk, but this should be confirmed against the real `vite build` output.

## Unauthorized differences found

**None visual.** No spacing, typography, colour, asset, copy, animation or component substitution was made, and the §8 signature-border taper was **not** applied. Every difference from the reference is enumerated above and is one of:

- the 10 purely type-level edits; or
- the single non-type-only edit — `utils/agent.ts`: `heroVariant: t.hero` → `t.hero.variant` — disclosed explicitly: it is required to satisfy `HeroVariant`, the reference line is a genuine type error under the reference's own strict config, and the field is **never read** by any component, so runtime output is proven unchanged; or
- the host-side files (`index.tsx`, `styles/landing.css`, the review route, the CSS generator) and the dropped reference `package.json`, none of which exist in the approved reference UI.

## Verdict

```
EXACT_PORT_PARTIAL
```

The exact port is **copied, scoped, wired, hash-tracked and verified DOM- and behaviour-identical** to the approved reference, with no unapproved visual change and no substitution. It is not `EXACT_PORT_PASS` only because the target 1:1 **browser pixel/desktop/mobile** parity gate (and the `vite build`/`vite dev` validation) could not be executed in this environment, and phases 5–11 remain deliberately unstarted.

## Next steps (in order)

1. In an environment with a working shell: `npm run typecheck:gate && npm run lint`, then `npm run dev` and compare `/landing-chat-parity?state=discover|converse|editor` against the reference at desktop and mobile widths (step 4 gate).
2. Only after that gate passes: apply the single authorised §8 signature-border taper refinement.
3. Then, and only then, begin phases 6–11 (business-context adapter → assistant service adapter → MagicPageDocumentV1 adapter → real Magic Editor handoff → auth/save/publish), switching the public entry route over at the end.
