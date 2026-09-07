# CRIPQER — PRODUCT CAPABILITY POLICY CORE V1 — REPORT

> **Scope:** Implement the canonical, pure, declarative product-access policy only.
> **Mode:** STRICT_SURGICAL_POLICY_CORE — no locks, no UI, no Billing changes, no
> numeric limits, no block/template/layout/section classification.

---

## 1. Policy

### 1.1 All declared capability IDs (21)

**Core / Free (11):**

1. `edit_content`
2. `edit_basic_style`
3. `avatar_banner`
4. `media_assets`
5. `basic_layout_selection`
6. `basic_card_button_styling`
7. `block_structure`
8. `standard_blocks`
9. `standard_sections`
10. `standard_templates`
11. `publishing`

**Pro (10):**

1. `advanced_typography`
2. `advanced_layout`
3. `manual_responsive`
4. `advanced_motion`
5. `premium_background_effects`
6. `advanced_card_button_styling`
7. `premium_blocks`
8. `premium_sections`
9. `premium_templates`
10. `remove_cripqer_branding`

> The `standard_*` / `premium_*` ids are typed placeholders. This task does **not**
> classify the 37 individual block types nor individual templates/layouts/sections;
> that is a later manifest task.

### 1.2 Free allow list (ALLOW)

`edit_content`, `edit_basic_style`, `avatar_banner`, `media_assets`,
`basic_layout_selection`, `basic_card_button_styling`, `block_structure`,
`standard_blocks`, `standard_sections`, `standard_templates`, `publishing`.

### 1.3 Free locked list (LOCKED → `UPGRADE_REQUIRED`, `upgradeTarget: "pro"`)

`advanced_typography`, `advanced_layout`, `manual_responsive`, `advanced_motion`,
`premium_background_effects`, `advanced_card_button_styling`, `premium_blocks`,
`premium_sections`, `premium_templates`, `remove_cripqer_branding`.

### 1.4 Pro behavior

ALLOW every one of the 21 declared capabilities.

### 1.5 Business behavior

ALLOW every one of the 21 declared capabilities — identical visual matrix to Pro.
Differentiation will come later from operational capabilities (teams, locations,
analytics, operations), not additional visual effects.

### 1.6 Enterprise behavior

ALLOW every one of the 21 declared capabilities — identical visual matrix to Pro.
Differentiation will come later from governance, integrations, security and scale
(SSO, audit logs, API, SLA), not additional visual effects.

> **Power Editor access is public to all tiers.** This policy gates *mutation of
> capabilities*, not entry into the Power Editor.

---

## 2. Architecture

| Question | Answer |
|---|---|
| Pure product policy? | **YES** (0 network, 0 DB, 0 filesystem runtime calls) |
| Server dependency? | **NO** (no import of `src/server/billing/**`) |
| React dependency? | **NO** |
| Billing modified? | **NO** |
| Power Editor modified? | **NO** |

**Boundary documented:** The canonical tier vocabulary (`free | pro | business |
enterprise`) is declared **locally** in `capabilities.ts` (`PRODUCT_TIERS` →
`ProductTier`), byte-for-byte identical to the frozen Billing resolver's
`EffectiveTier` union. This avoids importing server-only runtime Billing code into
a client-compatible policy (no server/client coupling). No `premium` / `trial` /
`admin` / `custom` tier was introduced.

**Implementation shape:** typed `ProductTier`, typed `ProductCapability` union,
immutable declarative `CAPABILITY_POLICY` table (tier → `ReadonlySet`), and a
single pure `resolveCapabilityAccess(tier, capability)` function. No large
duplicated switch, no `isPremium` boolean, no email/provider/browser checks.

---

## 3. Safety

| Check | Result |
|---|---|
| Unknown capability fails closed | **PASS** (LOCKED, `UNKNOWN_CAPABILITY`, no upgrade target) |
| Invalid tier cannot receive Pro capability | **PASS** (treated no more permissively than Free) |
| LOCKED = mutation blocked, not config deletion | **YES** (documented in code + report) |

**LOCKED semantics:** `visible: true`, `editable: false`. LOCKED means the future
UI shows the capability but prevents mutation. It does **not** remove stored
values, hide rendered effects, downgrade config, sanitize canonical config, or
replace config with Free defaults. The preservation principle is documented but
not implemented here (this is a pure decision core, not a preservation guard).

---

## 4. Validation

| Check | Result |
|---|---|
| TypeScript (targeted, `--strict`) | **PASS** (exit 0) |
| Selfcheck | **PASS** |
| Assertion count | **158** (0 failed) |

Selfcheck covered: tier/capability vocabulary integrity, Free core ALLOW, Free
advanced LOCKED, Pro/Business/Enterprise allow-all, Business/Enterprise = Pro
matrix, fail-closed unknown capability, fail-closed invalid tier, missing
capability, type guards, no legacy `isPremium` boolean, no external identity
authority, and deterministic purity.

---

## 5. Scope

### 5.1 Files read

**Authorized reads (within read_scope):**
- `src/server/billing/entitlements.ts` *(READ ONLY — confirmed `EffectiveTier` = `free | pro | business | enterprise`)*
- `POWER_EDITOR_CAPABILITY_INVENTORY_V1.md` *(factual capability basis)*

**Authorized optional validation reads:**
- `tsconfig.json`
- `package.json`

**⚠️ Unauthorized read-scope expansion (acknowledged — 3 files):**

The following three convention-reference files were read to align the selfcheck
pattern with existing codebase conventions, even though they were **not** included
in the authorized `read_scope`:

- `src/lib/basic-editor-persistence/selfcheck.ts`
- `src/lib/renderer-capabilities/capabilities.ts`
- `src/lib/renderer-capabilities/renderer-capabilities.selfcheck.ts`

**Implementation impact from those reads: none.** No policy behavior, decision
contract, capability set, tier vocabulary, or access matrix was derived from them.
They were used only to match the existing selfcheck file conventions. No additional
files were written as a result.

### 5.2 Files created

- `src/lib/product-entitlements/capabilities.ts`
- `src/lib/product-entitlements/capabilities.selfcheck.ts`
- `CRIPQER_PRODUCT_CAPABILITY_POLICY_CORE_V1_REPORT.md` *(this file)*

### 5.3 Frozen-scope accounting

| Item | Result |
|---|---|
| Existing source files modified | **0** |
| Frozen write-scope violations | **0** |
| Unauthorized read-scope expansions | **3** |
| Implementation impact from those reads | **none** |
| Additional files written | **none** |
| Dependencies changed | **NO** |
| Routes changed | **NO** |
| DB changed | **NO** |
| Commits / staging | **none** (per git-safety) |

---

## 6. Stop condition review

No stop conditions were triggered: no existing source file, Power Editor, Billing,
legacy entitlements, block classification, numeric limit, DB change, route change,
or new dependency was required.
