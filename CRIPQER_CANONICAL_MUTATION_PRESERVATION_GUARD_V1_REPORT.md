# CRIPQER — CANONICAL MUTATION PRESERVATION GUARD V1 — REPORT

> **Scope:** Implement the pure Canonical Mutation Preservation Guard only.
> **Mode:** STRICT_SURGICAL_PURE_GUARD_CORE — no UI wiring, no lock icons, no
> Billing/routes/persistence/schema changes. Exactly three new files.

---

## 1. Architecture

| Question | Answer |
|---|---|
| Pure core? | **YES** (0 network, 0 DB, 0 React, 0 Supabase, 0 filesystem runtime) |
| Power Editor modified? | **NO** |
| Renderer modified? | **NO** |
| Billing modified? | **NO** |
| Capability Policy Core modified? | **NO** (read-only delegation) |
| Asset Manifest modified? | **NO** (read-only delegation) |
| BioTemplateConfig schema modified? | **NO** |

### Authoritative chain

```
effectiveTier
     ↓
Product Capability Policy  (resolveCapabilityAccess)
     ↓
Asset Entitlement Manifest (get*Entitlement)
     ↓
Mutation Preservation Guard  (this task)
     ↓
future Power Editor enforcement
```

The guard adds **two** pure functions on top of the frozen policy/manifest:

1. `authorizeCanonicalMutation(tier, intent) → MutationAuthorization`
2. `verifyMutationPreservation(before, after, tier, intent) → PreservationResult`

Both delegate downward (never re-encode the Free/Pro matrix, block lists, or
template/layout/section classifications).

---

## 2. Authorization

### 2.1 Intent types (Mutation Intent Contract)

The guard reasons about **intent**, not a bare final config snapshot.

| Category | Intents |
|---|---|
| Field-scoped | `EDIT_CONTENT`, `EDIT_BASIC_STYLE`, `EDIT_AVATAR_BANNER`, `EDIT_MEDIA`, `EDIT_ADVANCED_TYPOGRAPHY`, `EDIT_ADVANCED_LAYOUT`, `EDIT_MANUAL_RESPONSIVE`, `EDIT_ADVANCED_MOTION`, `EDIT_PREMIUM_BACKGROUND`, `EDIT_ADVANCED_CARD_BUTTON` |
| Structural | `ADD_BLOCK`, `DUPLICATE_BLOCK`, `DELETE_BLOCK`, `REORDER_BLOCK`, `TOGGLE_BLOCK_VISIBILITY` |
| Asset application | `APPLY_LAYOUT`, `APPLY_SECTION`, `APPLY_TEMPLATE` |
| Branding | `REMOVE_CRIPQER_BRANDING` |
| Persistence | `SAVE_UNRELATED`, `PUBLISH_UNRELATED` |

### 2.2 Capability delegation

Field-scoped and structural intents delegate to `resolveCapabilityAccess`
(`capabilities.ts`). No Free/Pro matrix is duplicated.

| Intent | Capability |
|---|---|
| `EDIT_CONTENT` | `edit_content` |
| `EDIT_BASIC_STYLE` | `edit_basic_style` |
| `EDIT_AVATAR_BANNER` | `avatar_banner` |
| `EDIT_MEDIA` | `media_assets` |
| `EDIT_ADVANCED_TYPOGRAPHY` | `advanced_typography` |
| `EDIT_ADVANCED_LAYOUT` | `advanced_layout` |
| `EDIT_MANUAL_RESPONSIVE` | `manual_responsive` |
| `EDIT_ADVANCED_MOTION` | `advanced_motion` |
| `EDIT_PREMIUM_BACKGROUND` | `premium_background_effects` |
| `EDIT_ADVANCED_CARD_BUTTON` | `advanced_card_button_styling` |
| `DELETE_BLOCK` / `REORDER_BLOCK` / `TOGGLE_BLOCK_VISIBILITY` | `block_structure` |
| `REMOVE_CRIPQER_BRANDING` | `remove_cripqer_branding` |
| `SAVE_UNRELATED` / `PUBLISH_UNRELATED` | `publishing` |

### 2.3 Asset-manifest delegation

Asset insertion/application delegates to the manifest helpers. Unknown assets
fail closed (`UNKNOWN` → `DENY`).

| Intent | Manifest helper | Standard → capability | Premium → capability |
|---|---|---|---|
| `ADD_BLOCK` / `DUPLICATE_BLOCK` | `getBlockEntitlement` | `standard_blocks` | `premium_blocks` |
| `APPLY_LAYOUT` | `getLayoutEntitlement` | `basic_layout_selection` | `advanced_layout` |
| `APPLY_SECTION` | `getSectionEntitlement` | `standard_sections` | `premium_sections` |
| `APPLY_TEMPLATE` | `getTemplateEntitlement` | `standard_templates` | `premium_templates` |

### 2.4 Expected behavior (verified)

- Free `EDIT_CONTENT` → **ALLOW**; Free `EDIT_ADVANCED_MOTION` → **DENY**.
- Free add **standard** block → ALLOW; add **premium** block → DENY.
- Free **duplicate** standard block → ALLOW; duplicate premium block → **DENY**
  (duplication creates another premium asset instance).
- Free **delete** / **reorder** an existing premium block → **ALLOW** (the user's
  own content is never trapped behind an upgrade).
