# Cripqer — Complete Block Editability and Template Productization Audit V1

**Status:** CRIPQER_COMPLETE_BLOCK_EDITABILITY_FORENSIC_AUDIT_COMPLETE

**Mode:** Read-only forensic product audit. No schema, reducer, Inspector, renderer, template, preset or UI behavior was changed by this audit.

## Executive summary

The Power Editor has a substantial parent-block editing foundation, but it is not yet a complete productization layer for every exposed block. The canonical inventory contains 37 registered block types, 26 section presets and 3 full template definitions.

| Classification                 | Count | Meaning                                                                                                                           |
| ------------------------------ | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| Fully productized blocks       |    16 | Core content authority exists and the block is usable as a singleton or non-collection surface.                                   |
| Partial blocks                 |    21 | At least one visible field, media path, collection operation, direct-selection path or style scope is incomplete.                 |
| Effectively visual-only blocks |     0 | Every registered type has some meaningful Inspector authority, though partial blocks still contain inaccessible visible surfaces. |
| Section presets                |    26 | 0 READY under the strict preset gate; 26 PARTIAL.                                                                                 |
| Full templates                 |     3 | Useful starting configurations, but not fully READY because they contain partial block surfaces and demo content.                 |

The principal P0 defect is Portfolio item media: PortfolioBlock renders each item image, including supplied demo photography, but the generic ItemsEditor does not expose an image upload or replacement control for portfolio items. A user can edit the title, description and link while being unable to replace the prominent project image.

Other important findings are missing reorder controls across most collections, destructive asset cleanup that can strand media restored by undo, generic button/link items without per-item reorder or newTab authority, and direct-canvas selection that normally selects only the parent block rather than the visible child.

## Full inventory and authorities

Inspected authorities:

- constants/blockDefinitions.ts: 37 addable block definitions and demo defaults.
- constants/sectionPresets.ts: 26 section presets.
- engine/BlockRegistry.ts: all 37 renderer mappings.
- components/inspector/Inspector.tsx: generic and specialized Inspector branches, collection editors, AssetField and contextual focus.
- components/blocks/ContentBlocks.tsx, ActionBlocks.tsx, MediaBlocks.tsx, HeroBlock.tsx, PremiumBlocks.tsx and PremiumBlocksII.tsx: all block renderers.
- components/blocks/primitives.tsx: InlineText, BlockTitle, SmartLink and empty-state behavior.
- engine/TemplateRenderer.tsx: BlockFrame selection, reorder, duplicate, hide/delete, motion and public/editor distinction.
- components/canvas/ProfileHeader.tsx: identity, banner, avatar, bio and verification surfaces.
- templates/definitions.ts and templates/recipeRegistry.ts: full templates and recipe-generated content.
- state/templateReducer.ts: generic mutation and history semantics.

The canonical selection model is BlockFrame. Clicking most descendants bubbles to the block frame and selects the parent. Explicit contextual child targets exist for profile cover/avatar/bio and Hero text, image, background, overlay and CTA surfaces. Collection items and generic block media have no individual canvas target. SmartLink is inert in edit mode, which prevents accidental navigation but also means clicking a visible link or button does not focus that item's URL.

## Complete block readiness matrix

Legend: Parent means BlockFrame selection. Partial means the block is useful but fails at least one required authority.

