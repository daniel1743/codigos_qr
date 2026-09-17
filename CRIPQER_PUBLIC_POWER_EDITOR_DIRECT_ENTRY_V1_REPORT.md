# CRIPQER PUBLIC POWER EDITOR DIRECT ENTRY V1

**Task ID:** `CRIPQER_PUBLIC_POWER_EDITOR_DIRECT_ENTRY_V1`  
**Status:** `IMPLEMENTED — CONTROLLED PUBLIC ENTRY PIVOT`  
**Success gate:** `CRIPQER_PUBLIC_POWER_EDITOR_GUIDED_ENTRY_RUNTIME_PASS_FROZEN`

## Public entry

- Landing authentication continues to use `/editor`.
- When an authenticated user has no profile, `/editor` creates one
  owner-scoped starter document using the existing `createDemoConfig()` premium
  template inside the existing canonical envelope.
- The user then enters `PowerEditorHost` directly. No Engine V2 generation,
  Smart Pages request or onboarding questionnaire runs.
- Existing profiles keep their current destination behavior, including legacy
  Basic Editor compatibility and the internal onboarding invitation route.

## Guided editor tour

- Added a contextual five-step coachmark tour for the first-use starter.
- Template selection and canvas selection require real user interaction before
  advancing; tools, style and finish use existing editor controls.
- Skip and completion persist in local storage, and the tour does not block
  editor interaction. Template option, tools and style targets use existing
  sidebar controls with additive data attributes only.
- Positioning is viewport-aware and uses the same controls on mobile layout.

## Preserved

- `/onboarding-test`, Engine V2, Smart Pages, Generation Inspector,
  Black Box, provider integrations and the old onboarding implementation remain
  available for internal QA.
- No canonical schema, renderer architecture, authentication or database
  migration was changed.

## Verification

- Directed TypeScript filtering found no new errors in the guided tour,
  sidebar, route integration or starter creation path.
- Global `npx tsc --noEmit` remains non-green because of existing unrelated
  errors in the repository, including persistence diagnostics and legacy route
  files.
- Automated authenticated desktop/mobile browser proof was not run in this
  environment; the runtime visual gate remains pending.

