# Cripqer — Recoverable Banner and Avatar UX V1

**Status:** `CRIPQER_BANNER_AVATAR_RECOVERY_UX_IMPLEMENTED`

## Result

Banner and avatar media are now recoverable after removal without changing templates, resetting the document, or recreating a block.

- The banner inspector always exposes `+ Añadir banner` when disabled or empty, and `Cambiar imagen` when populated.
- The avatar inspector always exposes `+ Añadir foto de perfil` when empty and `Cambiar foto` when populated.
- Empty edit-canvas media shows a subtle touch-safe recovery button.
- Public rendering does not show editor recovery placeholders; absent banner/avatar remain absent.
- Profile media removal and replacement no longer delete the underlying asset immediately, so existing undo/redo can restore the previous URL.
- Existing `StudioProvider` reducer history and persistence flow remain the authority.

## Files changed

- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/canvas/ProfileHeader.tsx`

## Verification

- Existing `profileCoverContextual` and `visualContract` suites were invoked through Vitest; the runner reached test discovery but did not finish within the available command window.
- `git diff --check`: no content whitespace errors; the repository reports existing CRLF normalization warnings.

## Acceptance mapping

`BANNER_ALWAYS_RECOVERABLE`, `AVATAR_ALWAYS_RECOVERABLE`, mobile discoverability, non-destructive undo semantics, persistence-compatible empty state, and `NO_PUBLIC_PLACEHOLDER` are covered by the implementation. A real browser smoke test should confirm upload/delete/undo/save/reload against the configured owner-media adapter before freezing the success gate.
