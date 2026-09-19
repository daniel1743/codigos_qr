# Cripqer — P0 Button Group `applyCTAStyle` Runtime Crash V1

**Status:** `CRIPQER_P0_BUTTON_GROUP_RUNTIME_CRASH_FIXED_FROZEN`

## Result

The Button Group runtime crash caused by `applyCTAStyle is not defined` is
fixed. `ButtonGroupBlock` now imports the existing style helper from
`styleEngine` and renders successfully through the real React server-render
path.

The Phase 5 CTA precedence contract is preserved and now verified at render
time:

1. item `ctaStyle` override;
2. block/shared `style.ctaStyle`;
3. existing theme/default button style.

No schema, reducer, collection lifecycle, contextual selection, auth, pages,
analytics, custom URL, Engine V2, Smart Pages, header mode or motion behavior
was changed.

## Root cause

`applyCTAStyle` was already exported by
`src/premium-template-studio/engine/styleEngine.ts`, but the import list in
`src/premium-template-studio/components/blocks/ActionBlocks.tsx` omitted it.
The Button Group render path invoked the missing identifier when the block was
mounted, producing the reported `ReferenceError`.

The same render path also now applies `block.style.ctaStyle` before
`item.ctaStyle`, restoring the intended shared-style fallback rather than
silently ignoring the Inspector's block-level CTA style.

## Files changed

- `src/premium-template-studio/components/blocks/ActionBlocks.tsx`
- `src/premium-template-studio/__tests__/buttonGroupRuntime.test.tsx`
- `CRIPQER_P0_BUTTON_GROUP_APPLY_CTA_STYLE_RUNTIME_CRASH_V1_REPORT.md`

## Verification

Command:

```text
npx vitest run src/premium-template-studio/__tests__/buttonGroupRuntime.test.tsx src/premium-template-studio/__tests__/buttonIndependence.test.ts src/premium-template-studio/__tests__/contextualItemSelection.test.ts --pool=forks --maxWorkers=1
```

Result: **3 test files passed, 14 tests passed.**

The new runtime render suite covers:

- Button Group with no item override;
- two sibling item overrides with different CTA styles;
- block/shared CTA fallback when an item has no override;
- preservation of independent labels and destinations through actual render.

`git diff --check` reports no content whitespace errors; the repository still
emits its existing CRLF normalization warnings.

## Remaining runtime evidence

The code gate is frozen. A browser smoke check is still recommended for the
Professional Trust Hero / Button Group path and any full template containing
Button Group: open the preset, apply a shared CTA style, override two items,
save/reload, and verify public output. This is validation of the configured
owner-media/persistence environment, not a remaining code defect in this fix.
