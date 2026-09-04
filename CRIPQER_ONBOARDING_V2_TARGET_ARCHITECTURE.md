# Cripqer — Onboarding V2 Target Architecture

Date: 2026-09-04  
Mode: `READ_ONLY_PRODUCT_ARCHITECTURE_DESIGN`  
Status: **DESIGN ONLY — NOT IMPLEMENTED**

## Executive recommendation

Onboarding V2 should become a semantic entry layer, not a second editor. Its
job is to learn what the person or business needs, then hand that intent to a
future Page / Business Orchestrator. The Orchestrator decides the experience
shape and prepares an Engine V2 input. Engine V2 decides the visual system and
generates a `BioTemplateConfig`. The canonical persistence boundary stores the
result, after which Basic Editor and Power Editor V2 remain the two editing
surfaces.

The recommended flow is **HYBRID**: retain the current shell and a short core
questionnaire, but make additional questions conditional on the user's goal,
content needs and commercial intent. This keeps the experience human for a
simple personal page while allowing a richer service page to express the
semantic information needed for generation.

The current visual shell is **PARTIALLY reusable**. The six-step controller,
progress treatment, field primitives and several question concepts can be
retained. The current intent contract, completion behavior and fixed sequence
must be extended or replaced before production use.

No Onboarding V2, Commerce, Mini-Site, route, migration or source-code change
is implemented in this document.

## Target architecture

```text
Human user
    ↓
Onboarding V2 — semantic questions
    ↓
OnboardingIntentV2 — versioned semantic contract
    ↓
Page / Business Orchestrator — experience and structure plan
    ↓
Engine V2 — visual and composition decisions
    ↓
BioTemplateConfig
    ↓
canonical template_config envelope (schemaVersion: 1)
    ↓
Basic Editor  ↔  Power Editor V2

Conditional future branch:

OnboardingIntentV2 + Commerce Intake
    ↓
CommerceCatalogV1 + Page / Business Orchestrator
    ↓
Catalog / Commerce Page / Smart Mini-Site
    ↓
Power Editor V2
    ↓
Commerce Runtime
```

The current task designs the first path only. The commerce branch remains a
future extension seam; it is not a request to expose or implement commerce.

## 1. Target onboarding flow

### Core flow

The user should see four short semantic stages and a review/result stage. The
implementation may render these as five screens or as a six-step shell with
conditional steps; the contract must not depend on screen count.

| Stage                    | Human question                                              |                                   Required now | Output                                                |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------: | ----------------------------------------------------- |
| 1. Identity and activity | “¿Quién eres y a qué te dedicas?”                           |                                            YES | display name, activity/profession, optional short bio |
| 2. Desired outcome       | “¿Qué quieres conseguir con tu página?”                     |                                            YES | primary goal and optional experience hint             |
| 3. What to include       | “¿Qué quieres mostrar o facilitar?”                         |       YES, at least one intent or allow `none` | semantic content needs/features                       |
| 4. Contact and media     | “¿Cómo quieres que te contacten y qué material tienes?”     | Primary CTA or explicit no-CTA; media optional | CTA hierarchy and media semantics                     |
| 5. Scope and review      | “¿La quieres sencilla, completa o prefieres que decidamos?” |                        YES with `auto` default | density/scope and confirmation                        |

The current six-step shell can keep a separate visual-personality screen if it
is presented as an outcome-oriented preference, for example “¿Qué sensación
quieres transmitir?”. It should not ask for typography, frame, texture,
spacing or other renderer settings.

### Required versus optional information

Required for the initial generation handoff:

- a display name or brand name;
- an activity/profession/category signal, including an “Otro” value;
- one primary goal;
- a valid action or an explicit choice to start without a contact CTA;
- a confirmed review/completion state.

Optional and skippable:

- bio/description;
- avatar, logo or banner;
- secondary actions;
- additional links;
- content features beyond the first selection;
- own-media availability;
- density preference, where `auto` is a safe default;
- commercial intent unless the goal/content answers make it relevant.

If the current Engine V2 host still requires a primary action or valid content
link, the Orchestrator must resolve that requirement before generation. It may
ask one focused follow-up or produce a non-published draft state; it must not
invent a destination.

