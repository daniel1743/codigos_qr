# Cripqer — Phase 7B All Presets and Full Templates Render Safety Sweep V1

**Status:** `CRIPQER_PHASE_7_ALL_PRESETS_RENDER_SAFE_CODE_FROZEN`

## Certification result

The exposed preset catalog and the three canonical full template definitions
were executed through the real React renderer. Construction success and render
success were measured separately.

| Scope                                                     | Construction | Real React render | Result |
| --------------------------------------------------------- | -----------: | ----------------: | ------ |
| Exposed presets                                           |        29/29 |             29/29 | PASS   |
| Canonical full templates                                  |          3/3 |               3/3 | PASS   |
| Unhandled render exceptions after repair                  |            — |                 0 | PASS   |
| Known undefined runtime helpers in audited renderer files |            — |                 0 | PASS   |

The preset test mounts each generated preset configuration through
`TemplateRenderer`; it does not stop at JSON construction or block-type
inspection. The full-template test renders each complete definition as one
composition rather than rendering its blocks individually.

## Runtime exceptions found and repaired

### 1. Button Group / `applyCTAStyle`

`Professional Trust Hero` and full configurations containing Button Group could
reach `ButtonGroupBlock`, which called `applyCTAStyle` without importing it.
The repair imports the existing helper and preserves the CTA precedence:

1. item CTA override;
2. block/shared CTA style;
3. theme/default style.

The block/shared fallback was also wired into the same render expression so a
configured `style.ctaStyle` is not silently ignored.

### 2. Product Card / `applyTypographyOverride`

`Product Spotlight` reached `ProductCardBlock`, which called
`applyTypographyOverride` without importing it from `styleEngine`. The repair
adds the missing import. This was a separate runtime-only defect exposed by
the complete sweep.

No ErrorBoundary, renderer skip, weakened assertion or preset exclusion was
used.

## Files changed for Phase 7B

- `src/premium-template-studio/components/blocks/ActionBlocks.tsx`
- `src/premium-template-studio/components/blocks/PremiumBlocksII.tsx`
- `src/premium-template-studio/__tests__/presetRuntimeRenderSweep.test.tsx`
- `CRIPQER_PHASE_7B_ALL_PRESETS_RUNTIME_RENDER_SWEEP_V1_REPORT.md`

The Button Group regression test and its report from the preceding P0 remain
in place and continue to pass.

## Automated verification

Runtime sweep command:

```text
npx vitest run src/premium-template-studio/__tests__/presetRuntimeRenderSweep.test.tsx --pool=forks --maxWorkers=1
```

Result: **1 test file passed, 2 tests passed**, covering all 29 presets and
all 3 full templates through `renderToStaticMarkup(TemplateRenderer)`.

Supporting regression command:

```text
npx vitest run src/premium-template-studio/__tests__/presetRuntimeRenderSweep.test.tsx src/premium-template-studio/__tests__/presetProductization.test.ts src/premium-template-studio/__tests__/buttonGroupRuntime.test.tsx src/premium-template-studio/__tests__/buttonIndependence.test.ts src/premium-template-studio/__tests__/contextualItemSelection.test.ts --pool=forks --maxWorkers=1
```

Result: **5 test files passed, 18 tests passed.**

Static helper audit:

```text
npx eslint <six audited renderer files> --rule 'prettier/prettier:off' --rule 'react-refresh/only-export-components:off' --quiet
```

Result: exit code 0. The repository's broad formatting baseline was excluded
from this focused undefined-helper check; `git diff --check` remains clean
apart from existing CRLF normalization warnings.

## Browser smoke

Against the configured local editor at `http://localhost:8081/editor`, the
minimum smoke matrix was exercised without an error surface:

- Professional Trust Hero / Button Group;
- Services Bento;
- Portfolio Bento;
- Product Spotlight;
- Booking Simple;
- Featured Video;
- Contact Minimal;
- Creator Premium, Executive Premium and Modern Bento full templates.

The browser showed no `ReferenceError`, `TypeError` or generic error surface
after each selection. The smoke did not perform save/reload persistence,
mobile interaction or public publish validation; those remain Phase 8 product
runtime coverage.

## Phase 8 readiness

Phase 7B is code-certified render-safe. Phase 8 can now focus on persistence
and interaction rather than hidden renderer crashes:

- save/reload for every preset family and the three full templates;
- mobile/touch Inspector and contextual selection;
- public output parity and navigation;
- owner-media upload/replace/remove persistence;
- reduced-motion and keyboard visual checks.

Authentication, Pages, analytics, custom URLs, Engine V2, Smart Pages, schema,
global motion architecture and unrelated product features were not changed.
