# Cripqer — Phase 6 Motion, Hover and Container Polish V1

**Status:** `CRIPQER_PHASE_6_MOTION_HOVER_CONTAINER_POLISH_IMPLEMENTED`

## Motion inventory and conflict found

The primary coupling defect was in `TemplateRenderer`: the resolved block
hover class and press-feedback class were applied to a wrapper containing the
entire block component. A block-level `soft-scale`, lift or press therefore
could transform a whole button group, card grid or collection when the user
perceived only one child as interactive.

## Changes

- Removed hover and press transforms from the structural renderer wrapper.
- Preserved block entry animation, sticky shadow and floating entry behavior.
- Kept child-level `pts-hoverable` as the visual hover authority.
- Added subtle hover/press classes to Hero buttons, CTA buttons, Booking and
  product/card surfaces where the child is the visible interactive surface.
- Reduced soft-scale from `1.025` to `1.0125` and lift from `-3px` to `-2px`.
- Hover effects now activate only for fine pointers through
  `@media (hover: hover) and (pointer: fine)`, avoiding sticky touch hover.
- Added `:focus-visible` feedback without layout-changing dimensions.
- Existing `prefers-reduced-motion: reduce` rules continue to disable motion,
  transforms and transitions.

## Behavior contract

- Structural containers no longer scale, lift or press all children.
- Button/card hover is local to the element carrying the interaction class.
- Siblings do not receive the transform from a hovered child.
- Edit-mode selection remains owned by the existing BlockFrame/contextual
  target architecture.
- Public navigation and public rendering architecture were not changed.

## Verification

- Contextual and button-independence suites pass: 11 tests passed.
- Prettier successfully parses the touched TSX/CSS files; existing formatting
  baseline warnings remain.
- `git diff --check` reports no content errors apart from existing CRLF
  normalization warnings.
- Browser visual smoke remains required for Hero, Button Group, Portfolio,
  Services, Product Grid, Pricing and Carousel on desktop/mobile, including
  keyboard focus and reduced-motion preferences.

Remaining visual inconsistencies are limited to legacy inline transitions and
component-specific decorative effects; the global motion system, data model,
selection architecture and content were intentionally not redesigned.