### What should be inferred automatically

The user should not be asked for:

- exact layout or frame;
- texture, gradients, shadows or border radius;
- exact typography settings;
- button/card geometry;
- responsive breakpoints;
- animation or motion parameters;
- block ordering or coordinates;
- SEO implementation values;
- visual crop, object position or overlay values;
- the final number of sections.

These are Engine V2, Power Editor V2 or Page / Business Orchestrator
responsibilities. The system may infer a sensible first result from activity,
goal, content needs, media availability and density.

## 2. Adaptive branching model

The flow should be hybrid rather than a fixed questionnaire. The core questions
are stable; optional modules appear only when a prior answer makes them useful.

### Simple personal or contact page

Example: gardener, goal “recibir contactos por WhatsApp”, wants Instagram and
WhatsApp, density “simple”.

Path:

```text
identity → goal → links/social + WhatsApp → media skip → simple/auto → review
```

Expected semantic result:

- compact structure;
- minimal section count;
- strong WhatsApp contact intent;
- no invented services, gallery, team or commerce sections.

### Richer service page

Example: veterinarian, goal “recibir reservas”, wants services, team, gallery,
testimonials and booking, with WhatsApp secondary, own photos and “complete”.

Path:

```text
identity → booking goal → services/team/gallery/testimonials/booking
         → book primary + WhatsApp secondary → own media → complete → review
```

Expected semantic result:

- service-oriented structure proposal;
- richer content slots selected by semantic need;
- booking as primary action;
- WhatsApp preserved as a secondary action;
- media-aware generation without asking for crop or layout coordinates.

### Future commerce candidate

Example: retailer, goal “vender y recibir contactos”, commercial need “hybrid”.

Path today:

```text
identity → sell/contact goal → conditional commercial signal → review
```

The result records that a future catalog or commerce layer may be relevant. It
does not collect products, prices, inventory, checkout rules or payment data.
Those belong to Commerce Intake and a future Commerce Runtime.

### Conditional rules

| Trigger                                         | Ask                                      | Skip                               |
| ----------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| Goal includes booking                           | booking destination and/or booking need  | product/checkout questions         |
| Content includes services                       | service description/source readiness     | ecommerce inventory                |
| Content includes products or goal includes sell | high-level commercial intent only        | catalog rows and payment setup     |
| Content includes portfolio/gallery/video        | asset availability and source preference | renderer-level media controls      |
| Goal is personal presence/contact               | basic links and CTA                      | team, pricing and commerce modules |
| User selects simple                             | keep one or two essential sections       | exhaustive content questionnaire   |
| User selects `auto`                             | ask no additional density questions      | technical layout choices           |

## 3. OnboardingIntentV2 conceptual contract

This is a target contract, not a source file or implementation instruction.
The names are semantic and intentionally independent of renderer components.

