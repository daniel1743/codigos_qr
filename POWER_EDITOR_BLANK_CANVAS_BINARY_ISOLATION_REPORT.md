# CRIPQER — BLANK POWER CANVAS BINARY ISOLATION V1 — REPORT

## Objective

Expose a DEV-only binary experiment that distinguishes the existing
CAMERA/Stage path from the same canonical `TemplateRenderer` rendered directly
in a plain scroll container. No camera, renderer, responsive, or persistence
repair was attempted.

## Implemented paths

### CAMERA_ON

Normal behavior remains:

```text
PowerCanvasViewport → Stage → Camera Layer → same TemplateRenderer
```

The normal root is marked `data-camera-debug-mode="CAMERA_ON"` only for the
DEV diagnostic query.

### CAMERA_BYPASS

When all of the following are true:

```text
import.meta.env.DEV === true
window.location.search cameraDebug=bypass
```

the Canvas renders:

```text
plain finite scroll container → same TemplateRenderer
```

The bypass does not mount `PowerCanvasViewport`, Stage, camera transforms,
camera translation, camera scale, or camera positioning. Its container has
`width: 100%`, `height: 100%`, `min-width: 0`, `min-height: 0`, and
`overflow: auto`, with no transform.

Production behavior is unchanged because the bypass is gated by
`import.meta.env.DEV`.

## Config identity proof

Both paths are created from the same `Canvas` render and the same
`state.config` reference. Both use the same `breakpoint`, `previewing` mode,
editing callbacks, and `TemplateRenderer` element. No demo config, fallback
profile, alternate block list, or second renderer was added.

The DEV diagnostic records only:

- URL `profileId`;
- `schemaVersion`;
- block count;
- first five block IDs;
- first five block types;
- breakpoint.

It never prints the full canonical payload.

## DOM proof

`BinaryIsolationDiagnostic` records for the active mode:

- `.pts-page` existence;
- first `.pts-block` existence;
- renderer and first-block `offsetWidth`/`offsetHeight`;
- renderer and first-block bounding rectangle `x`, `y`, `width`, `height`;
- computed `display`, `visibility`, and `opacity`.

The evidence is available in the DEV overlay labelled `DEV camera binary
diagnostics` and in the console entry `[PowerEditor][camera-binary]`.

## Runtime test status

The required browser comparison could not be completed in this run. The
available browser session could not open the local server (`ERR_CONNECTION_REFUSED`)
and the existing editor tab timed out while reading its state. Therefore the
following remain `NOT_VERIFIED`:

- previous `Maximum update depth exceeded` console loop absence;
- CAMERA_ON screenshot and DOM values;
- CAMERA_BYPASS screenshot and DOM values;
- binary visual conclusion.

## Manual runtime URLs

Use the same browser dimensions and breakpoint for both URLs, hard-reload each,
and wait for `Canonical cargado`:

```text
CAMERA_ON:
http://localhost:8080/editor?profileId=ff0cd302-07a4-4106-9a13-a14f9ded2f4b

CAMERA_BYPASS:
http://localhost:8080/editor?profileId=ff0cd302-07a4-4106-9a13-a14f9ded2f4b&cameraDebug=bypass
```

Report only:

```text
Normal: page visible YES/NO
Bypass: page visible YES/NO
```

Decision rules:

```text
Normal NO + Bypass YES  → CAMERA_CONFIRMED
Normal NO + Bypass NO   → CAMERA_EXCLUDED
Normal YES + Bypass YES → INTERMITTENT
Normal YES + Bypass NO  → BYPASS_INVALID
```

## Validation

- Prettier on both modified production files: PASS.
- Targeted ESLint on both modified production files: PASS.
- Camera math test: PASS, 1 file, 5 tests.
- TypeScript filtered for `PremiumTemplateStudio` and `PowerCanvasViewport`:
  PASS — no matching errors.
- Full build: not rerun to completion in this experiment; a prior attempt
  reached module transformation and stopped on process memory allocation.
- Runtime DOM/visual comparison: NOT_VERIFIED.

## Recommended next repair

Do not repair either subsystem based on static evidence. First execute the two
manual URLs above and record the binary result. Only then investigate the
subsystem selected by the decision table.

## Files modified

- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `POWER_EDITOR_BLANK_CANVAS_BINARY_ISOLATION_REPORT.md`

## Frozen scope evidence

No changes were made to `TemplateRenderer.tsx`, `StudioProvider`,
`templateReducer`, `BioTemplateConfig`, Engine V2, onboarding, Basic Editor,
canonical persistence, routes, database, dependencies, lockfiles, camera
formulas, Stage sizing, responsive CSS, or Phase 3 behavior.

## Final gate

POWER_EDITOR_BINARY_GATE: INCONCLUSIVE
