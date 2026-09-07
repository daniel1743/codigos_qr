# CRIPQER — PRODUCT ASSET ENTITLEMENT MANIFEST V1 — REPORT

> **Scope:** Classify existing Power Editor assets (blocks, layouts, section
> presets, templates) into STANDARD / PREMIUM and map each to the capability
> that authorizes *new* selection/insertion/application. Pure metadata only —
> no locks, no UI, no renderer/Billing changes.

---

## 1. Blocks (37 total — omissions: 0, duplicates: 0)

### Standard (23)

`hero`, `heading`, `text`, `links`, `featuredLink`, `buttonGroup`, `cta`,
`social`, `video`, `image`, `gallery`, `mediaCard`, `portfolio`, `document`,
`contact`, `qr`, `trust`, `divider`, `spacer`, `services`, `faq`, `product`,
`map`.

### Premium (14)

`stats`, `testimonials`, `pricing`, `timeline`, `featuredMedia`,
`floatingActions`, `productGrid`, `booking`, `calendar`, `events`, `music`,
`carousel`, `tabs`, `bottomNav`.

### Mapping

- Standard block → `standard_blocks`
- Premium block → `premium_blocks`

> Verified directly against `constants/blockDefinitions.ts` (37 registered
> implemented block types). `PLANNED_BLOCK_TYPES` was **not** classified.

---

## 2. Layouts (9 total)

### Standard (3)

`centered`, `compact`, `profile-card`

### Premium (6)

`editorial`, `bento`, `split`, `full-width`, `portfolio`, `executive`

### Mapping

- Standard layout → `basic_layout_selection`
- Premium layout → `advanced_layout`

> IDs verified against `constants/layouts.ts` (exactly these 9 `LayoutId`s).
> Layout classification gates **selection only**; it never prevents rendering
> or preservation of an already-stored premium layout.

---

## 3. Section presets (29 total)

### Standard (16)

`hero-medical-profile`, `hero-professional-trust`, `hero-executive-split`,
`hero-creator-editorial`, `hero-creator-bento-intro`, `services-bento`,
`services-cards`, `services-editorial`, `services-compact`, `portfolio-bento`,
`portfolio-gallery`, `portfolio-editorial`, `product-spotlight`,
`contact-minimal`, `contact-card`, `contact-map`.

### Premium (13)

`hero-creator-full-image`, `booking-simple`, `booking-split`,
`booking-premium-card`, `reviews-cards`, `reviews-featured`,
`reviews-trust-grid`, `product-grid-premium`, `product-bento-showcase`,
`media-featured-video`, `media-music-spotlight`, `media-bento`,
`contact-floating`.

### Mapping

- Standard section → `standard_sections`
- Premium section → `premium_sections`

### Rule applied

**Mixed-section rule:** a preset containing ≥1 premium block is PREMIUM. Premium
blocks present: `featuredMedia`, `booking`, `testimonials`, `stats`,
`productGrid`, `music`, `floatingActions`.

---

## 4. Templates (42 total: 12 base definitions + 30 recipes)

### Standard (7)

`creator-premium-001`, `minimal-card-005`, `ocean-studio-007`, `warm-table-009`,
`medical-minimal`, `beauty-studio`, `portfolio-minimal`.

### Premium (35)

`executive-premium-002`, `modern-bento-003`, `editorial-journal-004`,
`luxury-noir-006`, `graphite-folio-008`, `cloud-corporate-010`,
`midnight-artist-011`, `aurora-tech-012`, `creator-premium`,
`creator-editorial`, `creator-bento`, `executive-premium`,
`professional-trust`, `consultant-editorial`, `medical-premium`,
`medical-booking`, `barber-premium`, `salon-booking`, `restaurant-premium`,
`restaurant-visual`, `cafe-minimal`, `product-launch`, `store-bento`,
`luxury-product`, `fitness-coach`, `personal-trainer`, `fitness-program`,
`artist-premium`, `music-release`, `dj-events`, `agent-premium`,
`property-showcase`, `real-estate-bento`, `portfolio-editorial`,
`portfolio-bento`.

