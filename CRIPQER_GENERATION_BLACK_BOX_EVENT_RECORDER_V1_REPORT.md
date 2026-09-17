# CRIPQER GENERATION BLACK BOX EVENT RECORDER V1

**Task ID:** `CRIPQER_GENERATION_BLACK_BOX_EVENT_RECORDER_V1`  
**Status:** `PARTIAL — QA EVENT LOG AND EXPORT ADDED; FULL E2E TRACE NOT FROZEN`  
**Success gate:** `CRIPQER_GENERATION_BLACK_BOX_EVENT_RECORDER_RUNTIME_TRACE_PASS_FROZEN`

## Added

- QA trace IDs now use the `CRPQ-BLACKBOX-XXXX` format.
- The existing `/onboarding-test` Generation Inspector includes an expandable
  Event Log timeline for the trace stages currently captured.
- JSON and NDJSON downloads are available from the Event Log tab.
- No credentials, access tokens, authorization headers or API keys are added
  to the export path.

## Observability boundary

The existing recorder currently captures the onboarding, owner-content,
Smart Pages, host mapping, PAGES_7/Engine input, Engine strategy, visual
authoring, canonical output and renderer declaration stages. This change is
diagnostic-only and does not alter generation, scoring, recipes, persistence,
canonical data or renderer output.

The full 22-event contract remains open: persistence readback, editor load and
effective DOM/CSS require additional non-behavioral runtime hooks and were not
invented or marked as passing by this task. The existing trace service also
reconstructs Engine strategy separately for diagnostic detail; no product
result is taken from that diagnostic reconstruction.

## Verification

- Existing recorder unit coverage remains in place.
- UI/export changes are scoped to the QA-only inspector.
- Authenticated golden reproduction and screenshots were **not run** because
  no Playwright storage state/session is available in this environment.
- No automatic diagnosis or visual fix was applied.