```ts
type OnboardingIntentVersion = "2";

type ExperienceIntentV2 =
  | "personal_page"
  | "professional_landing"
  | "service_page"
  | "catalog"
  | "whatsapp_commerce"
  | "ecommerce"
  | "smart_mini_site"
  | "other";

type BusinessCategoryV2 =
  | "beauty"
  | "professional"
  | "creator"
  | "food"
  | "fitness"
  | "local"
  | "freelancer"
  | "retail"
  | "other";

type PrimaryGoalV2 =
  | "presence"
  | "contacts"
  | "whatsapp"
  | "bookings"
  | "show_services"
  | "show_portfolio"
  | "sell"
  | "quote_requests"
  | "social_growth"
  | "other";

type VisualDirectionV2 =
  | "elegant"
  | "minimal"
  | "modern"
  | "professional"
  | "energetic"
  | "premium"
  | "let_cripqer_decide"
  | "other";

type ContentNeedV2 =
  | "links"
  | "services"
  | "products"
  | "portfolio"
  | "gallery"
  | "video"
  | "team"
  | "testimonials"
  | "booking"
  | "contact"
  | "social_networks"
  | "pricing"
  | "location"
  | "faq"
  | "other";

type ActionTypeV2 =
  | "whatsapp"
  | "call"
  | "book"
  | "buy"
  | "request_quote"
  | "website"
  | "menu"
  | "follow"
  | "email"
  | "contact"
  | "other";

interface ActionIntentV2 {
  type: ActionTypeV2;
  value?: string;
  label?: string;
  source: "user" | "inferred";
}

interface MediaIntentV2 {
  hasOwnPhotos?: boolean;
  hasVideos?: boolean;
  hasLogoOrAvatar?: boolean;
  hasPortfolioOrGalleryAssets?: boolean;
  needsMediaHelp?: boolean;
  preference: "own_media" | "find_media" | "minimal_media" | "no_preference";
}

interface OnboardingIntentV2 {
  version: OnboardingIntentVersion;

  identity: {
    displayName: string;
    professionOrActivity: string;
    bio?: string;
    avatarAssetRef?: string;
    bannerAssetRef?: string;
  };

  business: {
    category: BusinessCategoryV2;
    customCategory?: string;
  };

  outcome: {
    primaryGoal: PrimaryGoalV2;
    customGoal?: string;
    experienceHint?: ExperienceIntentV2;
  };

  visualDirection: {
    preference: VisualDirectionV2;
    customDescription?: string;
  };

  contentNeeds: {
    items: Array<{ type: ContentNeedV2; customLabel?: string }>;
    userHasNoContentYet?: boolean;
  };

  actions: {
    primary?: ActionIntentV2;
    secondary: ActionIntentV2[];
  };

  media: MediaIntentV2;

  scope: {
    density: "simple" | "complete" | "auto";
    userSelected: boolean;
  };

  commercial?: {
    mode: "display_only" | "contact" | "booking" | "quote" | "sell" | "hybrid";
    relevant: boolean;
  };

  extensions?: {
    // Reserved for versioned, separately owned capabilities.
    [namespace: string]: unknown;
  };

  meta: {
    version: OnboardingIntentVersion;
    completedAt: string;
    locale?: string;
    source: "onboarding_v2";
  };
}
```

### Required and optional classification

Required in the contract for a completed intake:

- `version`;
- `identity.displayName`;
- `identity.professionOrActivity`;
- `business.category`;
- `outcome.primaryGoal`;
- `visualDirection.preference`;
- `contentNeeds.items` as an empty-safe collection;
- `actions.secondary` as an array;
- `media.preference`;
- `scope.density`;
- `meta.version`, `meta.completedAt` and `meta.source`.

Optional:

- `bio`;
- durable avatar/banner references;
- custom labels/goals/categories;
- `outcome.experienceHint`;
- primary action when the user explicitly chooses no CTA;
- commercial intent when not relevant;
- extension namespaces.

The contract keeps collections explicit and stable. An empty array means “the
user did not request any of these”, while an omitted optional object means “the
question was not relevant or was not asked”.

### Versioning strategy

- `OnboardingIntentV2` is a new contract; do not silently reinterpret V1
  fields in place.
- Every payload carries both top-level `version` and `meta.version`.
- V1-to-V2 conversion, if needed for old drafts, is an explicit adapter with a
  documented loss report for fields that cannot be recovered.
- Additive future capability data belongs in versioned namespaces under
  `extensions`, not in renderer-specific top-level fields.
- A future `OnboardingIntentV3` should be introduced when required semantics
  change, rather than changing the meaning of a V2 field.
- The canonical `template_config` envelope remains independently versioned as
  `schemaVersion: 1`; onboarding versioning must not mutate that envelope.

## 4. Field rationale

| Domain           | Why it belongs in onboarding                                 | What it must not contain                          |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Identity         | Users know their name, activity and description              | renderer profile object shape                     |
| Business         | Helps generation and future orchestration understand context | exhaustive vertical-specific schema               |
| Outcome          | Defines success in human terms                               | button variants or tracking implementation        |
| Visual direction | Gives a broad taste preference                               | exact fonts, colors or spacing                    |
| Content needs    | Distinguishes a simple page from a richer one                | raw block IDs or section coordinates              |
| Actions          | Preserves conversion priority and destinations               | button radius, height or hover state              |
| Media            | Tells the system what assets are available or desired        | crop mode, blur, object position or grid geometry |
| Scope            | Provides simple/complete/automatic signal                    | column counts or breakpoints                      |
| Commercial       | Leaves a future commerce signal without building commerce    | products, inventory, checkout or payment fields   |
| Extensions       | Allows separately owned future semantics                     | unbounded coupling to current Engine internals    |