| Block             | Visible user content                                           | Editing/media authority           | Collection lifecycle                      | Direct selection               | Style/destination                                    | Status  | Exact gap                                   |
| ----------------- | -------------------------------------------------------------- | --------------------------------- | ----------------------------------------- | ------------------------------ | ---------------------------------------------------- | ------- | ------------------------------------------- |
| Heading           | title, subtitle, eyebrow/divider variant                       | Generic fields and InlineText     | N/A                                       | Parent + inline text           | Block style/layout                                   | READY   | —                                           |
| Text              | body                                                           | Generic textarea and InlineText   | N/A                                       | Parent + inline text           | Block style/layout                                   | READY   | —                                           |
| Links             | title, item label, URL, description, optional image            | Generic ItemsEditor               | Add/remove, no reorder                    | Parent only                    | URL yes, newTab missing, shared/item typography      | PARTIAL | P1: order and per-item tab behavior         |
| Featured link     | title, subtitle, image, URL                                    | Generic fields and AssetField     | N/A                                       | Parent only                    | URL and block style                                  | READY   | Child image selection is parent-only        |
| Button group      | labels, URLs, descriptions, optional media card                | Generic ItemsEditor               | Add/remove, no reorder                    | Parent only                    | Shared button style, item typography, newTab missing | PARTIAL | P1: order and independent button authority  |
| Call to action    | title, body, label, URL                                        | Generic fields                    | N/A                                       | Parent only                    | Button inherits block style                          | PARTIAL | P1: no independent CTA style                |
| Social icons      | platform and URL                                               | SocialsEditor                     | Add/remove, no reorder                    | Parent only                    | Shared variant/style                                 | PARTIAL | P1: order and item style                    |
| Video             | title, provider, video ID                                      | Generic title/video field         | N/A                                       | Parent only                    | External embed ID and block style                    | READY   | External URL model only                     |
| Image             | image URL and alt                                              | Generic AssetField and alt        | N/A                                       | Parent only                    | Block style/layout                                   | READY   | No child target                             |
| Gallery           | title, image URL, alt                                          | Dedicated gallery editor          | Add/remove/reorder/replace                | Parent only                    | Block style/layout                                   | READY*  | *Asset cleanup is not undo-safe             |
| Media card        | title, body, image, URL                                        | Generic fields and AssetField     | N/A                                       | Parent only                    | Block style                                          | READY   | Body is not inline canvas editable          |
| Portfolio grid    | title, item label, description, URL, image                     | Generic ItemsEditor               | Add/remove, no reorder                    | Parent only                    | URL and block style                                  | PARTIAL | P0: item image has no editor                |
| Document          | title, file name, file size, URL                               | Title/file name/file AssetField   | N/A                                       | Parent only                    | URL and block style                                  | PARTIAL | P1: visible fileSize lacks field            |
| Contact           | title and contact destinations                                 | Specialized fields                | N/A                                       | Parent only                    | Derived destinations, block style                    | PARTIAL | P1: several visible action labels hardcoded |
| QR code           | generated QR, title, URL                                       | Generic title/URL                 | N/A                                       | Parent only                    | Block style                                          | PARTIAL | P1: blank URL becomes example.com QR        |
| Confianza         | trust signals, labels, values, icons                           | Specialized trust editor          | Add/remove, max 4 intentional, no reorder | Parent only                    | Variant/block style                                  | READY   | Fixed vocabulary is intentional             |
| Premium Hero      | text, badge, avatar, banner, background, two CTAs              | Dedicated Hero inspector          | N/A                                       | Parent + explicit Hero targets | Dedicated controls                                   | PARTIAL | P1: embedded avatar has no direct target    |
| Divider           | line, dots, optional label                                     | Variant and label                 | N/A                                       | Parent; decoration child       | Block style                                          | READY   | Decorative child intentional                |
| Spacer            | height                                                         | Height field                      | N/A                                       | Parent; decoration             | Block layout                                         | READY   | Decorative block                            |
| Stats             | value, label, helper, icon                                     | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: item order/style                        |
| Services          | title, description, price, icon, image, CTA                    | Specialized item editor           | Add/remove/reorder                        | Parent only                    | CTA item style and block style                       | READY*  | *Item typography and asset cleanup caveat   |
| Testimonials      | quote, name, role, source, rating, avatar                      | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: order and item typography               |
| Pricing plans     | title, price, period, description, features, recommended, CTA  | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | CTA item style and block style                       | PARTIAL | P1: plan order/features lifecycle           |
| FAQ               | question, answer, accordion behavior                           | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: question order                          |
| Timeline          | date, title, description, icon                                 | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: event order                             |
| Featured media    | image/video, title, description, CTA                           | Dedicated editor and AssetField   | N/A                                       | Parent only                    | Typography, CTA and block style                      | READY   | No child media target                       |
| Floating actions  | label, URL, icon                                               | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: order and item style                    |
| Product card      | title, description, prices, badge, image, CTA                  | Specialized fields and AssetField | N/A                                       | Parent only                    | Block style; limited CTA scope                       | READY   | No image alt                                |
| Product grid      | product title, description, price, image, CTA                  | Specialized item editor           | Add/remove/reorder                        | Parent only                    | Shared block style                                   | READY*  | *Item typography and asset cleanup caveat   |
| Booking           | title, description, service, duration, price, dates/times, CTA | Specialized fields                | N/A                                       | Parent only                    | CTA label but no destination URL                     | PARTIAL | P1: CTA destination authority               |
| Calendar          | generated calendar and disabled dates                          | Disabled-date field only          | N/A                                       | Parent only                    | Shared block style                                   | PARTIAL | P1: not a true user-managed calendar        |
| Events            | date, time, title, location, image, CTA                        | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | CTA URL and block style                              | PARTIAL | P1: event order                             |
| Map               | label, latitude, longitude                                     | Location fields                   | N/A                                       | Parent only                    | Provider/destination fixed by renderer               | READY   | Provider is intentional                     |
| Music / Audio     | title, artist, cover, audio URL                                | Specialized fields and AssetField | N/A                                       | Parent only                    | Block style                                          | READY   | External audio URL only                     |
| Carousel          | slide image, title, description, link                          | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Link URL and block style                             | PARTIAL | P1: slide order                             |
| Tabs section      | tab label and content                                          | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: tab order                               |
| Bottom navigation | item label, URL, icon                                          | Specialized item editor           | Add/remove, no reorder                    | Parent only                    | Shared block style                                   | PARTIAL | P1: nav order/item style                    |

