# Cripqer — Phase 5 Button, CTA and Container Independence V1

**Status:** `CRIPQER_PHASE_5_BUTTON_CTA_CONTAINER_INDEPENDENCE_IMPLEMENTED`

## Result

Button and CTA styling now has an explicit item-vs-group boundary where the
current schema supports it. Button Group items and Product Grid items can own
their own CTA style override, destination and label while the block style
continues to act as the shared fallback. The existing Hero primary and
secondary CTA style authorities remain independent.

Implemented contract:

- Button Group item `ctaStyle` overrides are edited per item.
- Product Grid item `ctaStyle` overrides are edited per product.
- Renderer precedence is item override → block/shared CTA style → theme
  defaults.
- Booking exposes a truthful CTA destination and uses it only in public mode;
  edit mode remains non-navigating.
- Existing Services, Pricing and Events per-item CTA style controls remain
  canonical and independent.
- Existing contextual targets keep exact button/item focus without adding
  selection state.
- SmartLink and editor action guards preserve non-navigation in edit mode.

## Container behavior

Containers remain layout-only. No new group hover or animation behavior was
introduced, and no button-specific global motion architecture was changed.
The existing `pts-hoverable` surface remains scoped to the rendered child
control rather than a new interactive parent.

## Other CTA surfaces

- Hero primary/secondary: independent label, URL and `CTAStyle` authority.
- Button Group: independent item label, URL, typography and CTA style.
- Services/Pricing/Events: existing item CTA label, URL and style authority.
- Product/Product Grid: label, URL and item CTA style authority.
- Booking: label, destination and style authority.
- Contact: owner-editable visible labels and truthful destinations from Phase 4.
- Featured Media and generic CTA blocks retain their block-scoped CTA style,
  which is truthful because each exposes one CTA surface.
- Floating Actions and Bottom Navigation remain independent item actions;
  their action appearance remains intentionally collection/block-scoped until a
  separate schema decision is made.

## Verification

- Added `buttonIndependence.test.ts` proving one Button Group item's URL and
  style update does not mutate its sibling.
- Existing contextual selection tests remain passing.
- Prettier parses the modified files; legacy formatting warnings remain.
- `git diff --check` remains clean apart from CRLF normalization warnings.
- Full type/build and browser save/reload/public navigation smoke remain
  required before freezing the code/runtime gates.

## Remaining Phase 6 work

Exact easing, global motion timing, hover polish and broader container motion
auditing remain explicitly deferred to Phase 6.