## 5. Onboarding V2 → Engine V2 map

The existing host entrypoint is
`src/lib/parametric-engine-v2/internal-entrypoint.ts`. The following is a
proposed adapter map to its current input, not an implementation.

| Onboarding V2 field             | Existing Engine V2 host input                     | Classification                            | Notes                                                                                                       |
| ------------------------------- | ------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `identity.professionOrActivity` | `profession`                                      | `TRANSFORM`                               | Pass the normalized activity/profession string; category can be used as fallback context.                   |
| `identity.displayName`          | `content.name`                                    | `TRANSFORM`                               | Current host intent conversion uses content name when present.                                              |
| `identity.bio`                  | `content.bio`                                     | `TRANSFORM`                               | Omit when empty; Engine V2 may use a safe fallback.                                                         |
| `business.category`             | `profession` / semantic normalization             | `TRANSFORM`                               | Current host input has no dedicated business-category field; do not hide taxonomy loss.                     |
| `business.customCategory`       | `profession` or orchestrator context              | `TRANSFORM`                               | Preserve as semantic text; never map it to a block name.                                                    |
| `outcome.primaryGoal`           | `goal`                                            | `TRANSFORM`                               | Map V2 goal vocabulary to current values such as contact, WhatsApp, booking, sell, portfolio or social.     |
| `visualDirection.preference`    | `style`                                           | `TRANSFORM`                               | Map semantic direction to current style vocabulary; `let_cripqer_decide` becomes omitted/default.           |
| `contentNeeds.items`            | `selectedFeatures`                                | `TRANSFORM`                               | Map semantic needs to current feature tokens; unsupported values remain in the orchestrator plan.           |
| `actions.primary`               | `primaryAction`                                   | `DIRECT_MAP` after destination validation | Preserve type/value and reject malformed destinations; never invent one.                                    |
| `actions.secondary`             | `content.links` where representable               | `TRANSFORM`                               | Current host supports content links, but explicit priority semantics are not a first-class Engine V2 input. |
| `identity.avatarAssetRef`       | `userMedia.avatarUrl`                             | `DIRECT_MAP`                              | Only durable hosted references; a browser blob URL is not acceptable.                                       |
| `identity.bannerAssetRef`       | `userMedia.bannerUrl`                             | `DIRECT_MAP`                              | Only after an authorized asset handoff.                                                                     |
| `media` availability/preference | asset flags, media options or curated-media input | `TRANSFORM`                               | Availability is semantic; provider calls and asset selection remain outside onboarding.                     |
| `scope.density`                 | Engine generation override if supported           | `TRANSFORM`                               | Translate `simple`/`complete`/`auto` to a generation preference, not a CSS value.                           |
| `commercial.mode`               | current Engine V2 input                           | `NOT_CURRENTLY_SUPPORTED`                 | Retain for Page Orchestrator; do not force commerce meaning into visual generation.                         |
| `outcome.experienceHint`        | current Engine V2 input                           | `FUTURE_ORCHESTRATOR`                     | Orchestrator decides page/commerce experience before Engine V2.                                             |
| `extensions`                    | current Engine V2 input                           | `FUTURE_ORCHESTRATOR`                     | Namespaced extensions require explicit adapters.                                                            |
| `meta`                          | adapter metadata / `now`                          | `TRANSFORM`                               | Version and completion metadata are provenance, not visual input.                                           |

### Adapter invariants

1. The adapter must validate destinations independently of UI gating.
2. The adapter must not convert `ContentNeedV2` values directly into raw
   renderer blocks; the Orchestrator/Engine owns that translation.
