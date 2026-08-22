# Mobile Native UX Standard

// Modified by Codex — MOBILE-NATIVE-UX-RESPONSIVE-11

## Core Rule

Mobile is not a compressed desktop. Vertical scroll is allowed. Horizontal page scroll is forbidden.

## Layout Rules

- Every page container must fit within `100vw`.
- Child content must use `min-w-0` when placed inside flex/grid rows.
- Tables remain desktop-only when their columns cannot fit. Mobile uses cards.
- Action menus must cap width to the viewport.
- Long filenames, URLs, and labels must truncate or wrap inside their card.

## Touch Rules

- Primary touch targets should be approximately 44px high/wide.
- Hover-only actions must have visible touch equivalents.
- Direct touch should select the object before asking the user to navigate menus.

## Contextual Controls

Mobile editing uses levels:

- Level 0: canvas dominant, no selection controls.
- Level 1: compact bottom contextual toolbar.
- Level 2: one target's property controls in a limited bottom sheet.
- Level 3: full picker only when needed.

Do not open a 70-80vh generic editor panel as the first response to a tap.

## Safe Areas

Mobile top/bottom controls should respect:

- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`

## Responsive Table To Card Pattern

Desktop may keep full tables. Mobile must convert each row to a card containing:

- header with object identity and status
- body with the important metadata
- footer or overflow menu with actions
