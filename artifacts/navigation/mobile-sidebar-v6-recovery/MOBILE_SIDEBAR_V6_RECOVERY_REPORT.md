# MOBILE-SIDEBAR-V6-RECOVERY-02

## Scope

Recovered the Premium Mobile Sidebar v6 behavior in the active application code. No desktop navbar, editor, gallery, template, or bottom nav behavior was intentionally changed in this recovery pass.

## Files Changed

- `src/components/navigation/PremiumMobileNavDrawer.tsx`
- `src/routes/__root.tsx`

## Evidence From Code

- Geometry constants are present in `PremiumMobileNavDrawer.tsx`: `MAX_WIDTH_CAP = 340`, `MENU_OVERLAP = 14`, `DEAD_ZONE = 8`, `HORIZONTAL_INTENT_RATIO = 1.2`, `OPEN_VELOCITY = 0.45`, `CLOSE_VELOCITY = -0.45`, `POSITION_THRESHOLD = 0.4`, `ANIMATION_MS = 260`.
- Width calculation uses `Math.min(window.innerWidth * 0.84, MAX_WIDTH_CAP)`.
- Drawer width applies `maxWidth + MENU_OVERLAP`.
- Open transform reaches `translate3d(327.6px, 8px, 0) scale(0.965)` on a 390px viewport.
- Drag uses direct progress-based transforms and disables transition while dragging.
- Touch support is explicit through `touchstart`, `touchmove`, `touchend`, and `touchcancel`.
- Controller key `__cripqerMobileSidebarV6Recovery` is installed for the hydrated mobile shell.
- Inert/focus isolation is maintained with `menu.inert`, `main.inert`, `aria-hidden`, Escape close, and outside overlay close.
- Route isolation is implemented by `PrivateMobileNavigationShell` in `src/routes/__root.tsx`; public `/`, `/p/*`, and `/d/*` do not get the private mobile nav shell.

## QA Results

- `npm run build`: passed with exit code 0.
- Playwright mobile viewport: 390 x 844, touch enabled.
- `/` isolation:
  - `shell: false`
  - `trigger: false`
  - `drawer: false`
- `/template-bank` initial:
  - `controller: true`
  - `expanded: false`
  - `menuWidth: 341.6px`
  - `menuInert: true`
  - `mainTransform: matrix(1, 0, 0, 1, 0, 0)`
- After trigger open:
  - `expanded: true`
  - `mainTransform: matrix(0.965, 0, 0, 0.965, 327.6, 8)`
  - `radius: 38px`
  - `scrimOpacity: 0.2`
- After Escape:
  - `expanded: false`
  - `mainTransform: matrix(1, 0, 0, 1, 0, 0)`
- After outside click:
  - `expanded: false`
  - `mainTransform: matrix(1, 0, 0, 1, 0, 0)`
- During CDP touch drag from the left edge:
  - `transform: matrix(0.983974, 0, 0, 0.983974, 150, 3.663)`
  - `transitionDuration: 0s`
- After touch end:
  - `expanded: true`
  - `transform: matrix(0.965, 0, 0, 0.965, 327.6, 8)`

## Notes

- The working tree contains unrelated pre-existing edits in other files. They were not reverted or modified for this task.
- Public `/p/*` and `/d/*` routes can depend on data-backed route behavior locally; isolation for those paths is enforced by route code rather than used as blocking smoke-test navigation.