3. Secondary actions must not be silently dropped. If current Engine V2 cannot
   represent their priority, the Orchestrator must preserve them for canonical
   content or mark the limitation explicitly.
4. Media availability must never be mistaken for a durable media URL.
5. `schemaVersion: 1` and opaque `editorConfig` remain canonical persistence
   responsibilities, not onboarding fields.

## 6. Page / Business Orchestrator boundary

The Orchestrator is the missing semantic-to-structure layer. It should be a
future host capability, not part of this implementation phase.

### Responsibilities

- decide the experience family from user intent and enabled capabilities;
- choose personal page vs professional landing vs service-oriented structure;
- decide whether a future catalog/commerce layer is needed;
- translate content needs into a high-level structure proposal;
- normalize actions and preserve primary/secondary priority;
- resolve missing minimum inputs without inventing user destinations;
- decide which conditional questions are still necessary;
- prepare a stable Engine V2 host input;
- return a generation plan and any deferred work.

### Conceptual input

```ts
interface PageOrchestratorInputV1 {
  onboarding: OnboardingIntentV2;
  enabledExperiences: string[];
  engineCapabilities: Record<string, boolean>;
  commerceAvailable: boolean;
  existingCanonicalConfig?: unknown;
}
```

### Conceptual output

```ts
interface PageGenerationPlanV1 {
  experience: ExperienceIntentV2;
  structure: {
    contentNeeds: ContentNeedV2[];
    density: "simple" | "complete" | "auto";
    preserveExistingContent: boolean;
  };
  engineInput: unknown;
  commerceHandoff?: {
    required: boolean;
    reason: "catalog" | "commerce" | "quote" | "booking" | "none";
  };
  deferredQuestions: string[];
}
```

### What the Orchestrator should not own

- exact typography, colors, texture, frames or spacing;
- renderer block implementation;
- Power Editor control state;
- checkout, payment, inventory or order execution;
- direct mutation of frozen Power Editor contracts.

### What onboarding should not own

- final section ordering;
- product/service records;
- route creation;
- canonical `BioTemplateConfig` construction;
- engine scoring or visual compatibility rules;
- persistence ownership between Basic and Power.

### What Engine V2 should not own

- deciding whether the user needs a commerce product;
- collecting missing business facts through UI;
- user/account/profile authorization;
- database writes or canonical merge policy;
- payment, booking, quote or contact runtime behavior.

## 7. Basic Editor boundary

After generation, these onboarding-derived values should remain trivially
editable in Basic Editor:

- display name;
- profession/activity;
- bio/description;
- avatar and banner through the existing durable asset path;
- basic links and social destinations;
- contact details and primary/secondary action destinations;
- basic presentation values exposed by the Basic contract.

Basic Editor should continue to own only its documented fields and use the
canonical patch/ownership boundary. It must not replace opaque premium
`editorConfig` fields during a Basic save.

Onboarding should not bypass Basic Editor by writing independent profile fields
and a full template object in one uncontrolled operation. The future handoff
should have one clear owner for generation and one canonical persistence path.

## 8. Power Editor V2 boundary

Power Editor V2 remains the professional customization layer after generation.
It may own:

- exact theme colors and typography;
- layout and responsive behavior;
- frames, textures, gradients and motion;
- card/button styling;
- advanced block content and ordering;
- banner treatment and fine visual composition;
- SEO and advanced presentation settings.

These decisions must remain out of onboarding:

- frame selection;
- texture and gradient settings;
- exact typography values;
- button/card radius and shadows;
- responsive breakpoints;
- motion parameters;
- manual block ordering;
- sticky/floating coordinates;
- fine spacing and positioning.

The onboarding contract may influence Engine V2 defaults, but it must never
pretend to be a serialized Power Editor configuration.

## 9. Commerce Intake boundary

Commerce Intake is a future capability that starts only when the Orchestrator
has identified a real catalog, commerce, quote or service-inventory need.

It should own:

- collecting products or services;
- importing PDF, Excel, Word, JSON, images, text or URLs;
- normalizing item data into a future `CommerceCatalogV1`;
- validating item completeness and source provenance;
- preparing catalog data for a page or commerce runtime.