### Mapping

- Standard template → `standard_templates`
- Premium template → `premium_templates`

### Rule applied

A template is PREMIUM when it (a) uses a premium layout, or (b) contains a
premium block / premium section preset (mixed-template rule). The legacy
`premium: boolean` field in `definitions.ts`/`recipeRegistry.ts` was **not** used
as the classifier because it is inconsistent (every recipe hardcodes
`premium: true` regardless of composition). Noted discrepancy: `creator-premium-001`
(base) is STANDARD (standard layout `centered` + standard blocks) while the
`creator-premium` recipe is PREMIUM (contains premium sections); both are named
"Creator Premium" but differ in composition.

---

## 5. Architecture

| Question | Answer |
|---|---|
| Pure metadata? | **YES** (0 network, 0 DB, 0 React, 0 Supabase) |
| Renderer changed? | **NO** |
| Power Editor changed? | **NO** |
| Billing changed? | **NO** |
| Capability Policy Core changed? | **NO** (imports `ProductCapability` *type* only) |

**Decision shape:** `{ classification, requiredCapability }`, where
`classification ∈ { STANDARD, PREMIUM, UNKNOWN }` and `requiredCapability` is a
canonical capability id (or `null` for UNKNOWN). Helpers:
`getBlockEntitlement`, `getSectionEntitlement`, `getTemplateEntitlement`,
`getLayoutEntitlement`, and generic `resolveAssetEntitlement(kind, id)`.

---

## 6. Safety

| Check | Result |
|---|---|
| Unknown asset fails closed (UNKNOWN, never Standard) | **PASS** |
| Premium existing content remains renderable by policy | **YES** (selection metadata only) |
| Manifest controls selection, not rendering | **YES** |

**Preservation:** entitlement controls SELECTION/INSERTION/APPLICATION, never
rendering or storage. A Free user may render and preserve a premium block/layout/
template already present in a canonical config (e.g. generated by Engine V2); they
merely cannot newly add/select/apply it.

---

## 7. Validation

| Check | Result |
|---|---|
| TypeScript (targeted, `--strict`) | **PASS** (exit 0) |
| Selfcheck | **PASS** |
| Assertion count | **309** (0 failed) |

Selfcheck covered: block/layout/section/template counts + disjointness + no
duplicates, per-asset capability mapping, mixed-section rule, fail-closed unknown
for all four kinds, generic resolver dispatch, purity (no identity authority,
arity), and determinism.

---

## 8. Scope

### Files read

- `src/lib/product-entitlements/capabilities.ts` *(READ ONLY — confirmed capability ids)*
- `src/premium-template-studio/constants/blockDefinitions.ts`
- `src/premium-template-studio/constants/layouts.ts`
- `src/premium-template-studio/constants/sectionPresets.ts`
- `src/premium-template-studio/templates/definitions.ts`
- `src/premium-template-studio/templates/recipeRegistry.ts`

*(The `POWER_EDITOR_CAPABILITY_INVENTORY_V1.md` factual inventory from the prior
task corroborated the "37 block types" figure, re-verified directly here against
`blockDefinitions.ts`.)*

### Files created

- `src/lib/product-entitlements/asset-manifest.ts`
- `src/lib/product-entitlements/asset-manifest.selfcheck.ts`
- `CRIPQER_PRODUCT_ASSET_ENTITLEMENT_MANIFEST_V1_REPORT.md` *(this file)*

### Frozen-scope accounting

| Item | Result |
|---|---|
| Existing files modified | **0** |
| Dependencies changed | **NO** |
| Routes changed | **NO** |
| DB changed | **NO** |
| Frozen violations | **NO** |
| Commits / staging | **none** (per git-safety) |

---

## 9. Stop condition review

No stop conditions triggered: the 37 registered block types matched the factual
inventory, all asset IDs were uniquely identified within the authorized read
scope, and no modification to `capabilities.ts`, Power Editor, renderer, Billing,
DB, routes, or dependencies was required.



