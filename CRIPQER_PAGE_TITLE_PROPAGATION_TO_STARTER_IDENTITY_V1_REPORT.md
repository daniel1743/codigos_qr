# Cripqer — Page Title Propagation to Starter Identity V1

**Modo:** `TARGETED_PRODUCT_CONSISTENCY_FIX`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_PAGE_TITLE_PROPAGATION_TO_STARTER_IDENTITY_V1`

## Forensic finding

The loss occurred at the page-starter construction boundary. The recipe
builder correctly selected the `restaurant-visual` starter, but its semantic
transform set the Hero identity to `Casa Mediterránea` after the page title was
known. `createPageStarterConfig` only propagated the title to `metadata.name`
and `profile.name`, not to the primary visible Hero identity.

The protected forensic fixture confirms the issue:

- canonical page title: `QA Menu Clean Final`;
- page type: `menu`;
- starter: `restaurant-visual`;
- visible Hero title: `Casa Mediterránea`;
- supporting heading: `Nuestro menú`.

The fixture was not modified.

## Fix

At `createPageStarterConfig` in
`src/components/power-editor/pageStarterConfig.ts`, the supplied trimmed
title is now applied to the `content.title` of the existing Hero block after
the starter is built. Existing template IDs, block IDs, composition, images,
supporting copy, CTAs, themes and page types remain unchanged. Metadata and
profile identity continue to receive the same title.

No publish, routing, QR, Bio, RPC or global preset behavior was changed.

## Verification

Targeted and regression suite:

```text
3 test files passed
10 tests passed
```

Covered cases include:

- menu → `QA Menu Title`;
- catalog → `Fusion Biotech`;
- portfolio → `Daniel Fotografía`;
- services → `Barbería Daniel`;
- menu supporting heading remains `Nuestro menú`;
- catalog supporting heading remains `Productos destacados`;
- restaurant starter remains free of the old primary `Casa Mediterránea` identity;
- catalog and portfolio remain distinct;
- restaurant semantic render regression remains green.

Lint passed for both modified files after Prettier formatting.

## Runtime status

The new code is unit/regression verified. Runtime certification still requires
a fresh page through `/pages/new` after this patch, with hard reload. The
existing forensic fixture remains protected and was not used as post-fix
evidence.

## Result

- `PAGE_TITLE_CANONICAL_PERSISTENCE_PASS`: supported by existing create flow and tests.
- `PAGE_TITLE_VISIBLE_IDENTITY_PASS`: code/regression PASS; fresh runtime pending.
- `PAGE_TITLE_HARD_RELOAD_PASS`: `NOT_VERIFIED` in this execution.
- `MENU_STARTER_NO_SEMANTIC_REGRESSION`: PASS in regression suite.
- `CATALOG_STARTER_NO_SEMANTIC_REGRESSION`: PASS in starter tests.
- `PORTFOLIO_STARTER_NO_SEMANTIC_REGRESSION`: PASS in starter tests.

The frozen success gate is not emitted until the fresh runtime flow and reload
are observed.

**Status:** `TARGETED_FIX_CODE_PASS_RUNTIME_CERTIFICATION_PENDING`  
**STOP_AFTER:** `true`