It should not be part of current onboarding. `OnboardingIntentV2` needs only a
small semantic commercial signal such as `display_only`, `sell` or `hybrid`.
It must not include product rows, prices, inventory, SKU data, checkout rules,
payment providers or per-product purchase behavior.

Commerce Runtime remains responsible for what happens after a user buys,
books, requests a quote or contacts the business.

## 10. Current shell reuse matrix

| Current asset           | Decision                             | Rationale                                                                                                                                     |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OnboardingShell.tsx`   | `KEEP_AND_EXTEND`                    | Retain state, progress, lifecycle and step host; add adaptive stages and a real handoff boundary later.                                       |
| `StepBusiness.tsx`      | `KEEP_AND_EXTEND`                    | Retain category choices; add activity/custom semantics without vertical lock-in.                                                              |
| `StepGoal.tsx`          | `KEEP_AND_EXTEND`                    | Reframe goals around outcomes and expand conditionally.                                                                                       |
| `StepPersonality.tsx`   | `KEEP_AND_EXTEND`                    | Keep broad visual direction; add “let Cripqer decide”; never add renderer controls.                                                           |
| `StepIdentity.tsx`      | `KEEP_AND_EXTEND`                    | Keep name/profession/bio; replace blob-only avatar completion with a future durable asset handoff.                                            |
| `StepPrimaryAction.tsx` | `KEEP_AND_EXTEND`                    | Add primary/secondary hierarchy and explicit no-CTA path where valid.                                                                         |
| `StepSummary.tsx`       | `KEEP_AND_EXTEND`                    | Summarize semantic intent and conditional answers, not internal block/config values.                                                          |
| `CompletionScreen.tsx`  | `REPLACE` at integration time        | Current copy says generation is a later phase and only shows an in-memory payload; future completion must represent the actual handoff state. |
| `primitives.tsx`        | `KEEP_AS_IS` initially               | Local field, option and accessibility primitives fit the semantic flow.                                                                       |
| `config.ts`             | `KEEP_AND_EXTEND`                    | Reuse catalogues, add semantic content/action/media catalogues carefully.                                                                     |
| `validation.ts`         | `KEEP_AND_EXTEND`                    | Preserve destination and identity validation; add V2 semantic validation and explicit adapter validation.                                     |
| `types.ts`              | `REPLACE` contract, preserve adapter | V2 needs a new versioned contract; V1 drafts require an explicit migration adapter.                                                           |
| `INTEGRATION.md`        | `KEEP_AND_EXTEND`                    | Update documentation only after an implementation phase establishes the real production mount.                                                |
| `/onboarding-preview`   | `KEEP_AS_IS` as QA seam              | Keep internal and noindex; do not turn it into a public product route in this design phase.                                                   |
| Fixed six-step sequence | `MAKE_CONDITIONAL`                   | Keep progress and a short core; reveal modules according to intent.                                                                           |
| `sessionStorage` draft  | `KEEP_AND_EXTEND`                    | Keep resumability for incomplete intake, with explicit cleanup and no sensitive secrets.                                                      |

### Migration from V1 conceptually

1. Treat the current V1 payload as a legacy input, not as the V2 canonical
   contract.
2. Map `business_type`/`business_other` into `business.category` and custom
   category.
3. Map `primary_goal` into the broader V2 outcome vocabulary.
4. Map `visual_personality` into `visualDirection.preference`.
5. Map identity and primary action explicitly.
6. Convert the single primary action into `actions.primary` and an empty
   `actions.secondary` array.
7. Set unavailable V2 domains to safe empty/unknown values, never invented
   content.
8. Record the source version in metadata and retain a loss report if a V1
   payload lacked information required for a later branch.

## 11. Future compatibility assessment

**Contract-level compatibility: GOOD.**

The proposed V2 contract separates semantic intent from renderer configuration,
keeps commercial intent optional and conditional, and provides namespaced
extension seams. The same core contract can later feed:

- Personal Pages through identity/presence goals;
- Professional Landings through activity, goals and content needs;
- Service Pages through services, booking, team, testimonials and contact;
- Catalogs through products and a future Commerce Intake handoff;
- WhatsApp Commerce through WhatsApp/contact and commercial intent;
- Ecommerce through a future commerce experience hint and catalog handoff;
- Smart Mini-Sites through richer content needs and Orchestrator structure.

This is architectural compatibility, not implemented product capability. None
of the future experience types should become publicly selectable merely because
the contract can name them. Availability must be controlled by capability flags
and separate validation gates.

The design avoids link-in-bio lock-in because links are one content need among
many, actions are generic human outcomes, and the experience hint is separate
from the renderer or URL model.

## 12. Risks and mitigations

| Risk                                                     | Level    | Mitigation                                                                               |
| -------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| Onboarding becomes a disguised Power Editor              | High     | Keep all renderer controls out; validate the semantic contract at the boundary.          |
| Future commerce fields leak into the current flow        | High     | Keep only conditional commercial intent; defer inventory to Commerce Intake.             |
| V1 and V2 fields are treated as automatically compatible | High     | Use an explicit versioned adapter and loss report.                                       |
| Secondary actions disappear in current Engine V2         | High     | Preserve them in the Orchestrator/canonical content plan and report unsupported mapping. |
| Avatar blob URL becomes canonical data                   | High     | Require durable asset references from an authorized upload path.                         |
| Simple users face an excessive questionnaire             | Moderate | Hybrid flow, safe defaults, conditional modules and `auto` density.                      |
| Activity taxonomy becomes too narrow                     | Moderate | Keep stable categories plus custom activity/category values.                             |
| Engine infers too much without user visibility           | Moderate | Show a semantic review and provide Basic/Power editing after generation.                 |
| Completion wording promises a page before persistence    | Moderate | Replace preview-only completion state during integration.                                |
| Hidden future routes become public accidentally          | High     | Keep capability gates and public visibility policy separate from contract design.        |
| Canonical ownership is bypassed                          | High     | Persist only through the established canonical path and preserve opaque fields.          |

## 13. Phased implementation plan after architecture approval

This sequence is proposed only; it is not being executed now.

### Phase 1 — Contract and types

- approve `OnboardingIntentV2` semantics and versioning;
- define validation and V1-to-V2 adapter behavior;
- define capability flags for hidden future experiences;
- write contract fixtures for simple, service and future-commerce intent.

### Phase 2 — Shell adaptation

- retain the current accessible shell and primitives;
- convert the fixed flow into the hybrid conditional model;
- add content-needs, action hierarchy, media semantics and density questions;
- make avatar/banner handling distinguish preview URLs from durable asset refs;
- keep the preview route internal during validation.

### Phase 3 — Adapter to Engine V2

- implement a single explicit `OnboardingIntentV2 → EngineV2HostGenerationInput`
  adapter;
- validate action destinations and unsupported fields;
- preserve secondary actions and content needs through the Orchestrator plan;
- run deterministic Engine V2 fixtures for simple and rich scenarios.

### Phase 4 — Canonical persistence

- connect generated `BioTemplateConfig` through the canonical envelope;
- use the existing canonical RPC and ownership rules;
- verify `schemaVersion: 1`, opaque `editorConfig` and atomic behavior;
- test recovery and cleanup on failed generation or persistence.

### Phase 5 — Basic Editor landing

- land the generated result in the existing Basic Editor entry path;
- ensure name, profession, bio, avatar, links and actions remain editable;
- verify Basic patches preserve premium fields;
- do not replace the Basic renderer or make onboarding own Basic saves.

### Phase 6 — Internal QA

- browser E2E for simple personal/contact intake;
- browser E2E for richer service intake;
- canonical Basic → Power → Basic preservation;
- invalid destination and missing-asset tests;
- authenticated ownership/RLS tests;
- feature-flag and rollback verification.

### Future authorized phases

- Page / Business Orchestrator capability expansion;
- Commerce Intake and `CommerceCatalogV1`;
- Catalog, WhatsApp Commerce, Ecommerce and Smart Mini-Site experiences;
- separate internal validation before any public exposure.

## 14. Open architectural decisions

1. Should `experienceHint` be user-selectable now for only Personal Page and
   Professional Landing, or remain entirely Orchestrator-inferred?
2. Is “no primary CTA” valid for the first generated page, or must the
   Orchestrator ask for one before invoking the current Engine V2 host input?
3. Which media upload/storage path will convert a local preview into a durable
   asset reference?
4. Should `business.category` be a stable taxonomy with `customCategory`, or
   should the activity label be the primary field with category as inference?
5. Which content-needs set is the minimum useful set for the first release?
6. Should density be `auto` by default, with “simple/complete” offered only
   after content needs are selected?
7. How should secondary links be represented in canonical content while the
   current Engine V2 host exposes only content links rather than an explicit
   priority model?
8. At what point in signup/profile creation is the onboarding intent associated
   with a profile?
9. Which component owns retries and user-visible error recovery between
   generation and canonical persistence?
10. Which future experience capabilities are enabled internally, and which are
    hidden from public onboarding until separately validated?
11. Should old `sessionStorage` V1 drafts be migrated automatically or simply
    expired with a clear restart path?
12. What is the final product language for “complete” so users understand scope
    without interpreting it as a guarantee of content availability?

## 15. Decision answers

| Question                                             | Decision                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Retain current six-step shell?                       | YES, as a reusable shell and accessibility foundation, not as a frozen contract.                                              |
| Fixed or adaptive?                                   | HYBRID: stable semantic core plus conditional branches.                                                                       |
| Essential new information now?                       | Content needs, CTA hierarchy, media availability/preference and simple/complete/auto scope.                                   |
| What should Engine V2 infer?                         | Layout, visual family, exact theme, typography, texture, cards, buttons, motion, responsive behavior and section composition. |
| What belongs in Power Editor V2?                     | Professional visual and structural customization after generation.                                                            |
| What belongs in Page Orchestrator?                   | Experience type, high-level structure, conditional questions, content-to-structure translation and future commerce handoff.   |
| What belongs in Commerce Intake?                     | Products/services, imports, catalog normalization and commerce-specific data.                                                 |
| Can V2 remain stable for future commerce/mini-sites? | YES at the semantic contract level, with namespaced extensions and future adapters.                                           |
| Does it avoid link-in-bio lock-in?                   | YES: links/actions are generic content and outcome domains, not the whole product model.                                      |
| Does it avoid implementing future products now?      | YES: future types remain gated signals and extension seams only.                                                              |

## 16. Files inspected

- `CRIPQER_ONBOARDING_ENGINE_V2_POWER_EDITOR_AUDIT.md`
- `src/components/onboarding/OnboardingShell.tsx`
- `src/components/onboarding/StepBusiness.tsx`
- `src/components/onboarding/StepGoal.tsx`
- `src/components/onboarding/StepPersonality.tsx`
- `src/components/onboarding/StepIdentity.tsx`
- `src/components/onboarding/StepPrimaryAction.tsx`
- `src/components/onboarding/StepSummary.tsx`
- `src/components/onboarding/CompletionScreen.tsx`
- `src/components/onboarding/primitives.tsx`
- `src/components/onboarding/index.ts`
- `src/components/onboarding/INTEGRATION.md`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/config.ts`
- `src/lib/onboarding/validation.ts`
- `src/routes/onboarding-preview.tsx`
- `src/routes/editor.tsx`
- `src/lib/parametric-engine-v2/internal-entrypoint.ts`
- `src/lib/canonical-page/contract.ts`
- `src/services/canonical-page.service.ts`
- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/adapters/index.ts`
- `src/premium-template-studio/state/StudioProvider.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`

## Scope confirmation

- Architecture designed: **YES**
- Implementation started: **NO**
- Onboarding V2 implemented: **NO**
- Engine V2 modified: **NO**
- Power Editor V2 modified: **NO**
- Basic Editor modified: **NO**
- Routes created or modified: **NO**
- Supabase/schema modified: **NO**
- Commerce/Mini-Sites implemented: **NO**
- Files modified: **NONE** (source files)
- Report created: `CRIPQER_ONBOARDING_V2_TARGET_ARCHITECTURE.md`