The READY count above is 16 when parent-block editing is accepted as the canonical selection model; the starred blocks remain READY only for content authority, with media lifecycle caveats. Under a strict direct-child selection requirement, more blocks become PARTIAL, not READY.

## Media contract

| Media surface                                      | Replace/upload                      | Remove                                                       | Reorder               | Persistence/public parity                                 | Result                               |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ | --------------------- | --------------------------------------------------------- | ------------------------------------ |
| Profile banner/avatar                              | AssetField and owner adapter        | Yes; profile values are recoverable through existing history | N/A                   | Config and public absence are coherent                    | Productized                          |
| Hero avatar/banner/background                      | AssetField and URL                  | Clearable                                                    | N/A                   | Config persists; generic cleanup applies                  | P1 direct-avatar target missing      |
| Image, Featured Link, Media Card, Product          | AssetField                          | Clearable                                                    | N/A                   | Config persists and renderer has fallback behavior        | Productized through parent Inspector |
| Gallery                                            | Per-image AssetField                | Remove item and adapter asset                                | Yes                   | URL can return through undo after physical asset deletion | P1 non-atomic storage lifecycle      |
| Portfolio                                          | Item image renders from imageUrl    | No item-media operation                                      | N/A                   | Owner cannot replace normal demo image                    | P0                                   |
| Services/Product Grid/Events/Testimonials/Carousel | Per-item AssetField where supported | Clearable                                                    | Some collections only | Same generic cleanup caveat                               | Partial by collection/lifecycle      |
| Music cover/Featured Media                         | AssetField                          | Clearable                                                    | N/A                   | Config persists; external audio/video stays URL-based     | Productized through parent Inspector |

The generic AssetField removes or replaces the previous adapter asset by default. That operation is not atomic with reducer history: undo can restore a URL while the underlying object has already been removed. Profile media is an exception from prior recovery work; collection media is not uniformly recoverable.

## Collection lifecycle matrix

| Collection        | Add | Remove | Reorder | All fields                                        | Media                    | Destination         | Atomic object delete   |
| ----------------- | --- | ------ | ------- | ------------------------------------------------- | ------------------------ | ------------------- | ---------------------- |
| Links             | Yes | Yes    | No      | label, URL, description, typography, presentation | Optional media card      | URL; newTab missing | Yes                    |
| Button group      | Yes | Yes    | No      | label, URL, description, typography, presentation | Optional media card      | URL; newTab missing | Yes                    |
| Socials           | Yes | Yes    | No      | platform, URL                                     | No                       | URL                 | Yes                    |
| Gallery           | Yes | Yes    | Yes     | URL, alt                                          | Yes                      | N/A                 | Object yes; storage no |
| Portfolio         | Yes | Yes    | No      | label, description, URL                           | **No item image editor** | URL                 | Yes                    |
| Stats             | Yes | Yes    | No      | value, label, helper, icon                        | No                       | N/A                 | Yes                    |
| Services          | Yes | Yes    | Yes     | all visible item fields and CTA                   | Yes                      | CTA URL             | Yes                    |
| Testimonials      | Yes | Yes    | No      | quote, name, role, source, rating, avatar         | Yes                      | Source text only    | Yes                    |
| Pricing           | Yes | Yes    | No      | plan fields and comma-separated features          | No                       | CTA URL             | Yes                    |
| FAQ               | Yes | Yes    | No      | question, answer                                  | No                       | N/A                 | Yes                    |
| Timeline          | Yes | Yes    | No      | date, title, description, icon                    | No                       | N/A                 | Yes                    |
| Floating actions  | Yes | Yes    | No      | label, URL, icon                                  | No                       | URL                 | Yes                    |
| Product grid      | Yes | Yes    | Yes     | visible product fields and CTA                    | Yes                      | CTA URL             | Yes                    |
| Events            | Yes | Yes    | No      | date, time, title, location, image, CTA           | Yes                      | CTA URL             | Yes                    |
| Carousel          | Yes | Yes    | No      | image, title, description, link                   | Yes                      | Link URL            | Yes                    |
| Tabs              | Yes | Yes    | No      | label, content                                    | No                       | N/A                 | Yes                    |
| Bottom navigation | Yes | Yes    | No      | label, URL, icon                                  | No                       | URL                 | Yes                    |

