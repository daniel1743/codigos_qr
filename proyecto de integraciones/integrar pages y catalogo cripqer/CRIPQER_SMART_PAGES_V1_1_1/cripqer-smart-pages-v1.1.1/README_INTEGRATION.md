# CRIPQER SMART PAGES V1 — Integration Guide

Portable, framework-light foundation for smart mini-pages, catalogs, services,
portfolios, menus and listings with assisted conversion (WhatsApp / contact /
quote / booking). It is **not** a visual engine and **not** an editor.

## Architecture

```text
Business input (JSON / CSV / text / host extractor)
        ↓  intake-adapters.ts
Intake draft
        ↓  content-normalizer.ts
NormalizedContentV1 + CatalogV1   (no invented facts)
        ↓  host builds PageGenerationRequest
Page Orchestrator (page-orchestrator.ts + business-presets.ts)
        ↓
PagePlanV1 / MiniSitePlanV1        (semantic structure, no styling)
        ↓  engine-v2-adapter.ts  (typed boundary + mock)
HOST Engine V2  →  canonical page document (BioTemplateConfig)  →  Power Editor 2
        ↓  (sandbox/demo path only)
MasterPageRuntime.tsx              (deterministic rendering)
```

Engine V2 remains the visual brain. Power Editor 2 remains the editor. This
package stops at `PagePlanV1` / `EngineV2Input` and ships a runtime for preview
and for hosts that do not need the visual engine on a given surface.

## Files

| File | Role |
| --- | --- |
| `catalog.types.ts` | `NormalizedContentV1`, `CatalogV1`, item model, `SalesActionV1` |
| `smart-pages.types.ts` | `PageGenerationRequest`, `PagePlanV1`, `MiniSitePlanV1`, `RuntimePageConfigV1`, theme |
| `intake-adapters.ts` | JSON / CSV / text parsing + adapter boundary for PDF, DOCX, XLSX, images, URL |
| `content-normalizer.ts` | Draft → normalized content, stable ids, price parsing, review flags |
| `business-presets.ts` | Semantic presets (defaults only, never per-industry engines) |
| `page-orchestrator.ts` | The single orchestrator: capabilities → experience → sections → CTA |
| `sales-actions.ts` | Deterministic WhatsApp/quote/contact/call/booking link building |
| `engine-v2-adapter.ts` | `EngineV2Adapter` interface, `EngineV2Input`, mock adapter |
| `runtime/MasterPageRuntime.tsx` | Deterministic renderer |
| `runtime/blocks.tsx` | Reusable blocks shared by every vertical |
| `smart-pages.css` | Scoped, variable-driven runtime styles |
| `smart-pages.fixtures.ts` | Six demo businesses proving one shared pipeline |

## Minimal usage

```tsx
import {
  generatePagePlan,
  buildRuntimeConfig,
  MasterPageRuntime,
} from "./smart-pages";
import "./smart-pages/smart-pages.css";

const plan = generatePagePlan(request);           // PageGenerationRequest
const config = buildRuntimeConfig(plan, request.content, { accent: "#0f766e" });
<MasterPageRuntime config={config} />;
```

Real Engine V2 path:

```ts
import { toEngineV2Input, type EngineV2Adapter } from "./smart-pages";

const hostAdapter: EngineV2Adapter = {
  id: "cripqer-engine-v2",
  isRealEngine: true,
  toEngineInput: toEngineV2Input,
  async render(plan, content) { /* call Engine V2, map to BioTemplateConfig */ },
};
```

## Onboarding boundary

`PageGenerationRequest` is deliberately independent from onboarding. The host
writes a small adapter `OnboardingIntentV2 → PageGenerationRequest`; changes to
Onboarding V2 do not require touching this package.

## Intake support (V1, honest status)