- Free edit permitted content inside an existing premium block → **ALLOW**.
- Free apply standard template/layout/section → **ALLOW**; premium → **DENY**.
- Pro → **ALLOW** every declared Power visual mutation intent.

---

## 3. Preservation

### 3.1 Protected domains

The guard reasons over seven canonical top-level domains: `layout`, `motion`,
`theme`, `blocks` (structural signature = id + type + order), `profile`,
`settings`, `seo`. (`metadata` is intentionally excluded — it carries the save
timestamp, not a visual/canonical domain.)

### 3.2 Unrelated content edit preservation

For a Free `EDIT_CONTENT`, only `profile` is owned; every other domain must be
byte-for-byte identical. Verified:

- **name may change** (owned) → PASS.
- **advanced/premium layout preserved** → PASS.
- **responsive overrides preserved** → PASS.
- **motion preserved** → PASS.
- **premium background/theme preserved** → PASS.
- **premium block preserved** → PASS.

### 3.3 Accidental data-loss detection (fail closed)

- Motion removed during a content edit → **FAIL** (`motion` violation).
- Premium layout downgraded to `centered` during a content edit → **FAIL**
  (`layout` violation, mapped to `advanced_layout`).

### 3.4 Structural semantics

- Existing premium block content edit → ALLOW.
- Premium block delete → ALLOW.
- Premium block reorder → ALLOW.
- Premium block duplicate → DENY.

### 3.5 Explicit authorized replacement vs unrelated save

A Free user applying an **authorized standard template** may intentionally
replace the domains template application normally owns (layout, theme, blocks,
motion, etc.) — `APPLY_TEMPLATE` owns all of them, so preservation passes. The
**same** config diff under an unrelated `EDIT_CONTENT` save fails preservation.
This is the core distinction between *accidental data loss* and *explicit
authorized replacement*.

### 3.6 No automatic config sanitizer

The guard never deletes, resets, downgrades, normalizes or strips canonical
values. There is no `sanitizeConfigForFree`, no `downgradeConfigForTier`, no
`removePremiumFields`, no `replacePremiumBlocks`, no `stripMotionForFree`, no
`stripResponsiveForFree`. LOCKED means "no authority to intentionally mutate",
not "strip existing canonical data".

---

## 4. Security (fail-closed)

| Case | Result |
|---|---|
| Invalid tier (e.g. `platinum`) never obtains Pro mutation | **PASS** (treated ≤ Free) |
| Unknown mutation intent | **DENY** (`UNKNOWN_INTENT`) |
| Unknown asset | **DENY** (`UNKNOWN_ASSET`) |
| Unknown capability | **DENY** (`UNKNOWN_CAPABILITY`) |

---

## 5. Validation

| Check | Result |
|---|---|
| TypeScript (targeted, `--strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`) | **PASS** (exit 0) |
| Mutation Guard selfcheck | **PASS** |
| Assertion count | **78** (0 failed) |

Selfcheck covered: free unrelated content-edit preservation, accidental motion
strip, accidental layout downgrade, existing premium block semantics (edit /
reorder / delete / duplicate), asset insertion gating (standard vs premium for
blocks / sections / templates / layouts), explicit standard-template replacement
vs unrelated save, Pro allow-all, fail-closed unknown intent/asset/invalid tier,
and purity (determinism, no identity/network/DB/React/Supabase authority,
function arity).

---

## 6. Scope

### 6.1 Files read (authorized)

- `src/lib/product-entitlements/capabilities.ts`
- `src/lib/product-entitlements/asset-manifest.ts`
- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/engine/TemplateBuilder.ts`
- `src/premium-template-studio/engine/TemplateValidator.ts`
- `POWER_EDITOR_CAPABILITY_INVENTORY_V1.md`
- `CRIPQER_PRODUCT_CAPABILITY_POLICY_CORE_V1_REPORT.md`
- `CRIPQER_PRODUCT_ASSET_ENTITLEMENT_MANIFEST_V1_REPORT.md`
- `src/lib/product-entitlements/capabilities.selfcheck.ts` *(convention reference)*
- `src/lib/product-entitlements/asset-manifest.selfcheck.ts` *(convention reference)*
- `tsconfig.json`, `package.json` *(optional validation)*

### 6.2 Files created

- `src/lib/product-entitlements/mutation-guard.ts`
- `src/lib/product-entitlements/mutation-guard.selfcheck.ts`
- `CRIPQER_CANONICAL_MUTATION_PRESERVATION_GUARD_V1_REPORT.md` *(this file)*

### 6.3 Frozen-scope accounting

| Item | Result |
|---|---|
| Existing files modified | **0** |
| Dependencies changed | **NO** |
| Routes changed | **NO** |
| DB changed | **NO** |
| Billing changed | **NO** |
| Power Editor changed | **NO** |
| Frozen violations | **NO** |
| Commits / staging | **none** (per git-safety) |

---

## 7. Stop condition review

No stop conditions were triggered: `BioTemplateConfig`, `templateReducer`, Power
Editor UI, Capability Policy Core, Asset Manifest, Billing, and DB were all left
untouched; no dependency was added; and safe preservation semantics were fully
determinable from the authorized files.

---

## 8. Non-goals honored

- Not integrated with `templateReducer`, `StudioProvider`, Sidebar, or Inspector.
- No lock icons, no upgrade modal.
- No Billing connection, no persistence, no canonical config rewrite.
- No Free sanitizer / no downgrade normalizer.