Collection deletes filter the complete item object; no inspected renderer leaves a detached caption or title after object deletion. The lifecycle defects are missing order/media authority and storage cleanup that is separate from config history.

## Text and style audit

- InlineText supplies direct editing for headings, block titles, text body, CTA title/body where those render through the primitive, and profile identity/bio.
- Specialized Inspector fields cover most collection text fields, but pricing features and booking dates/times are compound comma-separated strings rather than first-class item collections.
- Contact renders English labels derived from URL presence: Chat on WhatsApp, Book an Appointment and Download Contact Card. Destinations are editable, labels are not.
- Document fileSize is visible but has no Inspector field.
- Calendar days are generated system UI; only disabled dates are owner-editable.
- Hero defaults such as Sofía Rivera, Creative Director, Verified and stock media are editable through fields; the default itself is not a defect where a field exists.

| Style scope        | Current authority                                                                 | Finding                                                                |
| ------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Page background    | Profile Inspector background type/color/gradient/image/pattern                    | Functional page-level authority                                        |
| Block layout       | Responsive alignment, width, span, order and positioning                          | Functional; order slider has fixed max 30                              |
| Block style        | Background, text color, radius, shadow, border, accent, frame, padding, animation | Broad but block-scoped                                                 |
| Typography         | Global theme plus selected item overrides and media typography                    | Inconsistent across specialized collections                            |
| CTA style          | Hero, Services, Pricing and Featured Media have dedicated CTA controls            | Product, Booking, Contact and generic CTA-like surfaces are incomplete |
| Image presentation | Hero fit/position; most other media uses renderer defaults                        | P1: no universal focal/fit authority                                   |
| Item style         | Mostly absent except selected item typography/CTA style                           | P1: siblings cannot be styled independently                            |

No audited control was proven completely disconnected from its renderer. The main failure is scope mismatch: a block-level control is often presented beside content users perceive as independently editable.

## Button, selection and motion findings

- Hero primary and secondary CTAs have separate Inspector targets and separate fields.
- Generic button groups share block button styling; the first item is primary and later items receive a derived secondary style.
- Service and pricing CTA items have ctaStyle. Product, Booking, Contact and generic CTA-like surfaces do not have an equivalent independent button style contract.
- Parent motion classes can wrap a whole multi-item block while child cards also use pts-hoverable. This can animate a parent and its children together. Classify as P1 when it interferes with editing, otherwise P2 polish.
- Generic links/buttons are inert in edit mode but do not focus their item URL or label. This is a P1 contextual-selection limitation.
- Mobile exposes parent selection and Inspector but has no item-level target model; item-heavy blocks remain difficult to transform by touch.

## Hardcoded demo-content findings

Acceptable editable defaults include Dr. Elena Rostova, Hi, I'm Alex, Selected Works, Sofía Rivera, Daniel Márquez, Kai Moreno, Nova Rebrand, Atlas App, John Doe, Jane Smith, sample plans, services, products, events and supplied photography where their canonical field is exposed.

| Visible content            | Source/authority                                  | Classification                                |
| -------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Portfolio demo photography | blockDefinitions item imageUrl and PortfolioBlock | **P0**: no item AssetField                    |
| Document file size         | DocumentBlock content.fileSize                    | P1: visible field missing                     |
| Contact action labels      | ContactBlock derived strings                      | P1: not owner-editable                        |
| Calendar day grid          | CalendarBlock generated interaction               | Intentional system UI, not user event content |
| QR empty fallback          | QRBlock/qrImageUrl example.com fallback           | P1: misleading destination when URL is blank  |
| Verification badge         | trusted ProfileHeader verification variant        | Intentional locked system UI                  |
| Empty-state instructions   | EmptyBlockState editor-only text                  | Intentional editor UI; public suppressed      |

## Preset and template productization

