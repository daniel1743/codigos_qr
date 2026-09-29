/**
 * F6 — Shared button treatments for the authenticated app shell surfaces.
 *
 * These are NOT a new design layer. Every string below is the verbatim class
 * recipe already approved in F1–F5 and duplicated across migrated surfaces:
 *
 *  - `cqPrimaryButton`   ← `createPageCta` in `src/routes/pages.tsx` (F3)
 *  - `cqSecondaryButton` ← `secondaryClass` in `src/components/home/PageAssetCard.tsx` (F2)
 *  - `cqTileButton`      ← compact action rows in F2 `PageAssetCard` / F4 `QRStudio`
 *
 * Sizes differ on purpose in the original code (min-h-12 vs min-h-11 vs h-10);
 * the variants below preserve the approved rhythm instead of inventing new ones.
 */

/** Solid Magic blue CTA (F3 pages.tsx, verbatim). */
export const cqPrimaryButton =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-cq-sm bg-cq-blue px-5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)] transition-colors hover:bg-cq-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200 disabled:cursor-not-allowed disabled:opacity-60";

/** White outlined action (F2 PageAssetCard secondaryClass, verbatim). */
export const cqSecondaryButton =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-cq-sm bg-white px-3 text-[13.5px] font-semibold text-cq-ink ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue disabled:cursor-not-allowed disabled:opacity-50";

/** Soft blue tile action (F2 icon-tile family, cq-blue-50 surface). */
export const cqSoftButton =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-cq-xs bg-cq-blue-50 px-3 text-[13px] font-semibold text-cq-blue transition-colors hover:bg-cq-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 disabled:cursor-not-allowed disabled:opacity-50";

/** Destructive ghost row — tones already present in the legacy documents list. */
export const cqDangerButton =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-cq-xs bg-white px-3 text-[13px] font-semibold text-red-600 ring-1 ring-cq-line transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50";

/** Square icon-only control (F4 icon controls, cq-subtle → cq-blue on hover). */
export const cqIconButton =
  "grid h-9 w-9 shrink-0 place-items-center rounded-cq-xs text-cq-subtle transition-colors hover:bg-cq-canvas hover:text-cq-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 disabled:cursor-not-allowed disabled:opacity-50";
