# Mobile Sidebar v6 Recovery Notes

## Before

- The active sidebar had been reduced/disabled in practice by route/root integration and previous mobile navigation work.
- Pointer behavior was fragile in local QA: the React-only gesture path did not reliably update the rendered mobile shell after hydration.
- Menu focus isolation was not guaranteed from initial markup; closed markup could briefly expose the drawer before the client effect ran.

## After

- `PremiumMobileNavDrawer` owns the v6 drawer geometry again:
  - max visual width is `min(84vw, 340px)`.
  - menu keeps the `+14px` overlap.
  - main layer opens to `translateX(maxWidth)`, `translateY(8px)`, `scale(0.965)`, `38px` left radius, and `0.20` scrim opacity.
- Gesture recovery uses direct transform updates during drag with transition disabled.
- Native touch events are handled explicitly in addition to pointer events.
- The controller is idempotent across hydration/retries and cleans active listeners, animation frames, timers, overlays, and pagehide listeners.
- Public routes stay isolated from private mobile navigation at the root shell.

## Local QA

- `npm run build`: passed.
- Playwright mobile QA on `/template-bank`: passed for trigger open, Escape close, outside click close, and CDP touch drag.
- Browser QA on `/`: sidebar shell, trigger, and drawer were absent.
- `/p/*` and `/d/*` isolation is enforced in `src/routes/__root.tsx` and inside `PremiumMobileNavDrawer`; those data-backed public routes were not used as blocking UI smoke tests locally.