| Category  | Presets                                                                                                             | Status  | Reason                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Hero      | 6: Medical Profile, Professional Trust, Executive Split, Creator Editorial, Creator Full Image, Creator Bento Intro | PARTIAL | Hero child media target and companion block limitations            |
| Services  | 4: Bento, Cards, Editorial, Compact                                                                                 | PARTIAL | Strong collection editor, but item style/media lifecycle caveats   |
| Booking   | 3: Simple, Split, Premium Card                                                                                      | PARTIAL | CTA destination absent and scheduling fields are strings           |
| Portfolio | 3: Bento, Gallery, Editorial                                                                                        | PARTIAL | Portfolio presets can show non-replaceable project photography     |
| Reviews   | 3: Cards, Featured Testimonial, Trust Grid                                                                          | PARTIAL | Testimonial/stats order and item style absent                      |
| Products  | 3: Spotlight, Grid Premium, Bento Showcase                                                                          | PARTIAL | Item typography and CTA scope incomplete                           |
| Media     | 3: Featured Video, Music Spotlight, Media Bento                                                                     | PARTIAL | External media model and per-media styling limited                 |
| Contact   | 4: Minimal, Card, Contact + Map, Contact + Floating CTA                                                             | PARTIAL | Derived labels, action ordering and independent styling incomplete |

Preset status: 0 READY, 26 PARTIAL, 0 VISUAL_ONLY, 0 BROKEN. The presets are useful compositions, but the strict READY gate requires every content-bearing media, text, link, collection operation and critical style to be complete.

## Root-cause trace

| Missing capability               | Root cause                                                                 | Smallest correct repair layer                                        |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Portfolio item image replacement | Inspector collection branch missing                                        | Portfolio-specific collection editor or type-aware media extension   |
| Collection reorder               | Inspector operation missing; reducer already supports block field patching | Shared reorder helper and per-collection controls                    |
| Undo-safe owner media            | Asset cleanup occurs during field interaction                              | Adapter/persistence transaction or deferred cleanup                  |
| Direct item selection            | Contextual target missing                                                  | Add item targets while retaining selectedBlockId as parent authority |
| Document fileSize                | Inspector field missing                                                    | Add field or derive from uploaded metadata intentionally             |
| Contact action labels            | Explicit label field missing                                               | Add label fields or formally classify labels as fixed system copy    |
| QR blank behavior                | Renderer fallback                                                          | Explicit empty state or required destination                         |
| Per-item styling                 | Style scope/schema/editor incomplete                                       | Item typography/style authority plus renderer consumption            |
| Booking CTA destination          | Field and renderer contract missing                                        | Add canonical CTA URL and bind Inspector/renderer                    |
| Calendar content management      | Widget model is not an event collection                                    | Decide display-widget versus managed-calendar product scope          |

## P0/P1/P2 remediation roadmap — not implemented

### Layer 1: P0 content and media editability

Files/modules: Inspector collection branches, MediaBlocks Portfolio renderer, block defaults and asset adapter. Reuse existing imageUrl, AssetField and patchBlockField authorities. Medium blast radius. Test: replace every Portfolio demo image, clear one, save/reload and verify public parity. Portfolio presets and affected full templates become READY after remaining gaps close.

### Layer 2: Collection lifecycle

Files/modules: ItemsEditor, all specialized collection inspectors and galleryImages utilities. Add consistent reorder and atomic lifecycle tests. High localized Inspector blast radius. Test add/edit/reorder/delete/undo/redo/save/reload for every collection.

### Layer 3: Selection and contextual Inspector

Files/modules: RenderContext, inspectorFocus, TemplateRenderer, collection renderers and Inspector. Preserve selectedBlockId as parent authority. High interaction blast radius. Test desktop/mobile click of every visible item, media and button and assert exact Inspector focus without navigation.

### Layer 4: Typography and style completeness

Files/modules: types only if approved item style fields are needed, Inspector, styleEngine and specialized renderers. Medium blast radius. Test each control changes only its intended block/item and survives save/reload/public rendering.

### Layer 5: Button/container independence

Files/modules: ActionBlocks, PremiumBlocks, PremiumBlocksII, HeroBlock and contextual wiring. High interactive blast radius. Test sibling buttons with distinct labels, URLs, styles and hover behavior.

### Layer 6: Hover/motion polish

Files/modules: TemplateRenderer, motion constants, block class application and CSS. Medium visual blast radius. Test desktop hover, keyboard focus and mobile/touch for layout shift and sibling leakage.

### Layer 7: Runtime/public parity

Files/modules: public renderer, owner-media adapters, persistence path and preset smoke harness. High confidence-gate blast radius. Test every preset and full template through customize, save, reload and public render.

## Final verdict

The Power Editor is a functioning parent-block editor, not yet a complete “transform every supplied template into my own content” product. Most incompleteness comes from generic collection editing that omits type-specific media/order semantics, parent-only selection, non-transactional asset cleanup, block-level styling applied to item-heavy collections, and presets whose text is editable more consistently than their media.

Required P0 sequence: Portfolio media authority → recoverable collection asset lifecycle → collection reorder and atomic tests → item-level contextual selection → style/CTA independence → motion polish → complete preset/template save-reload/public parity.
