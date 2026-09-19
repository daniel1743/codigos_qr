# Cripqer — Header Mode and Full Hero Contract V1

**Status:** `CRIPQER_HEADER_MODE_FULL_HERO_IMPLEMENTED`

## Result

The editor now has one derived, mutually exclusive header contract:

- `custom`: profile Banner and Avatar remain optional structural media.
- `full-hero`: the single authored `hero` block is the visible header and owns its background/media, text and CTAs.

The mode is derived from the canonical block list; no second persisted mode flag was introduced. Banner and Avatar values remain in profile state when switching to a full Hero, so returning to the custom header can recover them.

## Implemented

- Hero presets replace the existing Hero instead of appending a duplicate. A preset applied from the custom header is explicitly labelled `Cambiar a ...`.
- The renderer suppresses the custom Banner, Avatar and ProfileHeader surfaces while a Hero exists, including the full-bleed Banner path that previously could leak through.
- Banner and Avatar quick-add controls remain visible but become disabled in full-Hero mode with truthful copy:
  - `Este Hero ya reemplaza el banner.`
  - `Este Hero ya incluye/controla la foto principal.`
- Primary and secondary Hero CTAs have independent contextual Inspector targets while retaining the same canonical Hero block and independent editable fields.
- Existing Hero text, avatar, foreground image/background and separate CTA controls remain the editing authority; public rendering receives no editor-only target attributes.

## Files changed

- `src/premium-template-studio/engine/headerMode.ts`
- `src/premium-template-studio/components/editor/Sidebar.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/inspector/inspectorFocus.ts`
- `src/premium-template-studio/__tests__/headerMode.test.ts`

## Verification

- Added pure contract tests for mode derivation, custom-to-Hero switching, Hero replacement, and singleton cardinality.
- Existing Hero contextual tests remain compatible with the callback's optional extra target argument.
- `git diff --check` reports no content whitespace errors; the repository still emits existing CRLF normalization warnings.
- The targeted Vitest run reached Vite route discovery but did not complete in the available command window; the TypeScript check likewise did not finish. No passing runtime gate is claimed here.
- Public renderer architecture, auth, analytics, page routing, custom URLs, Engine V2 and Smart Pages were not changed.

## Acceptance mapping

`CUSTOM_HEADER`/`FULL_HERO` mutual exclusion is derived from canonical state; custom media is preserved internally; visible public output contains one header; full Hero is singleton; Hero presets are alternatives; quick-add state is truthful and state-derived; both CTA controls are independently selectable/editable; no editor recovery placeholder is introduced into public output.

The requested `CRIPQER_HEADER_MODE_FULL_HERO_CODE_TEST_PASS_FROZEN` gate remains pending until the repository's test/type-check runner completes and browser smoke confirms custom media → Hero preset → custom recovery, CTA selection on both buttons, save/reload, and public rendering against the configured owner-media adapter.
