# Premium Mobile Navigation Drawer

Modified by Codex - MOBILE-NAV-DRAWER-PREMIUM-2026

## Scope

The drawer is mobile-only and is mounted globally from the root route. It is hidden on public delivery/profile routes such as `/d/*` and `/p/*` so it does not interfere with secure downloads or public profile viewing.

## Architecture

Single source of truth:

- `progress`: `0..1`
- `mode`: `closed | dragging | settling | open`
- active route: TanStack Router pathname

The same progress drives:

- drawer translation
- main content translation
- main content radius
- main content shadow
- main content overlay
- drawer inactive overlay

## Gesture Model

Open:

- edge pointer down within the left edge zone
- horizontal axis lock after movement threshold
- progress follows the finger continuously

Close:

- drag left from drawer or displaced main surface
- tap displaced surface overlay
- hamburger/close button
- Escape key
- navigation item selection

Release:

- settles by progress plus velocity
- uses CSS transition as the spring-like settle path
- reduced motion removes transition duration

## Data Sources

Profile header:

- avatar: `profiles.avatar_url`
- cover: `profiles.banner_url`
- name: `profiles.display_name`, then user metadata/email fallback
- alias: `profiles.slug` or `profiles.public_id`

Permissions:

- admin: `isUserAdmin` plus `isAdminEmail`
- premium: `getPremiumOverrideByEmail` or `getUserEntitlements`

## Routes

Connected routes:

- `/`
- `/editor`
- `/profile`
- `/encrypted-documents`
- `/admin` only when authorized
- public profile CTA uses real slug/public id when available

## Scroll Lock

When progress is greater than zero, body scroll is locked and the main surface is visually frozen to the viewport. Drawer content keeps vertical scrolling through its own `overflow-y-auto`.

## Accessibility

- hamburger has `aria-label`, `aria-expanded`, and `aria-controls`
- active item uses `aria-current="page"`
- Escape closes the drawer
- selected state is shown with full-row surface treatment, not icon color alone

## QA Notes

Real gesture QA is required on device or browser emulation. Static build validation cannot prove direct-manipulation fidelity, scroll lock, or interruption behavior.