| Format | Status |
| --- | --- |
| JSON | REAL (dependency-free parser) |
| CSV | REAL (quoted fields, `,`/`;`, embedded newlines) |
| Plain text / pasted lists | REAL (category headers, `name - price - description`) |
| Manual structured fixture | REAL |
| PDF / DOCX / XLSX / images / URL | ADAPTER ONLY — register a host extractor via `registerIntakeAdapter()` |

## Data integrity

Prices, stock, SKUs, contact details, addresses and attributes are only ever
copied from the source. Missing values are recorded in `item.review` and
`content.issues`, lower `item.confidence`, and render as "Price on request"
rather than a fabricated number.

## Host must supply

- A real Engine V2 adapter and canonical `BioTemplateConfig` mapping
- Auth, database and persistence
- Media/file storage and upload
- Production routes (this package defines none)
- Real PDF/DOCX/XLSX/OCR/URL extractors if those intake formats are needed
- Any future commerce backend

## Not implemented (by design)

Direct checkout, payments, orders, cart, inventory backend. `salesMode:
"checkout"` and `checkoutEnabled: false` exist as future contracts only; no
checkout UI is rendered in V1.

## Dependencies

React 18/19 only. No other runtime dependency. No router, no state library, no
CSS framework. Styles are scoped under `.sp-root` and driven by CSS variables so
the host theme can override them.

---

## V1.1 — Premium ecosystem extension

Additive over V1. No architecture change: still one Page Orchestrator, one
Master Page Runtime, one block library, checkout still contract-only.

### New files
- `ecosystem.ts` — `SmartDestinationV1` (external | internal_page | section),
  `NavItemV1`, `EcosystemContextV1` (identity, contact, socials, analytics
  context, QR context, `publicBaseUrl`), `AnalyticsEventV1` / `AnalyticsHandler`,
  `destinationHref()`. Boundary only: no routing, no storage, no QR generation.

### Action authority (P0)
`resolveItemAction()` resolves, in strict order:
`item.action` → `item.salesMode` → section default → page/global CTA.
A globally available WhatsApp never overrides an explicit item action.

### CTA resolution (P1)
Request CTA wins → semantic preset recommendation → safe generic contact action
(disabled if nothing resolves). `quote`/`contact` degrade:
configured target → email → WhatsApp → phone → unavailable.
Nothing is ever invented.

### Truthful mini-site (P1)
`generateMiniSitePlan()` supports a real 1–5 pages. Pages are created only when
the content for them exists, and sections are claimed once, so the reported page
count always matches reality. Cross-page navigation uses `internal_page`
destinations; the host resolves them via `onNavigate`.

### Runtime props
```tsx
<MasterPageRuntime
  config={config}                       // RuntimePageConfigV1 (+ optional ecosystem)
  onAnalyticsEvent={(e) => track(e)}    // callback only, no backend
  onNavigate={(item) => router.go(item)} // internal_page / external destinations
/>
```

### Theme tokens
`RuntimeThemeV1` is fully configurable: `accent`, `accentContrast`, `background`,
`surface`, `surfaceAlt`, `text`, `mutedText`, `border`, `radius`, `radiusSm`,
`shadow`, `shadowStrong`, `headingFont`, `bodyFont`, `sectionSpacing`,
`contentWidth`, `buttonRadius`, `buttonStyle`, `stickyNav`. No theme is
hard-coded per business; every value flows into CSS variables under `.sp-root`.

### New blocks / sections
Premium navbar (sticky option, desktop links + CTA, mobile drawer with Escape,
backdrop and focus handling), hero variants (`centered`, `split`, `media`,
`compact`), business identity (logo/avatar/professional name/category/location/
badges), `missionVision`, `whyUs`, About with media, testimonials with optional
avatar and rating, premium footer with navigation and contact columns.
All new content fields are optional and rendered only when supplied.

### Accessibility & performance
Native CSS only (no animation library), `prefers-reduced-motion` honoured,
keyboard-accessible navbar/drawer/detail dialog, lazy-loaded imagery,
0 horizontal overflow at 320 / 360 / 390 / 768 / 1280.
