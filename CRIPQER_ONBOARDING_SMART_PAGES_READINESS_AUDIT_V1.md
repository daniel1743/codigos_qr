# CRIPQER ONBOARDING — SMART PAGES READINESS AUDIT V1

**Task ID:** `CRIPQER_ONBOARDING_SMART_PAGES_READINESS_AUDIT_V1`  
**Type:** `READ_ONLY_PRODUCT_ARCHITECTURE_UX_AUDIT`  
**Branch audited:** `feat/basic-editor-editorial-canvas-ui`

## EXECUTIVE VERDICT

`CONTRACT_PATCH_REQUIRED`

The current onboarding architecture is usable as a semantic-intent layer, but
it is not yet a complete input surface for `SMART_PAGES_5`. `OnboardingIntentV2`
captures identity, a broad goal, visual preference, content needs, actions,
media intent and scope. It does **not** capture the owner facts that Smart
Pages must preserve in `NormalizedContentV1`: services, products, menu items,
projects, prices, durable item media, categories, contact profile or other
structured content.

The repository also has a second, active user-facing creation surface at
`/pages/new`. That form already collects structured items for services,
catalog, portfolio, menu, promotion and event pages and uses the existing
PAGES_7 → Engine V2 → `BioTemplateConfig` path. This is the strongest existing
content-capture precedent, but it is not the same flow as Onboarding V2.

The recommended change before Smart Pages 5 is additive:

- keep the semantic part of `OnboardingIntentV2` or introduce a versioned
  adapter around it;
- add a conditional owner-content collection boundary;
- map that result to `PageGenerationRequest` and the existing page-generator
  host seam;
- simplify or derive fields that currently have no meaningful generation effect;
- do not replace the Engine, canonical document, renderer or persistence model.

No source, test, route, database, dependency or Smart Pages file was changed.
Only this report was written.

## ACTIVE ONBOARDING MAP

### Determination

There is no standalone `/onboarding` production route in the route tree.
Three related surfaces coexist:

| Surface                                                  | Status                        | Evidence                                                                                             | Role                                                                                            |
| -------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/components/onboarding/**` + `src/lib/onboarding/**` | `TEMP_COMPATIBILITY / LEGACY` | V1 shell and V1 contract are exported but no current route imports `OnboardingShell`                 | Old six-step semantic-only flow; no generation or persistence                                   |
| `/onboarding-preview` + `OnboardingV2Shell`              | `INTERNAL_ACTIVE_PATH`        | `src/routes/onboarding-preview.tsx`, linked from `/editor` for missing profiles and accepted invites | Eight-step V2 flow; can generate and persist when the server flag is enabled                    |
| `/pages/new` + `GeneratedPageForm`                       | `ACTIVE_PAGE_CREATION_PATH`   | `src/routes/pages.new.tsx` and `createGeneratedPage`                                                 | Current child-page generator; collects structured owner items and persists a `public.pages` row |

The ordinary account entry is `/editor`: unauthenticated users see `Auth`;
after authentication, a missing profile is sent to `/onboarding-preview`.
Existing users may receive the onboarding invite from `/editor`; accepting it
also sends them to `/onboarding-preview`.

`/onboarding-preview` is marked internal, `noindex`, and excluded from aliases,
but the route itself is not blocked in the component by
`VITE_ENABLE_ONBOARDING_V2`. The flag is enforced at the server generation
boundary by `requireOnboardingV2Enabled()`. Therefore the UI can be reached
while generation is disabled and will fail only at submission. This is a
release/UX gap, not evidence of a second engine.

The main navigation does not expose onboarding or `/pages`; it exposes the
authenticated profile, page, editor, QR, documents and account destinations.

## CURRENT USER FLOW

### A. New-user path through `/editor`

1. User opens `/editor`.
2. `Auth` asks for email and password to sign in, or full name, email,
   password and terms acceptance to sign up.
3. Once authenticated, `/editor` loads the user's profile.
4. If no profile exists, the route assigns `/onboarding-preview`.
5. `OnboardingV2Shell` collects eight steps described below.
6. The shell builds and validates one `OnboardingIntentV2`.
7. `completeOnboardingV2Handoff` calls the server generation function.
8. The existing Engine V2 generates a fresh canonical config and
   `validateTemplate()` validates it.
9. The handoff resolves or creates the authenticated user's `profiles` row.
10. `canonicalPageService.save()` persists the generated canonical envelope to
    the profile's canonical page path.
11. Basic profile fields and representable action links are written through the
    existing profile/link services.
12. The user is redirected to `/editor?profileId=...`. The editor resolves the
    valid canonical config to the Power Editor path.

This flow generates the user's main profile page. It does not create a child
`public.pages` row and does not fan out a Smart Pages mini-site.

### B. Existing-user invite path

`/editor` reads `template_config.onboarding_v2_invite_status`. When the status
is `unseen`, it shows “Nuevo Onboarding disponible”. Accepting the invite marks
it accepted and navigates to `/onboarding-preview?profileId=...`. An accepted
invite is redirected there again on a later `/editor` load. Declining marks it
declined and keeps the user in the existing editor.

### C. Current child-page generator path

`/pages` lists the main profile and additional pages. `/pages/new` first asks
“¿Qué quieres crear?” and offers the generated objectives plus “Página simple”.
For a generated objective, the form collects title, business name, activity,
description, optional/required cover, primary CTA, style and objective-specific
items. Submission follows:

`GeneratedPageInput → mapGeneratedPageToEngineInput → generatePageCanonicalFn →
Engine V2 → validateTemplate → pageService.createPage →
pageCanonicalService.saveDraft → read-back verification`.

The result lands in the page detail/editor path as a draft. This path is
architecturally closer to Smart Pages because it creates one independent
`public.pages` row per generated page.

## V2 USER-FACING STEPS

`OnboardingV2Shell` has **8 primary screens**. The screens contain conditional
subfields and multi-select controls, so “8 steps” is not the same as eight
individual questions.

| Step | User-facing question                           | Fields collected                                                      | Required to continue                                                         | Downstream effect                                                               |
| ---: | ---------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
|    1 | “¿Quién eres y a qué te dedicas?”              | Name/brand, activity/profession, optional bio, local logo/avatar file | Name and activity                                                            | Name, activity and bio reach Engine/basic profile; file is only a local preview |
|    2 | “¿En qué categoría encaja mejor tu actividad?” | Business category; custom category for “Otro”                         | Category; custom text for “Otro”                                             | Validated, but current V2 adapter primarily uses the free-form activity         |
|    3 | “¿Qué quieres conseguir con tu página?”        | Primary goal; custom goal for “Otro”                                  | Goal; custom text for “Otro”                                                 | Maps to Engine goal; custom goal falls back to `leads` and is deferred          |
|    4 | “¿Qué sensación quieres transmitir?”           | Visual direction; custom description for “Otra”                       | Direction; custom text for “Otra”                                            | Recognized directions map to Engine style; custom description is deferred       |
|    5 | “¿Qué quieres mostrar o facilitar?”            | 15 content-need options, “Aún no sé”, optional custom content label   | At least one option or no-content choice                                     | Selected feature tokens reach Engine; no actual content records are collected   |
|    6 | “¿Cómo quieres que te contacten?”              | Optional primary action, destination, ordered secondary actions       | No primary action is allowed; selected non-optional destinations need values | A subset reaches Engine; links are later materialized by the Basic handoff      |
|    7 | “¿Qué material tienes disponible?”             | Media preference plus five availability toggles                       | Media preference                                                             | Mostly diagnostic; no file upload occurs                                        |
|    8 | “Revisa tus respuestas”                        | Simple/complete/auto scope; conditional commercial mode               | Scope and commercial mode when products/sell are selected                    | Scope/commercial are diagnostic or deferred in current Engine mapping           |

The completion text says the page is generated and saved, then offers “Abrir
Power Editor”. The final browser destination is `/editor?profileId=...`, not
`/pages/$pageId/edit`.

## CURRENT DATA CONTRACT

The authoritative semantic contract is
`src/lib/onboarding-v2/types.ts`. It deliberately contains no renderer values,
catalog records, database IDs, routes or canonical document fields. That
boundary is correct; the missing piece is an owner-content contract alongside
the intent.

Current V2 persistence is browser-session draft persistence under
`cripqer.onboarding.draft.v2`. The draft strips the local `avatarPreview`.
Completed intent is not stored as an onboarding table; it is sent through the
generation/handoff path.

The current Engine adapter maps:

- `identity.displayName` → Engine `content.name` and Basic profile name;
- `identity.professionOrActivity` → Engine `profession` and Basic profile
  profession;
- `identity.bio` → Engine content bio and Basic profile bio;
- recognized visual preferences → Engine style;
- primary WhatsApp, booking, website, Instagram/follow and email actions →
  supported Engine actions;
- secondary HTTPS destinations → ordered Engine content links;
- content-need types → Engine `selectedFeatures` tokens.

It does not map a normalized services/products/menu/portfolio/contact model.

## FIELD-BY-FIELD CLASSIFICATION

| Current field/question                   | Current contract field                                                                                | Actually used?                                                                                  | Smart Pages needs it?            | User must provide it?    | Can derive it?                        | Friction       | Decision                        | Reason                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ | ------------------------------------- | -------------- | ------------------------------- | ----------------------------------------------------------------- |
| Name or brand                            | `identity.displayName`                                                                                | Yes: Engine and Basic profile                                                                   | Yes                              | Yes                      | No safely                             | Low            | `KEEP`                          | Core identity fact                                                |
| Activity/profession                      | `identity.professionOrActivity`                                                                       | Yes: Engine profession and profile profession                                                   | Yes                              | Yes                      | No safely                             | Low            | `KEEP`                          | Also anchors category inference                                   |
| Short description                        | `identity.bio`                                                                                        | Yes when non-empty                                                                              | Useful, optional                 | No                       | No safely                             | Low            | `KEEP / OPTIONAL`               | Helps first page without requiring long copy                      |
| Logo/avatar file                         | draft `identity.avatarPreview`                                                                        | No durable use; local object URL only                                                           | Media may be useful              | No                       | No                                    | Medium         | `MOVE_AFTER_GENERATION`         | Upload boundary is absent; local preview cannot be an owner asset |
| Avatar asset ref                         | `identity.avatarAssetRef`                                                                             | Contract/adapter only; active UI never fills it                                                 | Optional                         | No                       | No                                    | None in UI     | `OPTIONAL / DEFER`              | Keep for a future durable media adapter                           |
| Banner asset ref                         | `identity.bannerAssetRef`                                                                             | Contract/adapter only; active UI never fills it                                                 | Useful for media-led pages       | No                       | No                                    | None in UI     | `OPTIONAL / DEFER`              | Requires real upload/storage ownership                            |
| Business category                        | `business.category`                                                                                   | Validated; not the main Engine category decision                                                | Helpful hint                     | Yes today                | Often from activity                   | Medium         | `MERGE / DERIVE`                | Avoid asking both category and activity as equal authorities      |
| Custom category                          | `business.customCategory`                                                                             | Validated; activity is what current adapter forwards                                            | Only when truly unknown          | Conditional              | No                                    | Low            | `KEEP / CONDITIONAL`            | Useful fallback for “Otro”                                        |
| Primary goal                             | `outcome.primaryGoal`                                                                                 | Yes: mapped to Engine goal                                                                      | Yes                              | Yes                      | Not reliably                          | Low            | `KEEP`                          | Main product intent                                               |
| Custom goal                              | `outcome.customGoal`                                                                                  | No direct Engine field; safe `leads` fallback                                                   | Not required for first page      | Conditional              | No                                    | Medium         | `OPTIONAL / DEFER`              | Preserve as diagnostic or ask after result                        |
| Experience hint                          | `outcome.experienceHint`                                                                              | Adapter defers it; active V2 UI does not set it                                                 | Yes for Smart Pages planning     | No                       | Partly from goal/content              | Hidden         | `DERIVE / CONDITIONAL`          | Experience should be selected or inferred once, not duplicated    |
| Visual direction                         | `visualDirection.preference`                                                                          | Recognized values map to Engine style                                                           | Optional preference              | Currently yes            | Engine can choose                     | Medium         | `OPTIONAL`                      | Keep as a high-level preference, not a hard requirement           |
| Custom visual description                | `visualDirection.customDescription`                                                                   | Deferred; no Engine field                                                                       | No for first page                | Conditional              | No                                    | Medium         | `DEFER`                         | Free-form visual text does not affect current generation          |
| Content need checklist                   | `contentNeeds.items`                                                                                  | Feature tokens reach Engine                                                                     | Only as a hint                   | One option or no-content | From experience/goal partly           | High when long | `MERGE / CONDITIONAL`           | Keep selected experience, collect actual records separately       |
| No-content flag                          | `contentNeeds.userHasNoContentYet`                                                                    | Diagnostic/inferred only                                                                        | Useful for routing               | Optional                 | From empty content                    | Low            | `KEEP / DERIVE`                 | Should route to a completion path, not pretend content exists     |
| Custom content label                     | `ContentNeedSelectionV2.customLabel`                                                                  | Deferred                                                                                        | Not needed before first page     | Conditional              | No                                    | Medium         | `MOVE_AFTER_GENERATION`         | Current Engine cannot act on it                                   |
| Primary action type                      | `actions.primary.type`                                                                                | Only five types are Engine-compatible                                                           | Yes for conversion pages         | Optional for presence    | Goal can suggest, but not destination | Medium         | `KEEP / SIMPLIFY`               | Ask one clear contact method                                      |
| Primary action value                     | `actions.primary.value`                                                                               | Used when host-compatible                                                                       | Yes when CTA enabled             | Conditional              | No                                    | Medium         | `KEEP / CONDITIONAL`            | Owner destination must not be invented                            |
| Secondary actions                        | `actions.secondary[]`                                                                                 | HTTPS values become links; Basic handoff supports more                                          | Optional                         | No                       | No                                    | High           | `MOVE_AFTER_GENERATION`         | Priority and type semantics are not preserved in Engine           |
| Media preference                         | `media.preference`                                                                                    | Mostly recorded/diagnosed; not passed as a generation decision                                  | Optional                         | Currently yes            | From uploaded media                   | Medium         | `REMOVE / DERIVE`               | Replace with actual upload/skip choice                            |
| Media availability toggles               | `media.hasOwnPhotos`, `hasVideos`, `hasLogoOrAvatar`, `hasPortfolioOrGalleryAssets`, `needsMediaHelp` | Not meaningfully consumed by current V2 generation                                              | Useful only for routing          | No                       | From actual assets                    | High           | `MERGE / MOVE_AFTER_GENERATION` | Five booleans duplicate a real media intake decision              |
| Scope/density                            | `scope.density`                                                                                       | Current adapter records it as inferred/deferred; Engine does not receive it as a semantic input | Smart Pages needs a policy       | Currently yes            | From objective/content size           | Medium         | `DERIVE / OPTIONAL`             | Objective presets already choose density                          |
| Scope user-selected flag                 | `scope.userSelected`                                                                                  | Metadata only                                                                                   | No                               | No                       | Yes                                   | None           | `REMOVE_FROM_UI`                | Internal provenance, not a user decision                          |
| Commercial mode                          | `commercial.mode`                                                                                     | Diagnostic only; no catalog or checkout behavior                                                | Useful as policy, not as content | Conditional today        | From goal/action                      | High           | `DERIVE / DEFER`                | Duplicates sell/products/CTA and cannot create commerce           |
| Commercial relevance                     | `commercial.relevant`                                                                                 | Derived by `isCommercialRelevant`                                                               | Internal routing hint            | No                       | Yes                                   | None           | `DERIVE`                        | Correctly derived from goal/content need                          |
| Extensions                               | `extensions`                                                                                          | Deferred namespace only                                                                         | Not for minimum flow             | No                       | No                                    | None           | `DEFER`                         | Keep versioned escape hatch, never use for hidden production data |
| Contract version/source/timestamp/locale | `version`, `meta.*`                                                                                   | Validation, diagnostics and generation metadata                                                 | Internal only                    | No                       | Yes                                   | None           | `KEEP_INTERNAL`                 | Required provenance, should not be shown as user questions        |

## UNUSED / REDUNDANT FIELDS

### Not meaningfully used by the current V2 generation

- `business.category` is validated, but the adapter's main decision comes from
  the free-form activity and Engine normalizer.
- `business.customCategory` is not the value the current adapter forwards when
  the activity is custom; it is largely a validation-side field.
- `outcome.customGoal` is not represented by Engine V2 and falls back to
  `leads`.
- `visualDirection.customDescription` is stored and diagnosed but not consumed
  as a visual instruction.
- `media.preference` and the five media booleans do not upload or provide
  durable media and do not author the current Engine content model.
- `scope.density` is recorded as deferred/inferred and is not a reliable Engine
  generation input.
- `commercial.mode` is explicitly diagnostic only.
- `contentNeeds.userHasNoContentYet` helps diagnostics but does not add owner
  content.

### Redundant product questions

- `primaryGoal`, selected content needs and commercial mode partially ask the
  same business question in three vocabularies.
- business category and activity are two classifications of the same identity;
  one should be the owner input and the other a hint/derived value.
- media preference plus five yes/no flags is more complex than “add photos now
  or continue without them”.
- density is asked after the flow while Page Generator objective presets already
  choose it.
- secondary actions add complexity but do not provide equivalent Engine CTA
  semantics and are better handled after the first page.

## SMART PAGES MISSING INPUTS

`PageGenerationRequest` requires `businessType`, `goal`, `density`, `salesMode`,
`primaryAction`, `secondaryActions` and a complete `NormalizedContentV1`.
Onboarding V2 only supplies fragments of the first six and none of the actual
normalized content tree.

| Missing or partial input                                               | Needed by Smart Pages                                  | Current state                                                                | Classification                          | Recommendation                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Explicit experience (`services`, `catalog`, `portfolio`, `menu`, etc.) | Page plan and objective                                | Only indirect goal/content hints; no active V2 experience question           | `ASK_DURING_ONBOARDING` or derive       | Add one plain-language “¿Qué quieres crear?” choice; map only supported experiences        |
| Structured services                                                    | Service sections and owner truth                       | Missing; V2 asks only “Servicios”                                            | `ASK_ONLY_IF_RELEVANT`                  | Collect one or more service records                                                        |
| Structured products                                                    | Retail product/product-grid blocks                     | Missing; V2 asks only “Productos”                                            | `ASK_ONLY_IF_RELEVANT`                  | Collect title and real image; price/link optional                                          |
| Structured menu items                                                  | Menu content                                           | Missing; V2 asks only “Menú” indirectly through action/content               | `ASK_ONLY_IF_RELEVANT`                  | Collect item name and optional price; category only if host supports it                    |
| Structured portfolio projects                                          | Portfolio blocks                                       | Missing; V2 asks only “Portafolio”                                           | `ASK_ONLY_IF_RELEVANT`                  | Collect project title, real media and real link under current host rules                   |
| Item descriptions                                                      | Useful owner copy                                      | Missing                                                                      | `ASK_ONLY_IF_RELEVANT`                  | Optional per item                                                                          |
| Prices                                                                 | Services/products/menu presentation                    | Missing                                                                      | `ASK_ONLY_IF_RELEVANT`                  | Optional unless owner chooses to show prices; never infer                                  |
| Item media                                                             | Product/portfolio proof                                | Missing; only a local avatar preview exists                                  | `ASK_ONLY_IF_RELEVANT`                  | Upload/import durable assets or allow skip where supported                                 |
| Cover/banner                                                           | Current catalog/portfolio host path expects real cover | Missing as durable V2 UI input                                               | `ASK_ONLY_IF_RELEVANT`                  | Request only for media-led objective, with real asset validation                           |
| Sales mode                                                             | Orchestrator CTA/action policy                         | Commercial mode is partial and diagnostic                                    | `DERIVE / CONDITIONAL`                  | Derive from goal plus selected CTA; do not ask a second commerce question unless needed    |
| Primary destination                                                    | Conversion action                                      | Present only for a subset of actions                                         | `ASK_DURING_ONBOARDING` when CTA chosen | Validate the exact chosen type; do not let UI accept unsupported empty actions             |
| Secondary destinations                                                 | Optional extra links                                   | Partial actions, inconsistent downstream mapping                             | `ASK_AFTER_PAGE_CREATED`                | Add in editor/content completion                                                           |
| Full contact profile                                                   | Contact block                                          | Only one primary action may be present                                       | `ASK_ONLY_IF_RELEVANT`                  | Ask phone/email/address separately only when contact/location is selected                  |
| Location/address/hours                                                 | Local-service trust                                    | Missing                                                                      | `ASK_AFTER_PAGE_CREATED`                | Collect in completion flow unless the page objective requires it                           |
| Social links                                                           | Social blocks                                          | Secondary actions can approximate some links                                 | `ASK_AFTER_PAGE_CREATED`                | Use a dedicated link editor; avoid action-type overloading                                 |
| Categories                                                             | Retail/menu navigation                                 | Smart Pages can normalize them; current canonical host defers category rails | `IMPORT_OPTION / AFTER`                 | Do not ask before first page unless category navigation is a supported product requirement |
| Featured flags/collections                                             | Retail presentation                                    | Missing                                                                      | `AFTER / IMPORT_OPTION`                 | Treat as optional editorial enrichment                                                     |
| Testimonials/team/FAQ                                                  | Proof/support content                                  | Missing                                                                      | `ASK_AFTER_PAGE_CREATED`                | Completion checklist, not first-generation gate                                            |
| Search/filter/detail behavior                                          | Retail runtime requirements                            | Smart Pages plan can request them, current renderer contract defers them     | `DO_NOT_ASK`                            | Engine/canonical capability owner decides; do not expose unsupported controls              |
| Mini-site max pages/navigation                                         | `MiniSitePlanV1`                                       | Missing from V2 UI and main-profile handoff                                  | `ASK_ONLY_IF_RELEVANT` later            | First create one useful page; ask scope only for an approved mini-site flow                |

## OWNER FACTS REQUIRED

Cripqer must preserve only facts supplied by the owner or a trusted import. The
minimum truthful content varies by experience:

| Experience       | Before generation                                                                            | Optional before generation                      | Current host constraint                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Services         | Business name, activity, at least one service name for a useful service page                 | Service description, price, image, cover, CTA   | Current Generated Page form accepts description/price/image as optional service fields                                                                 |
| Catalog          | Business name, activity, at least one product name and real product image                    | Price, description, product link, cover         | Current page-generator validation requires a cover and an image per product; retail mapping must preserve this gate                                    |
| Portfolio        | Business name, activity, at least one project name, real project image and real project link | Description, cover, CTA                         | Current host rejects a project without image or link and requires a cover                                                                              |
| Menu             | Business name, activity, at least one item name                                              | Price, description, category, order, menu image | Current `GeneratedPageItem` has no category field; category must remain deferred or be added through an approved host contract                         |
| Landing/presence | Business name, activity and short description or one real link                               | Cover, social links, CTA                        | Do not invent testimonials, services or products                                                                                                       |
| Promotion/event  | Business identity, real offer/event title and any real date/destination                      | Media, description, location, CTA               | Supported by `/pages/new`, but not represented as an `ExperienceType` in current Smart Pages `PageGenerationRequest`; requires explicit mapping policy |

The following must never be inferred: price, discount, stock, SKU, review,
rating, address, opening hours, service availability, product image, social
handle, booking URL, purchase URL or customer quote.

## ENGINE-OWNED DECISIONS

The current onboarding does not expose exact layout, fonts, colors, card style,
button style, grid columns, spacing, animation settings or block composition.
That is correct. Engine V2 and the Power Editor own those visual decisions.

The following should remain Engine-owned:

- layout family, section ordering and block composition;
- typography defaults, color palette, cards, buttons and spacing;
- responsive columns and mobile behavior;
- media strategy and visual weight;
- animation and motion defaults;
- whether a supported block is useful for the supplied content;
- density when the user has not explicitly requested a high-level simple or
  complete result.

The user may provide only high-level signals: what they do, what they want the
visitor to do, what they actually offer, and an optional visual preference.

## FRICTION FINDINGS

### P0/P1 product risks

1. **V2 is reachable while generation can be disabled.** The route is not
   guarded, while the server function rejects submission when the flag is not
   exactly `"true"`. A user can complete eight screens before seeing failure.
2. **A selected booking action can pass UI completion without a destination,**
   but the Engine adapter later rejects it. `buy` and `request_quote` can also
   pass the V2 contract without a destination, but the current Engine adapter
   cannot represent those primary action types.
3. **The user is asked about content without being given a content capture
   surface.** Selecting “Productos” does not collect a product; the resulting
   page can therefore not be a truthful product page.
4. **“Guardar mis respuestas” understates what happens.** Submission generates,
   persists and changes the main profile page before sending the user to the
   editor.

### General UX friction

- Eight semantic screens are long for a first result, especially with 15
  content toggles, secondary actions and five media toggles.
- Visual direction is mandatory even though “Que Cripqer decida” is available
  and Engine V2 can safely choose defaults.
- Scope/density is requested at the final review but does not reliably alter
  current V2 generation.
- Commercial mode repeats information already present in “Vender”,
  “Productos” and the selected CTA.
- A local file input gives the impression that the asset is part of the page,
  while the copy correctly says it is not uploaded or saved. It is still a
  confusing dead end for a non-technical owner.
- Secondary actions are an advanced information architecture choice, not a
  minimum onboarding requirement.
- “Acción principal”, “dirección visual”, “alcance” and “material” are
  understandable with help text, but the internal concept of a semantic intent
  should never be exposed as a user task.

## LANGUAGE / TERMINOLOGY FINDINGS

Recommended plain-language vocabulary:

| Current/internal concept       | Preferred user copy                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Business category              | “¿A qué te dedicas?”; use category as a suggestion, not an authority               |
| Primary goal / conversion goal | “¿Qué quieres que haga la persona que visite tu página?”                           |
| Experience type                | “¿Qué quieres crear?”                                                              |
| Primary action / CTA           | “¿Cómo quieres que te contacten?”                                                  |
| Destination                    | “Número, correo o enlace” depending on selected action                             |
| Content needs                  | “¿Qué quieres mostrar?”                                                            |
| Density/scope                  | “¿Quieres algo sencillo o con más información?”; preferably derive it              |
| Media preference               | “Añade fotos ahora” / “Continuar sin fotos”                                        |
| Commercial mode                | “¿Quieres mostrar, recibir pedidos o vender?” only when a relevant branch needs it |
| Engine / semantic intent       | Never show in normal UI                                                            |
| Power Editor                   | Keep only as the actual destination label; avoid “Basic Editor” in the same flow   |

The current UI is mostly in plain Spanish, but option vocabularies are too
technical in aggregate rather than individually. The larger language issue is
that several questions describe internal planning signals instead of asking for
the owner fact needed to build a page.

## POST-GENERATION FIELDS

These are better collected after a useful first page exists:

- address, map position and opening hours;
- FAQ and detailed service explanations;
- testimonials, ratings and team members;
- additional products, services, projects and galleries;
- social links and secondary links;
- banner/avatar refinements and advanced media treatment;
- category navigation, featured collections, benefits and rich item detail;
- fine visual tuning in Power Editor;
- analytics, conversion labels and advanced tracking metadata.

The intended experience should be:

`first useful page → preview/editor → “Completa tu página” checklist → optional
content and design improvements`.

This avoids blocking generation on facts that do not affect the first truthful
result.

## LEGACY / DUPLICATION

| Area                     | Finding                                                                                                                                                              | Classification                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| V1 UI/contract           | `src/components/onboarding/**` and `src/lib/onboarding/**` are not imported by the current route tree; V1 remains referenced by compatibility code and documentation | `TEMP_COMPATIBILITY`             |
| V1 → V2 adapter          | `adaptOnboardingV1ToV2` explicitly reports lost content/media/scope/commercial/secondary domains                                                                     | `DO_NOT_TOUCH_YET`               |
| V2 onboarding generation | Generates and persists the main profile canonical page                                                                                                               | `KEEP_ACTIVE_WHEN_ENABLED`       |
| Page Generator           | Generates child `public.pages` rows with structured item content                                                                                                     | `KEEP_ACTIVE`                    |
| Engine invocation        | Both paths call the same Engine V2 entrypoint through server boundaries                                                                                              | `KEEP_ONE_ENGINE`                |
| Validation               | V2 intent validation, Generated Page validation and canonical `validateTemplate` have distinct boundaries, not a second renderer/schema                              | `KEEP_BOUNDARIES`                |
| Persistence              | V2 uses `canonicalPageService` for the profile; Page Generator uses `pageService` + `pageCanonicalService` for child pages                                           | `DO_NOT_MERGE_BLINDLY`           |
| Feature flag             | `VITE_ENABLE_ONBOARDING_V2` protects server generation, not route access                                                                                             | `PATCH_POLICY_LATER`             |
| Handoff                  | V2 lands in `/editor?profileId`; Page Generator lands in a child page editor                                                                                         | `RECONCILE_BEFORE_SMART_PAGES_5` |

This is product-flow duplication, not evidence of a second Engine V2 or second
canonical renderer. The main architectural risk is that two forms ask for
identity, goal, style, CTA and content concepts but terminate in different
persistence models.

## KEEP

- `OnboardingIntentV2` as a semantic intent contract or compatibility layer.
- Business identity: name, activity and optional short description.
- One primary visitor goal.
- A high-level optional visual preference.
- Explicit owner CTA destination when the user chooses a contact action.
- “No content yet” as a truthful route to later completion.
- Deterministic validation, durable-asset checks and diagnostics.
- Existing Engine V2, canonical validation and existing persistence authorities.
- `/pages/new` item-editor patterns as the source of truth for conditional
  service/product/project/event content capture.

## REMOVE / MOVE

No deletion is authorized by this audit. The following are recommendations for
future approved work:

- remove the mandatory standalone visual question or make it optional;
- derive density from objective/content instead of requiring it;
- derive commercial relevance/mode from goal and CTA unless a real commerce
  branch exists;
- merge business category into activity classification;
- move secondary actions, social links and advanced media choices after the
  first page;
- move local avatar preview to a real upload step or remove it from onboarding;
- remove unsupported primary action options from a generation branch, or add a
  host mapping before exposing them;
- replace the 15-option content checklist with one experience choice followed
  by conditional item capture;
- keep V1 files only as compatibility until a separate removal audit approves
  their deletion.

## ADD

Before Smart Pages 5, add through an approved contract/adapter boundary:

- explicit experience/objective selection or a deterministic derivation policy;
- conditional structured records for services, products, menu items and
  portfolio projects;
- durable media references for cover and item images where required;
- price as an optional owner-supplied value;
- owner-supplied item links/actions where the experience supports them;
- one clear primary contact method with type-specific validation;
- diagnostics for missing required facts instead of fabricated fallbacks;
- a mapping from onboarding output to `PageGenerationRequest`;
- an explicit main-profile versus child-page handoff policy;
- a post-generation content-completion checklist.

Do not add stock, SKU, checkout, discounts, urgency, ratings, testimonials,
hours or address as mandatory onboarding fields merely because future schemas
mention them.

## PROPOSED MINIMUM ONBOARDING

This is a proposal only; it was not implemented.

### Step 1 — “¿Qué quieres crear?”

Ask for the high-level experience: service page, catalog, portfolio, menu,
promotion/event or simple presence. Keep only options supported by the target
host; do not expose `listings` as a new database page type.

### Step 2 — “Cuéntanos sobre tu negocio”

Collect:

- business/brand name;
- activity/profession;
- short description, optional;
- primary visitor outcome: contact, WhatsApp, booking, show services, show
  work, show menu or show products.

Category should be a derived or optional hint, not a second mandatory identity
classification.

### Step 3 — “Dinos qué ofreces”

Show one conditional editor using the existing owner-item rules:

- services: name required; description and price optional;
- products: name and real image required under current host; price/link optional;
- portfolio: project name, real image and real link required under current host;
- menu: item name required; price/category optional only where supported;
- promotion/event: real title and date/destination as relevant.

Allow “continuar sin contenido” only for a simple presence page, and clearly
route the user to content completion rather than presenting invented items.

### Step 4 — “¿Cómo quieres que te contacten?”

Ask for one primary method and its real number, email or URL. Secondary links
are optional after the first page. The UI must not accept a booking action with
no destination if the current host will reject it.

### Step 5 — “Añade fotos si las tienes”

Offer durable upload/import for cover and relevant item media, or a clear skip.
Do not collect five availability booleans when the system can inspect actual
uploaded assets.

### Generate

Cripqer builds the first truthful page, validates the canonical result, and
opens the appropriate page editor. For a mini-site, the host coordinator should
fan out independent `public.pages` rows only after this single-page path is
stable.

## SMART_PAGES_5 READINESS

### Current readiness

`NOT_READY_FOR_DIRECT_ONBOARDING_TO_PAGEGENERATIONREQUEST`

The existing V2 intent cannot be passed directly to `PageGenerationRequest`:

- `businessType`, goal and some CTA information can be mapped;
- density and sales mode need explicit derivation policy;
- action vocabularies differ and several current V2 options are unsupported;
- `content: NormalizedContentV1` is absent;
- durable item media and structured records are absent;
- V2 handoff persists the main profile, while Smart Pages child-page creation
  uses `public.pages` rows.

### Minimum safe gate

1. Decide whether Smart Pages 5 extends V2 with an additive content payload or
   introduces a versioned V3 input contract. Do not silently overload
   `contentNeeds` with records.
2. Add a host adapter from the chosen onboarding result to
   `PageGenerationRequest`.
3. Reuse the existing `/pages/new` conditional item rules for owner facts.
4. Validate destination types before invoking Engine V2.
5. Validate owner content and durable media before generation; reject missing
   required fields rather than fabricate them.
6. Choose one handoff policy: main profile for the first page or child
   `public.pages` for Smart Pages. Mini-site fan-out must remain host-owned.
7. Verify one services, one catalog, one portfolio and one menu fixture through
   Engine V2, `validateTemplate` and the existing public renderer.
8. Keep hours, address, FAQ, team, testimonials, rich retail detail, stock,
   checkout and fine design controls after first-page generation.

### Q1–Q12

1. **What onboarding is active today?** `/onboarding-preview` with
   `OnboardingV2Shell` is the active internal handoff path when reached from
   `/editor`; `/pages/new` is the active structured child-page generator. V1 is
   legacy/compatibility and is not routed.
2. **How many user-facing steps/questions exist?** V2 has 8 primary screens,
   with conditional text fields, 15 content choices, multiple action controls
   and five media toggles. `/pages/new` is a separate choose-plus-form flow.
3. **Which fields are not meaningfully used?** V2 media preference/booleans,
   scope density, commercial mode, custom goal, custom visual description and
   local avatar preview have no meaningful current Engine generation effect.
4. **Which questions should Engine V2 decide?** Layout, theme, exact colors,
   fonts, cards, buttons, columns, spacing, animations, responsive behavior
   and detailed block composition.
5. **Which owner facts are missing?** Structured services, products, menu
   items, projects, prices, item media, durable cover, categories, full contact
   data, hours, address, FAQ, team, testimonials and social/link records.
6. **Which missing facts must be collected before generation?** Identity plus
   one experience/goal, one real item for a structured page, required media for
   catalog/portfolio under the current host, and a real primary destination when
   a conversion CTA is chosen.
7. **Which can wait until after generation?** Secondary links, hours, address,
   FAQ, testimonials, team, social links, extra items, advanced media and fine
   design tuning.
8. **Does current onboarding duplicate Page Generator or Engine logic?** Yes at
   the product-flow level: both ask identity, goal, style, CTA and content
   concepts. They call the same Engine, so this is not a second Engine. Their
   persistence/handoff models differ and must be reconciled.
9. **What should be removed or simplified?** Make visual preference optional,
   derive density/commercial relevance, merge category/activity, remove the
   long generic checklist, defer secondary actions, and replace media toggles
   with real upload/skip.
10. **What should be added?** Conditional owner-item capture, durable media,
    explicit experience, type-specific CTA validation and the adapter to
    `PageGenerationRequest`.
11. **Can V2 be adapted, or is V3 justified?** V2 can remain the semantic
    compatibility layer, but it needs an additive content contract and host
    adapter. A full V3 replacement is not justified yet; use a versioned V3
    only if the product intentionally changes the whole payload and migration
    policy.
12. **What is the minimum input for a useful page?** Business name, activity,
    one clear experience/goal, one real owner content item when the page is
    structured, and one real CTA destination if conversion is requested.
    Short description and cover are optional for simple pages, but cover/item
    media become required where the current host cannot render the experience
    truthfully without them.

## NOT_VERIFIED

- No browser run or live Supabase persistence was executed for this read-only
  audit.
- No production environment value was assumed for
  `VITE_ENABLE_ONBOARDING_V2`; source confirms exact-string flag behavior only.
- The repository does not expose a route-level authentication/feature guard on
  `/onboarding-preview`; the effective production availability may depend on
  deployment routing and environment configuration not inspected here.
- No analytics event contract was exercised during onboarding submission.
- No live user metrics, abandonment data or accessibility/browser matrix was
  available; friction findings are source-based product/UX findings.
- The exact future `OnboardingIntentV3` versus additive content-envelope shape
  remains an implementation/design decision.
- Transactional rollback policy for a failed multi-page Smart Pages fan-out is
  not defined by this audit.

## REPOSITORY SAFETY / AUDIT GATE

- `SOURCE_CHANGED = NO`
- `TEST_CHANGED = NO`
- `ROUTE_CHANGED = NO`
- `UI_CHANGED = NO`
- `SMART_PAGES_CHANGED = NO`
- `ENGINE_V2_CHANGED = NO`
- `EDITOR_CHANGED = NO`
- `CANONICAL_SCHEMA_CHANGED = NO`
- `DB_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `DEPENDENCY_CHANGED = NO`
- `GIT_MUTATION_PERFORMED = NO`
- `IMPLEMENTATION_PERFORMED = NO`
- `SUCCESS_GATE = CRIPQER_ONBOARDING_SMART_PAGES_READINESS_AUDIT_COMPLETE`

`SMART_PAGES_5_ONBOARDING_ADAPTER`, `ONBOARDING_SIMPLIFICATION`,
`ONBOARDING_CONTRACT_PATCH` and `ONBOARDING_V3` were not started automatically.
