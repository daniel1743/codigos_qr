# Cripqer — P1 Restaurant Visual True Menu Starter V1

**Status:** `CRIPQER_RESTAURANT_VISUAL_TRUE_MENU_STARTER_CODE_FIXED_RUNTIME_RETEST_REQUIRED`

## Proven defect

Fresh post-fix runtime evidence for page `elisa` showed that the canonical
`restaurant-visual` template still rendered:

- `Legal Counsel You Can Trust`;
- `Boutique Law Firm`;
- `Our Services`;
- `Wireless Mouse`;
- `Mechanical Keyboard`.

The page routing, child identity and page mode were already correct. The P1 was
semantic starter quality: selecting Menú produced a mixed professional/store
demo rather than an immediately recognizable restaurant page.

## Repair

The existing `restaurant-visual` recipe remains the canonical template ID and
uses the existing blocks and authorities. Its generated defaults now include:

- restaurant hero: `Casa Mediterránea`, cuisine description, `Ver menú` and
  `Reservar` CTAs;
- product grid dishes: `Pasta de la casa`, `Ensalada mediterránea` and
  `Tiramisú`, with editable descriptions, prices, images and CTAs;
- restaurant contact: address, phone, reservation link/label and menu CTA;
- profile identity: restaurant role, location and description.
- restaurant-specific hero eyebrow, badge and description;
- `Nuestro menú` heading instead of the inherited `Shop` heading.

The recipe no longer leaks legal-firm, electronics-store, portfolio or featured
film defaults. No schema, Pages routing, authentication or second template
system was introduced.

## Files changed

- `src/premium-template-studio/templates/recipeRegistry.ts`
- `src/premium-template-studio/__tests__/restaurantVisualStarter.test.ts`

The prior page-type mapping remains in `src/components/power-editor/pageStarterConfig.ts`;
`pageType=menu` still maps to `restaurant-visual`.

## Verification

Targeted semantic command:

```text
npx vitest run src/premium-template-studio/__tests__/restaurantVisualStarter.test.ts src/components/power-editor/__tests__/pageStarterConfig.test.ts --pool=forks --maxWorkers=1
```

Result: **2 test files passed, 3 tests passed.**

Render regression command:

```text
npx vitest run src/premium-template-studio/__tests__/restaurantVisualStarter.test.ts src/premium-template-studio/__tests__/presetRuntimeRenderSweep.test.tsx --pool=forks --maxWorkers=1
```

Result: **2 test files passed, 3 tests passed.**

Assertions cover hero/product/contact presence, `productGrid`, absence of
`portfolio`/`featuredMedia`, restaurant copy, dish examples and absence of
the known legal/electronics/creator defaults.

## Runtime status

The supplied route `/pages/a4114cc7-fd1a-44fd-b01b-a8846728ea87/edit` was
reconnected and hard-reloaded. The editor remained operational and showed the
restaurant dishes, but the canonical row is titled `sofia` and still contains
`Creative Director`, `Diseño productos y experiencias digitales.` and `Shop`.
Its persisted values are therefore not valid post-fix certification evidence;
the old page was not mutated. A new `/pages/new` page is still required for
the runtime gate.

Read-only baseline for the supplied route:

- page ID: `a4114cc7-fd1a-44fd-b01b-a8846728ea87`;
- public ID: `ihYR6bj`; slug: `null`;
- title: `sofia`; page type: `menu`;
- state: draft (`published=false`, `published_revision=0`);
- persisted block count: `5`;
- persisted signature: `hero`, `buttonGroup`, `heading`, `productGrid`, `contact`;
- persisted template: `restaurant-visual`.

Success gate not yet frozen:
`CRIPQER_RESTAURANT_VISUAL_TRUE_MENU_STARTER_FIXED_FROZEN`.
