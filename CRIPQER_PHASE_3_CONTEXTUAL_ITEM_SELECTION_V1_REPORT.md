# Cripqer — Phase 3 Contextual Item Selection V1

**Status:** `CRIPQER_PHASE_3_CONTEXTUAL_ITEM_SELECTION_IMPLEMENTED`

## Result

Canvas selection now has an edit-only semantic child-target path while
`selectedBlockId` remains the canonical parent authority. A collection target
is derived from `blockId`, collection name, stable `itemId` and optional field
role; it is never persisted and never enters reducer history.

The target path selects the owning block and emits a one-shot Inspector focus.
The Inspector resolves the exact target when available and otherwise falls back
to the stable item anchor, so reorder follows the same item ID rather than a
stale array index. Delete naturally removes the anchor and leaves the parent
selection safe; undo restores the item and its anchor.

## Covered canvas surfaces

- Portfolio items, including item media.
- Services cards and service image surfaces.
- Testimonials cards.
- Product Grid cards.
- Carousel slides/images.
- Links item surfaces and Button Group buttons.
- Hero existing text, media and CTA targets remain on the prior contextual
  architecture.

`ContextualItemTarget` uses `display: contents` in edit mode, stops only the
child event needed to prevent BlockFrame from stealing selection, and is absent
from public rendering. SmartLink remains inert in edit mode and normal public
navigation is unchanged.

## Architecture reused

- `RenderContext` carries the edit-only collection callback.
- `TemplateRenderer` forwards it without adding document state.
- `PremiumTemplateStudio` keeps parent selection in the existing reducer and
  calls `requestInspectorFocus` for the contextual target.
- `inspectorFocus` owns the stable target format.
- Inspector item anchors use `blockId:itemId` and are not array-position based.

## Verification

- Added pure target identity tests in
  `src/premium-template-studio/__tests__/contextualItemSelection.test.ts`.
- `git diff --check` reports no content whitespace errors; existing CRLF
  normalization warnings remain.
- Prettier parsing passed for the edited ActionBlocks file after fixing the
  wrapper syntax; the repository has its existing formatting baseline.
- A full TypeScript check reached Node heap exhaustion (`EXIT:134`) before
  producing diagnostics. The code-test success gate therefore remains pending.
- Browser smoke remains required for desktop/mobile taps, exact Inspector
  scrolling, save/reload, delete/undo and public interaction parity.

## Remaining scope

The remaining collection renderers should receive the same target wrapper in a
follow-up expansion for Pricing, FAQ, Timeline, Events, Tabs, Social, Floating
Actions and Bottom Navigation. Independent button styling and motion/hover
behavior remain Phase 5/6 work as specified.

`CRIPQER_PHASE_3_CONTEXTUAL_ITEM_SELECTION_CODE_TEST_PASS_FROZEN` and
`CRIPQER_PHASE_3_CONTEXTUAL_ITEM_SELECTION_RUNTIME_PASS_FROZEN` remain pending
until the type/test runner and browser matrix complete.
