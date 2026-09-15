# CRIPQER SMART PAGES — ENGINE V2 HOST MAPPING V1

**Task ID:** `CRIPQER_SMART_PAGES_3_ENGINE_V2_HOST_MAPPING_V1`
**Agent:** CODEX
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## Verdict

`SMART_PAGES_3_ENGINE_V2_HOST_MAPPING_PASS_FROZEN`

Smart Pages now maps its transient `PagePlanV1` through one host seam to the
existing PAGES_7 adapter and existing Engine V2 entrypoint. No persistence,
renderer, canonical-schema or Engine V2 internals were added or replaced.

## Seam confirmation

- **AUTHORITATIVE_ENGINE_INVOCATION:**
  `generateCripqerPageWithEngineV2` in
  `src/lib/parametric-engine-v2/internal-entrypoint.ts`.
- **AUTHORITATIVE_PAGES_7_ADAPTER:**
  `mapGeneratedPageToEngineInput` in `src/lib/page-generator/adapter.ts`.
- **HOST_MAPPING_LOCATION:** `src/lib/page-generator/smart-pages-host-map.ts`.
- **WHY_NO_SECOND_ADAPTER_CHAIN:** the mapper produces the existing
  `GeneratedPageInput` contract and delegates semantic-to-engine rules to the
  existing PAGES_7 adapter; it does not duplicate onboarding, destination or
  Engine V2 rules.

## Files

Created/extended within the authorized scope:

- `src/lib/page-generator/smart-pages-host-map.ts`
- `src/lib/page-generator/__tests__/smart-pages-host-map.test.ts`
- `src/lib/page-generator/index.ts` — exports the host seam.
- This report.

`src/lib/smart-pages/**` and `src/lib/parametric-engine-v2/**` were not changed
by this task. Existing unrelated working-tree changes were preserved.

## Mapping

### Direct

- Business name → existing Engine content identity.
- Business type/activity → existing `profession` field.
- Page title and description → existing host title/bio input.
- Owner cover and item media → existing Engine media/content fields.
- Owner prices, descriptions and item names → existing services/products/
  portfolio content blocks.

### Transformed

- `PagePlanV1.experienceType` → existing PAGES_7 objectives: `services`,
  `catalog`, `portfolio`, `menu`.
- Semantic CTA actions → existing host CTA vocabulary: WhatsApp, booking URL,
  external URL and email.
- Catalog item price objects → existing display price strings.
- Portfolio URL attributes → existing portfolio item link field.
- Planner section structure → Engine-supported structured content; Engine V2
  remains visual/layout authority.

### Deferred / unsupported

- `listings` remains semantic-only and is rejected by the host mapper; no DB
  PageType is created.
- `landing` without a supported structured experience is deferred.
- Retail category tiles, rails, benefits and density remain for SMART_PAGES_4.
- Team, testimonials, FAQ, address, hours, socials and differentiators are
  diagnosed as deferred until the current host contract supports them.
- Future UUID-based `internal_page` destinations are not resolved here.
- Checkout, stock, SKU, discount, availability and rich item detail are not
  invented or persisted.

## Scenario results

- **SERVICES_RESULT:** owner service name, description, price and WhatsApp
  target preserved; real Engine output canonical-valid.
- **CATALOG_RESULT:** owner product, price, image and media preserved; missing
  owner image rejects mapping rather than fabricating one; canonical-valid.
- **PORTFOLIO_RESULT:** owner project media and owner link preserved; missing
  media/link rejects mapping rather than dropping the project; canonical-valid.
- **MENU_RESULT:** owner menu item and price preserved through the supported
  services/content contract; canonical-valid.

## Canonical and runtime

- **ENGINE_V2_CALL_COUNT:** one call per `generateSmartPageWithEngineV2`
  invocation to the existing host entrypoint.
- **BIO_TEMPLATE_CONFIG_RESULT:** existing Engine V2 result and canonical
  envelope are returned; no Smart Pages document is persisted.
- **REAL_VALIDATE_TEMPLATE_RESULT:** passed in all four scenario smoke paths.
- **FABRICATED_OWNER_DATA:** NO.
- **DROPPED_OWNER_DATA:** NO; unsupported required content rejects mapping and
  optional unsupported content is reported in diagnostics.

## Architecture gates

- **SECOND_ENGINE:** NO
- **SECOND_ADAPTER_CHAIN:** NO
- **SECOND_CANONICAL:** NO
- **SECOND_RENDERER:** NO
- **DB_ACCESS_ADDED:** NO
- **SMART_PAGES_RUNTIME_USED:** NO
- **SMART_PAGES_PACKAGE_IMPORTED:** NO
- **MINISITE_DB_FANOUT_IMPLEMENTED:** NO
- **MINISITE_HOST_MAPPING_READY:** YES; each planned page can be mapped
  independently, with shared context and no persistence.

## Verification

- New host mapping suite: **6/6 passed**.
- Smart Pages 2 suite: **32/32 passed**.
- PAGES_7/page-generator/services/onboarding regression: **82/82 passed**.
- Targeted ESLint: **passed**.
- Targeted TypeScript filter: **no errors in the new mapper or tests**.
- Full TypeScript still reports unrelated pre-existing repository errors;
  none were introduced in the new Smart Pages 3 files.

## Repository safety

- **SMART_PAGES_CORE_CHANGED:** NO
- **ENGINE_V2_INTERNALS_CHANGED:** NO
- **DB_CHANGED:** NO
- **MIGRATION_CREATED:** NO
- **GIT_MUTATION_PERFORMED:** NO

## Success gate

`SMART_PAGES_3_ENGINE_V2_HOST_MAPPING_PASS_FROZEN`

## Next

`SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING` — not started automatically.
