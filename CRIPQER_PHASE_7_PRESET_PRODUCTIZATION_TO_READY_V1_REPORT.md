# Cripqer — Phase 7 Preset Productization to READY V1

**Status:** `CRIPQER_PHASE_7_PRESET_PRODUCTIZATION_CODE_CERTIFIED`

## Summary

The exposed preset catalog contains 29 presets in eight families. The existing
type-based authorities from Phases 1–6 now cover the preset surfaces without a
parallel editor or preset-specific document model:

- 29 presets before: 0 certified READY under the previous strict audit.
- 29 presets after: 29 code-certified READY candidates.
- PARTIAL at construction/authority level: 0.
- BROKEN: 0.
- Full templates: 3 remain runtime candidates pending the same smoke matrix.

“Code-certified READY candidate” means the preset constructs valid canonical
blocks and routes its known surfaces through the existing Inspector, reducer,
media, contextual target, CTA and renderer authorities. The runtime freeze is
not claimed until save/reload and public parity are exercised in a browser.

## Preset matrix

| Preset | Family | Text | Media | Collection lifecycle | Contextual selection | Style | CTA | Motion | Persistence | Public parity | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Medical Profile Hero | Hero | Ready | Ready | N/A | Ready | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Professional Trust Hero | Hero | Ready | Ready | Button group ready | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Executive Split Hero | Hero | Ready | Ready | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Creator Editorial | Hero | Ready | N/A | Social ready | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Creator Full Image | Hero | Ready | Ready | N/A | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Creator Bento Intro | Hero | Ready | Ready | Social ready | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Services Bento | Services | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Services Cards | Services | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Services Editorial | Services | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Services Compact | Services | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Portfolio Bento | Portfolio | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Portfolio Gallery | Portfolio | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Portfolio Editorial | Portfolio | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Reviews Cards | Reviews | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Featured Testimonial | Reviews | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Trust Grid | Reviews | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Product Spotlight | Products | Ready | Ready | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Product Grid Premium | Products | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Product Bento Showcase | Products | Ready | Ready | Add/edit/reorder/delete | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Booking Simple | Booking | Ready | N/A | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Booking Split | Booking | Ready | N/A | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Booking Premium Card | Booking | Ready | N/A | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Featured Video | Media | Ready | Replace/remove | N/A | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Music Spotlight | Media | Ready | Replace/remove | N/A | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Media Bento | Media | Ready | Replace/remove | N/A | Ready | Ready | N/A | Candidate | Candidate | READY candidate |
| Contact Minimal | Contact | Ready | N/A | Floating actions N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Contact Card | Contact | Ready | N/A | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Contact + Map | Contact | Ready | N/A | N/A | Ready | Ready | Ready | Candidate | Candidate | READY candidate |
| Contact + Floating CTA | Contact | Ready | N/A | Floating actions ready | Ready | Ready | Ready | Candidate | Candidate | READY candidate |

## Authority mapping

- Text and typography use existing block fields, `InlineText`,
  `TypographyOverrideEditor` and Phase 4 item overrides.
- Media uses `AssetField` and the owner-media adapter; Portfolio and Gallery
  retain their non-destructive lifecycle behavior.
- Collections use Phase 2 shared controls and reducer history.
- Child selection uses Phase 3/3B stable item targets.
- CTA labels, destinations and item styles use Phase 5 authorities.
- Container hover and motion use the Phase 6 local-child boundary.
- Save/reload and public output remain the canonical config/renderer path.

## Verification

- Added `presetProductization.test.ts`: all 29 presets construct valid blocks,
  retain unique block IDs and survive JSON serialization; all eight family
  counts are asserted.
- Existing Phase 2–6 tests remain the supporting contracts.
- Runtime browser certification remains required for every family: customize,
  upload/replace/remove media, reorder/delete/undo, save/reload, mobile touch,
  and public render parity.

## Exact remaining gaps

- No code-level preset construction gaps remain.
- Runtime persistence/public parity has not been exercised for all 29 presets.
- Full templates still need end-to-end smoke because they combine multiple
  preset surfaces.
- Phase 6 visual QA still needs real browser checks for hover, keyboard focus,
  touch and reduced-motion preferences.

Phase 5 button independence and Phase 6 motion polish remain intentionally
scoped as existing authorities; no new schema or authentication architecture
was introduced.
