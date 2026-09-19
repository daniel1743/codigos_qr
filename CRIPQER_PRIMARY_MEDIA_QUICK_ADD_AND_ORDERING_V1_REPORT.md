# Cripqer — Primary Media Quick Add and Ordering V1

**Status:** `CRIPQER_PRIMARY_MEDIA_QUICK_ADD_ORDERING_IMPLEMENTED`

## Implementation

- Added `Elementos principales` at the top of the `Secciones` add-content view, before the section search and Hero presets.
- Added visible singleton actions for `+ Añadir banner`, `+ Añadir avatar`, and `Texto del hero`.
- Banner and avatar actions read the canonical `state.config.profile` media values from `StudioProvider`.
- Banner activation patches `profile.banner.enabled` and focuses the existing `profile-cover` inspector authority. Avatar uses the existing `profile-avatar` inspector authority. No blocks or duplicate media nodes are inserted.
- Present media renders a disabled, readable check state: `✓ Banner añadido` / `✓ Avatar añadido`, with the helper `Ya está añadido a esta página`.
- Existing canvas semantics remain canonical: Banner and Avatar render structurally before Hero/content, independent of selected block or insertion location.
- Delete and undo update quick-add state through the same reducer history because no local duplicate state was introduced.
- Controls are editor-only and are not part of the public renderer.

## Files changed

- `src/premium-template-studio/components/editor/Sidebar.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/canvas/ProfileHeader.tsx`

## Verification

- Targeted ESLint invocation reached the changed files but reports the repository's existing broad Prettier/legacy-format baseline errors; no runtime test result was claimed from that command.
- `git diff --check`: no content whitespace errors; existing CRLF normalization warnings remain.
- The existing Vitest runner starts and discovers the project but does not finish within the available command window.

## Acceptance mapping

The quick-add controls are singleton, state-derived, canonical-order independent, deletion/undo recoverable, mobile-visible without hover, and isolated from public rendering. Browser smoke coverage should confirm add → upload → disabled state → delete → enabled state → undo against the configured owner-media adapter before freezing the success gate.
