# Color Integration Reconciliation Manifest

Prepared from the read-only comparison of outer preservation branch `backup/dirty-main-before-color-merge` with validated integration commit `df5d5b81956014fcd2ff10d85db9a334de2dfecf`. No reconciliation has been performed.

## Files requiring review

| File | Local preservation commit | Validated integration version | Difference and recommended direction |
|---|---|---|---|
| `src/isolated/magic-page-editor/__tests__/m2_4MasterCardParity.test.tsx` | `1ae224d` | `df5d5b8` | Local assertions enumerate 16 canonical palette IDs; integration assertions cover the 72 family variants and legacy palette compatibility. Keep integration coverage and add assertions for the 16 local palette choices only if those remain supported after reconciliation. |
| `src/isolated/magic-page-editor/components/blocks/ButtonGroup.tsx` | `1ae224d` | `df5d5b8` | Local adds an empty-state panel and `forceGroupStyles`; integration adds color-aware group styling. Preserve the integration color behavior and port the empty state and style flag only where they do not override palette-derived styling. |
| `src/isolated/magic-page-editor/components/editor/controls/PalettePicker.tsx` | `1ae224d` | `df5d5b8` | Local replaces the family/variant picker with a flat 16-palette grid and omits the family navigation and unified text-color panel. Retain the integration family and variant model; selectively adapt its layout while preserving text-color behavior. |
| `src/isolated/magic-page-editor/data/visualPresets.ts` | `1ae224d` | `df5d5b8` | Local replaces the 72 family variants, legacy aliases, and semantic tokens with 16 direct palettes and static card tokens. Keep the integration data model and compatibility aliases; map any desired local palettes into it instead of removing the family model. |
| `src/isolated/magic-page-editor/hooks/useThemeTokens.ts` | `1ae224d` | `df5d5b8` | Differences are mostly formatting, with small restructuring around custom hex tones and overrides. Use the integration version as the base and port only behavior that can be shown to change runtime output; avoid carrying formatting-only churn. |
| `src/isolated/magic-page-editor/types/editor.ts` | `1ae224d` | `df5d5b8` | Local removes `familyId`, `variantId`, `PaletteSemanticTokens`, and `PaletteFamily`, which the integration palette model uses. Keep the integration types and add compatible fields only if required by retained local behavior. |
| `src/components/route-guards/ProtectedRoute.tsx` | `7c3b908` | `df5d5b8` | Local obtains the Supabase client during render and adds it to effect dependencies; integration obtains it inside the effect. Keep the integration lifecycle unless client identity stability is confirmed, then review whether the local dependency change is necessary. |

## Preservation references

- Outer branch: `backup/dirty-main-before-color-merge`
- Local Magic editor versions: commit `1ae224d` (`Preserve Magic editor local work`)
- Local `ProtectedRoute.tsx`: commit `7c3b908` (`Preserve catalog and route work`)
- Validated integration: `df5d5b81956014fcd2ff10d85db9a334de2dfecf`

This manifest is documentation for a later reconciliation task. It does not apply the integration commit or change code semantics.
