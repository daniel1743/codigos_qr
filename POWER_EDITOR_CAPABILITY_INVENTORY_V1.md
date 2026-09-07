# POWER EDITOR CAPABILITY INVENTORY — V1

> **Cripqer Power Editor** (`src/premium-template-studio/`) — factual capability inventory.
> **Purpose:** Information only. This document is the input for *Product Entitlement Policy V1* (Free / Pro / Business / Enterprise classification).
>
> **Constraints honored (READ ONLY):**
> - No locks implemented. No code modified. No pricing assigned. No tiers decided. No capabilities invented.
> - No repository-wide grep / full `src` scan. Only the authorized paths below were read.
> - No Billing / Entitlements / Basic Editor / Smart Pages / Analytics / Navigation / Supabase / Routes / Database / `package.json` / lockfiles inspected.

---

## 1. Executive summary

The Cripqer Power Editor is a self-contained React editor + renderer ("Premium Template Studio") whose **single source of truth is a fully-serializable JSON config object** (`BioTemplateConfig`). Every UI control writes a field into this config via a reducer (`templateReducer` → `patch` / `patchBlockField`). The public renderer (`PublicTemplateRenderer` / `TemplateRenderer`) reads the same config back — there is **no separate renderer data model**.

Key architectural facts that matter for entitlement planning:

1. **One config, one renderer.** A capability that changes a `BioTemplateConfig` field is always renderer-backed *if* the renderer reads that field. Most controls are renderer-backed; a small number are editor-only or data-only (see §9).
2. **Editing is additive / field-scoped.** The reducer uses deep-clone + `setPath`, so locking a control means *disabling its UI* — existing stored values are **not** erased by simply hiding a control. The danger is only where a *save path normalizes/overwrites* advanced values (§10).
3. **Blocks are data + registered React components.** 37 block types are registered. Adding/locking a block type is a UI concern; the renderer never branches on block type (it resolves via `BlockRegistry`).
4. **Motion, themes, layouts, textures, cards, buttons, backgrounds, radii, shadows, borders** are all defined as *data presets* in `constants/` and rendered through `engine/styleEngine.ts` → CSS custom properties.

**Headline counts:**
- 37 registered block types (see §5).
- 9 layout presets, 6 font options, 6 typography presets, ~14+ theme presets, 5 motion presets, 5 entrance presets, 5 hover presets, 5 texture presets, 7 decorative-frame presets, 4 card/surface presets, 6 button variants, 4 page-background types, 4 pattern presets, 6 radius/4 shadow/4 border/5 gradient presets.
- ~76 distinct user-facing / engine-supported capabilities normalized into ~14 recommended capability groups (§4/§6).

---

## 2. Exact files inspected

All reads were confined to `src/premium-template-studio/` (working dir: `generador de QR`). Only the following were opened:

| File | Role |
|---|---|
| `index.ts` | Public module surface (exports) |
| `types/index.ts` | Full JSON schema (`BioTemplateConfig`, `TemplateBlock`, `TemplateTheme`, `TemplateLayout`, `TemplateProfile`, `MotionConfig`, etc.) |
| `constants/blockDefinitions.ts` | 37 block definitions + variants + defaults |
| `constants/layouts.ts` | 9 layout presets + breakpoint widths |
| `constants/motionPresets.ts` | Motion/entrance/hover presets |
| `constants/sectionPresets.ts` | ~35 section presets (compositions of blocks) |
| `constants/themes.ts` | Theme presets, font options, typography presets, default radii/shadows/borders/gradients/surfaces |
| `engine/BlockRegistry.ts` | Block type → component registration (37 entries) |
| `engine/TemplateRenderer.tsx` | Public renderer; block frame, editing handlers, responsive merge, motion resolution |
| `engine/TemplateBuilder.ts` | `buildTemplate`, `mergeConfig`, `duplicateTemplate` |
| `engine/TemplateValidator.ts` | `validateTemplate`, `migrateConfig`, `parseTemplateJson` |
| `engine/styleEngine.ts` | `themeToCssVars`, `pageBackground`, `textureStyle`, `decorativeFrameStyle`, `buttonStyle`, `headingStyle`, animation/hover class maps |
| `state/StudioProvider.tsx` | Context, save/publish/autosave, keyboard shortcuts |
| `state/templateReducer.ts` | All mutations (add/move/reorder/duplicate/delete/patch/undo/redo) |
| `hooks/useScrollReveal.ts` | IntersectionObserver scroll-reveal (public mode) |
| `components/PremiumTemplateStudio.tsx` | Editor shell, toolbar, canvas, export sheet |
| `components/editor/Sidebar.tsx` | Build / Design / Templates / Settings panels |
| `components/inspector/Inspector.tsx` | Profile inspector + all block inspectors + generic style/positioning/motion/visibility |
| `components/ui/controls.tsx` | Field/TextInput/TextArea/NumberSlider/ColorInput/Segmented/Toggle/Section/GhostButton primitives |
| `components/canvas/ProfileHeader.tsx` | Layout-aware profile header (avatar/banner/identity) |
| `components/blocks/*.tsx` | Block renderers (ContentBlocks, ActionBlocks, MediaBlocks, HeroBlock, PremiumBlocks, PremiumBlocksII, primitives) |
| `templates/definitions.ts` | Base + derived template definitions |
| `templates/recipeRegistry.ts` | ~30 composed "recipe" template definitions |

**Not read (outside authorized `read_scope`):** `adapters/`, `ai/`, `utils/`, `styles/`, `__tests__/`, and all product areas outside `src/premium-template-studio/`. These are flagged in §11/§12 rather than silently inspected.

## 3. Complete capability inventory

Legend for `Renderer support`: **YES** = renderer reads the field and applies it visually; **NO** = field is stored/edited but no renderer consumes it; **PARTIAL** = only some values are consumed. `Lock safety` uses the §10 vocabulary.

### 3.1 Content editing

| Capability ID (recommended) | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `edit_profile_identity` | Profile identity editing | Content editing | Inspector → "Profile" (`TextInput`) | `Inspector.tsx` | name, username, role, company, location, description, verified | page | Always | YES | `profile.*` | ALLOW_SAFE_TO_LOCK | none | Also inline-editable via `InlineText` in `ProfileHeader` |
| `edit_page_seo` | SEO fields | Content editing | Sidebar → "SEO" (`TextInput`) | `Sidebar.tsx` | seo.title, description, socialImage, index | page | Always | YES | `seo.*` | ALLOW_SAFE_TO_LOCK | none | `seo.index` toggles "index in search engines" |
| `edit_page_slug` | Page slug | Content editing | Sidebar → "Page" (`TextInput` + `formatSlug`) | `Sidebar.tsx` | slug | page | Always | YES (route) | `settings.slug` | ALLOW_SAFE_TO_LOCK | none | Slug auto-formatted on edit |
| `edit_block_content` | Block content editing | Content editing | Per-block inspectors | `Inspector.tsx` | block content fields | block | Always | YES | `blocks[i].content.*` | ALLOW_SAFE_TO_LOCK | varies per block | Includes `ItemsEditor`, `SocialsEditor` |
| `inline_text_editing` | Inline editing | Content editing | `InlineText` (contentEditable) on canvas | `primitives.tsx`, `ProfileHeader.tsx` | text fields on canvas | block/page | Always (edit) | YES | various text paths | ALLOW_SAFE_TO_LOCK | `edit_block_content` | Edit mode only; dispatched as patch |

### 3.2 Typography

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `typography_presets` | Typography presets | Typography | Sidebar → "Typography" (6 presets) | `themes.ts`, `Sidebar.tsx` | headingFont, bodyFont, weights, sizes, letterSpacing | page | Always | YES | `theme.typography.*` | ALLOW_SAFE_TO_LOCK | none | `TYPOGRAPHY_PRESETS` |
| `font_selection` | Font family selection | Typography | `FONT_OPTIONS` (6 fonts) | `themes.ts` | heading/body font families | page | Always | YES | `theme.typography.headingFont/bodyFont` | ALLOW_SAFE_TO_LOCK | none | 6 bundled font stacks |
| `typography_scale` | Typography scale | Typography | data only (no per-step UI) | `themes.ts`, `styleEngine.ts` | xs..display size/weight/lineHeight/letterSpacing | page | Data-only | YES | `theme.typography.scale.*` | ALLOW_SAFE_TO_LOCK | none | Emitted as CSS vars |

### 3.3 Colors

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `edit_theme_colors` | Theme color tokens | Colors | Sidebar → "Colors" (`ColorInput` ×8) | `Sidebar.tsx` | primary, secondary, accent, background, surface, card, text, mutedText, border | page | Always | YES | `theme.colors.*` | ALLOW_SAFE_TO_LOCK | none | `themeToCssVars` → `--pts-*` |
| `extended_color_tokens` | Extended color tokens | Colors | data-only (theme defaults) | `themes.ts` | surfaceAlt, success, warning, danger | page | Data-only | YES | `theme.colors.surfaceAlt/success/warning/danger` | ALLOW_SAFE_TO_LOCK | none | Auto-computed in `theme()` factory |

### 3.4 Backgrounds

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `page_background` | Page background (solid/gradient/image/pattern) | Backgrounds | engine (`pageBackground`) | `styleEngine.ts`, `types/index.ts` | type, color, gradient, imageUrl, overlay, blur, pattern | page | PARTIAL (color only) | YES | `theme.background.*` | LOCK_REQUIRES_PRESERVATION_GUARD | none | `pattern` in schema; UI exposure not found → §9 |

### 3.5 Textures

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `texture_preset` | Page texture | Textures | Sidebar → "Texture" (`select` + opacity/scale) | `Sidebar.tsx` | grain/paper/linen/mesh/frost, opacity, scale | page | Always | YES | `theme.texture.*` | ALLOW_SAFE_TO_LOCK | none | `textureStyle` in styleEngine |

### 3.6 Layout

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `layout_preset` | Layout presets | Layout | Sidebar → "Structure" (9 presets) | `layouts.ts`, `Sidebar.tsx` | layout id + header + responsive grid | page | Always | YES | `layout.id`, `layout.header`, `layout.responsive.*` | ALLOW_SAFE_TO_LOCK | none | centered, editorial, bento, split, compact, full-width, profile-card, portfolio, executive |

### 3.7 Spacing / Sizing

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `theme_spacing` | Theme spacing tokens | Spacing | data-only (defaults) | `themes.ts` | section, block, contentWidth, scale | page | Data-only | YES | `theme.spacing.*` | ALLOW_SAFE_TO_LOCK | `layout_preset` | Content width & section/block spacing |
| `block_sizing` | Block width/span | Sizing | Positioning inspector | `Inspector.tsx` | width (content/full), span/colSpan, rowSpan | block | Always | YES | `blocks[i].layout.width/span/colSpan/rowSpan` | LOCK_REQUIRES_PRESERVATION_GUARD | `layout_preset`, `block_responsive_overrides` | span vs colSpan fallback in renderer |

### 3.8 Alignment

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `block_alignment` | Block alignment | Alignment | Positioning inspector | `Inspector.tsx` | align (left/center/right) | block | Always | YES | `blocks[i].layout.align` | ALLOW_SAFE_TO_LOCK | `block_responsive_overrides` | Per-breakpoint override supported |

### 3.9 Responsive controls

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `breakpoint_switcher` | Device breakpoint switching | Responsive | Toolbar device toggle | `PremiumTemplateStudio.tsx` | active viewport (desktop/tablet/mobile) | editor | Always | N/A (editor) | — | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | none | Pure editor viewport |
| `block_responsive_overrides` | Per-breakpoint block overrides | Responsive | Positioning inspector (per breakpoint) | `Inspector.tsx`, `TemplateRenderer.tsx` | align, colSpan, rowSpan, zIndex, constraints, overlap, offset, sticky, floating, order, visible | block | Always | YES | `blocks[i].responsive[breakpoint].*` | LOCK_REQUIRES_PRESERVATION_GUARD | `block_sizing`, `block_alignment` | Renderer merges via `getMergedBlock` |
| `block_visibility` | Per-breakpoint visibility | Responsive | Inspector → "Visibility" | `Inspector.tsx` | visibility per breakpoint | block | Always | YES | `blocks[i].visibility.*` | ALLOW_SAFE_TO_LOCK | `block_responsive_overrides` | Also canvas eye toggle |
| `layout_responsive` | Layout responsive grid | Responsive | data-only (per layout) | `layouts.ts` | columns/gutter/align/padding per breakpoint | page | Data-only | YES | `layout.responsive.*` | ALLOW_SAFE_TO_LOCK | `layout_preset` | BREAKPOINT_WIDTHS 1180/834/390 |

### 3.10 Motion / animation

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `global_motion` | Global motion preset | Motion | Sidebar → "Motion" | `Sidebar.tsx`, `motionPresets.ts` | preset (none/minimal/soft/editorial/creator) | page | Always | YES | `motion.preset` | ALLOW_SAFE_TO_LOCK | none | `MOTION_PRESETS`, default "soft" |
| `entrance_animation` | Entrance animation | Motion | Sidebar → "Motion" (`ENTRANCE_OPTIONS`) | `Sidebar.tsx` | fade/soft-rise/slide-up/scale-in | page | Always | YES | `motion.entrance` | ALLOW_SAFE_TO_LOCK | `global_motion` | `ANIMATION_CLASS` |
| `hover_state` | Hover state | Motion | Sidebar → "Motion" (`HOVER_OPTIONS`) | `Sidebar.tsx` | lift/soft-scale/glow/border-emphasis | page | Always | YES | `motion.hover` | ALLOW_SAFE_TO_LOCK | `global_motion` | `HOVER_CLASS` |
| `motion_timing` | Motion timing | Motion | preset data | `motionPresets.ts` | duration, delay, stagger | page | PARTIAL (via preset) | YES | `motion.duration/delay/stagger` | ALLOW_SAFE_TO_LOCK | `global_motion` | `motionCssVars` |
| `block_motion_override` | Block-level motion override | Motion | Inspector → "Motion" | `Inspector.tsx` | per-block entrance/hover/disableMotion | block | Always | YES | `blocks[i].motion.*` | ALLOW_SAFE_TO_LOCK | `global_motion` | `BlockMotionOverride` |
| `scroll_reveal` | Scroll reveal | Motion | engine (public mode) | `useScrollReveal.ts` | IntersectionObserver reveal | page | Always (public) | YES | — (derived) | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | `entrance_animation` | Respects `prefers-reduced-motion` |

### 3.11 Borders / Radius / Shadows / Decorative effects

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `border_presets` | Border presets | Borders | data (defaults) | `themes.ts` | none/subtle/standard/strong | page | Data-only | YES | `theme.borders.*` | ALLOW_SAFE_TO_LOCK | none | `--pts-border-width-*` |
| `card_border_width` | Card border width | Borders | Sidebar → "Cards & buttons" | `Sidebar.tsx` | card borderWidth | page | Always | YES | `theme.cards.borderWidth` | ALLOW_SAFE_TO_LOCK | none | |
| `button_border_width` | Button border width | Borders | Sidebar → "Cards & buttons" | `Sidebar.tsx` | button borderWidth | page | Always | YES | `theme.buttons.borderWidth` | ALLOW_SAFE_TO_LOCK | none | |
| `avatar_border` | Avatar border | Borders | Inspector (profile) | `Inspector.tsx` | avatar borderWidth | page | Always | YES | `profile.avatar.borderWidth` | ALLOW_SAFE_TO_LOCK | none | |
| `radius_presets` | Radius presets | Radius | data (defaults) | `themes.ts` | none/small/medium/large/xl/pill | page | Data-only | YES | `theme.radii.*` | ALLOW_SAFE_TO_LOCK | none | `--pts-radius-*` |
| `card_radius` | Card radius | Radius | Sidebar → "Cards & buttons" | `Sidebar.tsx` | card radius | page | Always | YES | `theme.cards.radius` | ALLOW_SAFE_TO_LOCK | none | |
| `button_radius` | Button radius | Radius | Sidebar → "Cards & buttons" | `Sidebar.tsx` | button radius | page | Always | YES | `theme.buttons.radius` | ALLOW_SAFE_TO_LOCK | none | |
| `avatar_radius` | Avatar radius | Radius | Inspector (profile) | `Inspector.tsx` | avatar radius | page | Always | YES | `profile.avatar.radius` | ALLOW_SAFE_TO_LOCK | none | |
| `banner_radius` | Banner radius | Radius | Inspector (banner) | `Inspector.tsx` | banner radius | page | Always | YES | `profile.banner.radius` | ALLOW_SAFE_TO_LOCK | none | |
| `shadow_presets` | Shadow presets | Shadows | data (defaults) | `themes.ts` | none/soft/elevated/floating/glow | page | Data-only | YES | `theme.shadows.*` | ALLOW_SAFE_TO_LOCK | none | `--pts-shadow-*` |
| `card_shadow` | Card shadow | Shadows | Sidebar → "Cards & buttons" | `Sidebar.tsx` | card shadow | page | Always | YES | `theme.cards.shadow` | ALLOW_SAFE_TO_LOCK | none | |
| `button_shadow` | Button shadow | Shadows | Sidebar → "Cards & buttons" | `Sidebar.tsx` | button shadow | page | Always | YES | `theme.buttons.shadow` | ALLOW_SAFE_TO_LOCK | none | |
| `avatar_shadow` | Avatar shadow | Shadows | Inspector (profile) | `Inspector.tsx` | avatar shadow (bool) | page | Always | YES | `profile.avatar.shadow` | ALLOW_SAFE_TO_LOCK | none | |
| `decorative_frame` | Decorative frame preset | Decorative effects | data (`DecorativeFramePreset`) | `types/index.ts`, `styleEngine.ts` | hairline/double/inset/gradient/luxury/glow | block/page | Data-only | YES | (block style) `decorativeFrameStyle` | LOCK_REQUIRES_PRESERVATION_GUARD | none | §9 — UI exposure not found |
| `card_preset` | Card preset | Cards | Sidebar → "Cards & buttons" | `Sidebar.tsx` | card preset, blur, opacity, padding | page | Always | YES | `theme.cards.preset/blur/opacity/padding` | ALLOW_SAFE_TO_LOCK | `card_radius`, `card_shadow` | |
| `surface_presets` | Surface presets | Decorative effects | data (defaults) | `themes.ts` | solid/soft/glass/transparent | page | Data-only | YES | `theme.surfaces.*` | ALLOW_SAFE_TO_LOCK | none | |
| `gradient_presets` | Gradient presets | Decorative effects | data (defaults) | `themes.ts` | aurora/ocean/sunset/midnight/softNeutral | page | Data-only | YES | `theme.gradients.*` | ALLOW_SAFE_TO_LOCK | `page_background` | `--pts-gradient-*` |

### 3.12 Cards / Buttons

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `button_variant` | Button variant | Buttons | Sidebar → "Cards & buttons" | `Sidebar.tsx`, `styleEngine.ts` | solid/outline/ghost/glass/gradient/soft | page | Always | YES | `theme.buttons.variant` | ALLOW_SAFE_TO_LOCK | `button_radius`, `button_shadow` | `buttonStyle` switch |
| `button_metrics` | Button height/weight | Buttons | Sidebar → "Cards & buttons" | `Sidebar.tsx` | height, fontWeight | page | Always | YES | `theme.buttons.height/fontWeight` | ALLOW_SAFE_TO_LOCK | none | |

### 3.13 Images / media

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `asset_upload` | Asset upload/replace/remove | Images/media | `AssetField` (via `adapters.assets`) | `Inspector.tsx` | image/asset URLs | block/page | Always | YES | `blocks[i].content.*Url` / `profile.avatarUrl` / `banner.imageUrl` | ALLOW_SAFE_TO_LOCK | `adapters` (host) | Local cache `pts:asset_url_to_id`; no hardcoded backend |
| `video_embed` | Video embed | Images/media | video block inspector | `Inspector.tsx` | video URL → embed | block | Always | YES | `blocks[i].content.*` | ALLOW_SAFE_TO_LOCK | none | `parseVideoUrl` |
| `media_type` | Media type selector | Images/media | featuredMedia inspector | `Inspector.tsx` | image vs video | block | Always | YES | `blocks[i].content.*` | ALLOW_SAFE_TO_LOCK | none | |

### 3.14 Avatar / banner

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `avatar_controls` | Avatar settings | Avatar/banner | Inspector (profile) | `Inspector.tsx` | size, radius, borderWidth, shadow, overlap, align, avatarUrl | page | Always | YES | `profile.avatar.*` | ALLOW_SAFE_TO_LOCK | none | `ProfileHeader` renders |
| `banner_controls` | Banner settings | Avatar/banner | Sidebar → "Banner" + Inspector | `Sidebar.tsx`, `Inspector.tsx` | enabled, height, mobileHeight, overlay, blur, gradient, focalX/Y, radius, imageUrl | page | Always | YES | `profile.banner.*` | ALLOW_SAFE_TO_LOCK | `avatar_controls` (overlap) | |

### 3.15 Blocks (structure operations)

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `add_block` | Add block | Blocks | Sidebar → "Blocks" | `Sidebar.tsx`, `templateReducer.ts` | insert block | page | Always | YES | `blocks[]` | ALLOW_SAFE_TO_LOCK | `section_presets` | `addBlock`/`insertBlock` |
| `section_presets` | Section presets | Blocks | Sidebar → "Sections" | `Sidebar.tsx`, `sectionPresets.ts` | insert preset block group | page | Always | YES | `blocks[]` | ALLOW_SAFE_TO_LOCK | `add_block` | ~35 presets / 8 categories |
| `block_positioning` | Block positioning | Block layout | Positioning inspector | `Inspector.tsx` | align, width, span/colSpan/rowSpan, constraints, overlap, offset, zIndex, sticky, floating | block | Always | YES | `blocks[i].layout.*` | LOCK_REQUIRES_PRESERVATION_GUARD | `block_responsive_overrides` | |
| `block_visibility_toggle` | Toggle block hidden | Block visibility | canvas eye icon | `TemplateRenderer.tsx`, `templateReducer.ts` | hide across all breakpoints | block | Always | YES | `blocks[i].visibility.*` | ALLOW_SAFE_TO_LOCK | `block_visibility` | `toggleBlockHidden` |
| `block_move` | Move block up/down | Block ordering | canvas chevrons | `TemplateRenderer.tsx` | reorder | page | Always | YES | `blocks[]` order | ALLOW_SAFE_TO_LOCK | none | `moveBlock` |
| `block_reorder` | Reorder (drag) | Block ordering | canvas drag | `TemplateRenderer.tsx` | reorder | page | Always | YES | `blocks[]` order | ALLOW_SAFE_TO_LOCK | `block_move` | `reorderBlock` |
| `block_responsive_order` | Responsive order override | Block ordering | (responsive) | `TemplateRenderer.tsx` | per-breakpoint `order` | block | PARTIAL | YES | `blocks[i].responsive[breakpoint].order` | LOCK_REQUIRES_PRESERVATION_GUARD | `block_responsive_overrides` | |
| `block_duplicate` | Duplicate block | Block duplication | canvas copy icon | `TemplateRenderer.tsx` | duplicate with new id | page | Always | YES | `blocks[]` | ALLOW_SAFE_TO_LOCK | none | `duplicateBlock` |
| `block_delete` | Delete block | Block deletion | canvas trash icon | `TemplateRenderer.tsx` | remove block | page | Always | YES | `blocks[]` | ALLOW_SAFE_TO_LOCK | none | `deleteBlock` |

### 3.16 Themes / Templates / Page settings

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `theme_presets` | Theme presets | Themes | Sidebar → "Visual identity" | `Sidebar.tsx`, `themes.ts` | full theme object | page | Always | YES | `theme.*` | ALLOW_SAFE_TO_LOCK | `edit_theme_colors`, `typography_presets` | ~14+ themes |
| `template_apply` | Template definitions | Templates/presets | Sidebar → "Templates" | `Sidebar.tsx`, `definitions.ts`, `recipeRegistry.ts` | replace whole config (blocks/layout/theme) | page | Always | YES | whole config | LOCK_REQUIRES_PRESERVATION_GUARD | all | `keep_content` toggle preserves content |
| `keep_content` | Keep content on template swap | Templates/presets | Sidebar → "Templates" toggle | `Sidebar.tsx` | preserve vs replace content | page | Always | YES | — (merge) | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | `template_apply` | |
| `page_branding` | Show branding | Page-level settings | Sidebar → "Page" toggle | `Sidebar.tsx` | showBranding | page | Always | YES | `settings.showBranding` | ALLOW_SAFE_TO_LOCK | none | footer "Made with Premium Template Studio" |
| `page_language` | Page language | Page-level settings | data-only (default "en") | `types/index.ts`, `TemplateBuilder.ts` | language | page | Data-only | PARTIAL | `settings.language` | ALLOW_SAFE_TO_LOCK | none | no UI found |

### 3.17 Publishing / file operations (inside editor)

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `save` | Save (auto + manual) | Publishing | Toolbar + `Cmd/Ctrl+S` + autosave | `StudioProvider.tsx` | persist config via `adapters.storage.save` | page | Always | N/A | whole config | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | `adapters` | debounced 900ms autosave |
| `publish` | Publish | Publishing | Toolbar "Publish" + validation gate | `StudioProvider.tsx` | validate + `storage.publish` | page | Always | N/A | whole config | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | `save` | `validateTemplate` gate |
| `export_json` | Export JSON | Publishing | Toolbar `Code2` → ExportSheet | `PremiumTemplateStudio.tsx` | serialize config to JSON | page | Always | N/A | whole config | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | none | |
| `import_json` | Import JSON | Publishing | `parseTemplateJson` (migrate+validate) | `TemplateValidator.ts` | parse untrusted JSON | page | PARTIAL (no direct UI found) | N/A | whole config | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | `validate` | |
| `preview_mode` | Preview toggle | Publishing | Toolbar `Eye`/`Pencil` | `PremiumTemplateStudio.tsx` | edit vs preview mode | editor | Always | N/A | — | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | none | |
| `undo_redo` | Undo/redo | (meta) | Toolbar + `Cmd/Ctrl+Z` | `templateReducer.ts`, `StudioProvider.tsx` | history (limit 60) | editor | Always | N/A | — | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | none | |

### 3.18 AI-related controls

| Capability ID | Name | Category | Control | Source | What it changes | Scope | UI | Renderer | Config path | Lock safety | Dependencies | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| — | (none) | AI | — | — | — | — | None exposed | — | — | — | — | `index.ts` does **not** export `ai/*`. `ai/` exists but is outside `read_scope` → **UNVERIFIED** (see §11) |

---

## 4. Recommended stable capability IDs (normalization)

Grouping individual controls into entitlement-key candidates. **These are recommendations, NOT policy.** Derived from the actual editor architecture (one config, one renderer, field-scoped writes).

| Recommended capability group | Composed of (control IDs) | Rationale |
|---|---|---|
| `edit_content` | `edit_profile_identity`, `edit_block_content`, `inline_text_editing`, `edit_page_seo`, `edit_page_slug` | Core text/data editing |
| `edit_basic_style` | `edit_theme_colors`, `theme_presets`, `typography_presets`, `font_selection` | Basic visual identity |
| `advanced_typography` | `typography_scale` | Fine-grained type scale |
| `layout_selection` | `layout_preset`, `layout_responsive` | Structural presets |
| `advanced_layout` | `block_positioning`, `block_sizing`, `block_alignment`, `block_reorder`, `block_responsive_order` | Manual block geometry |
| `manual_responsive` | `block_responsive_overrides`, `block_visibility` | Per-breakpoint manual control |
| `advanced_motion` | `global_motion`, `entrance_animation`, `hover_state`, `motion_timing`, `block_motion_override` | Animation/motion |
| `premium_background_effects` | `page_background`, `texture_preset`, `decorative_frame`, `gradient_presets`, `surface_presets` | Background/texture/frame effects |
| `card_button_styling` | `card_preset`, `button_variant`, `button_metrics`, radii/shadows/borders controls | Card & button chrome |
| `avatar_banner` | `avatar_controls`, `banner_controls` | Profile header media |
| `advanced_block_controls` | `block_duplicate`, `block_delete`, `block_move`, `block_visibility_toggle` | Block lifecycle |
| `media_assets` | `asset_upload`, `video_embed`, `media_type` | Media management |
| `templates_presets` | `template_apply`, `section_presets`, `add_block`, `keep_content` | Template/preset application |
| `publishing` | `save`, `publish`, `export_json`, `import_json` | Persistence/publishing |

## 5. Complete block inventory

37 registered block types (`engine/BlockRegistry.ts`). Renders split across `blocks/ContentBlocks.tsx`, `ActionBlocks.tsx`, `MediaBlocks.tsx`, `HeroBlock.tsx`, `PremiumBlocks.tsx`, `PremiumBlocksII.tsx`.

**Common to all blocks (via `TemplateRenderer`/`BlockFrame`):** responsive visibility, per-breakpoint layout overrides, motion/entrance/hover (global + per-block override), alignment, span/colSpan/rowSpan, sticky/floating, press feedback, inline select/move/duplicate/delete/reorder in edit mode. **Renderer support: YES for all** (each resolves a component).

| # | Block type | Display purpose | Editable content (inspector) | Editable presentation | Responsive | Motion/effects | Renderer file |
|---|---|---|---|---|---|---|---|
| 1 | `hero` | Introductory showcase w/ avatar, CTAs, bg image | eyebrow, title, subtitle, description, avatar, bannerImage, backgroundImage, badge, primary/secondary CTA | variant (centered/split/editorial/full-image) | yes | yes | `HeroBlock.tsx` |
| 2 | `heading` | Section title + subtitle | title, subtitle | variant (default/eyebrow/divider) | yes | yes | `ContentBlocks.tsx` |
| 3 | `text` | Paragraph | body | variant (default/quote/boxed) | yes | yes | `ContentBlocks.tsx` |
| 4 | `links` | Stacked destination buttons | title, items(label/url/newTab) | variant (stacked/glass/cards/list) | yes | yes | `ActionBlocks.tsx` |
| 5 | `featuredLink` | Large highlighted destination | title, subtitle, url, imageUrl | variant (cover/side/banner) | yes | yes | `ActionBlocks.tsx` |
| 6 | `buttonGroup` | Row of actions | items(label/url) | variant (row/split) | yes | yes | `ActionBlocks.tsx` |
| 7 | `cta` | Persuasive panel + primary action | label, url, primary/secondary CTA (label/url/icon) | variant (panel/inline/gradient) | yes | yes | `ActionBlocks.tsx` |
| 8 | `social` | Social links | socials (platform/url) | — | yes | yes | `ActionBlocks.tsx` |
| 9 | `video` | Embedded video | video URL | variant (cover) | yes | yes | `MediaBlocks.tsx` |
| 10 | `image` | Single image | image URL | variant (standard/framed) | yes | yes | `MediaBlocks.tsx` |
| 11 | `gallery` | Image grid | images[] | — | yes (breakpoint columns) | yes | `MediaBlocks.tsx` |
| 12 | `mediaCard` | Image + text card | title/body/image | variant (row) | yes | yes | `MediaBlocks.tsx` |
| 13 | `portfolio` | Work/portfolio grid | items (label/description/url/imageUrl) | columns/gap | yes | yes | `MediaBlocks.tsx` |
| 14 | `document` | Downloadable file | title, fileName, fileSize, url | variant (row/card) | yes | yes | `ContentBlocks.tsx` |
| 15 | `contact` | Contact details | email, phone, address, custom CTA | variant (card/list) | yes | yes | `ContentBlocks.tsx` |
| 16 | `qr` | QR code | url, title | variant (card/plain) | yes | yes | `ContentBlocks.tsx` |
| 17 | `trust` | Trust badges | badges[] (label/icon) | variant (row/cards) | yes | yes | `ContentBlocks.tsx` |
| 18 | `divider` | Visual divider | — | variant (dots) | yes | yes | `ContentBlocks.tsx` |
| 19 | `spacer` | Empty space | height | — | yes | — | `ContentBlocks.tsx` |

| 20 | `stats` | Stat metrics | items (value/label) | variant (grid) | yes | yes | `PremiumBlocks.tsx` |
| 21 | `services` | Service list | items (title/description/price/icon) | variant (cards) | yes | yes | `PremiumBlocks.tsx` |
| 22 | `testimonials` | Reviews/quotes | items (name/role/quote/rating/source) | variant (cards/quote/compact/featured) | yes | yes | `PremiumBlocks.tsx` |
| 23 | `pricing` | Pricing plans | items (title/price/period/features/cta) | variant (simple/cards/featured/compact) | yes | yes | `PremiumBlocks.tsx` |
| 24 | `faq` | FAQ accordion | items (question/answer), behavior.allowMultipleOpen | — | yes | yes | `PremiumBlocks.tsx` |
| 25 | `timeline` | Chronological events | items (date/title/description/icon) | variant (minimal/cards/editorial) | yes | yes | `PremiumBlocks.tsx` |
| 26 | `featuredMedia` | Featured image/video | media type, title, subtitle, image/video | variant (cinema) | yes | yes | `PremiumBlocks.tsx` |
| 27 | `floatingActions` | Floating CTA bar | items (label/url) | — | yes | yes | `PremiumBlocks.tsx` |
| 28 | `product` | Single product | title, price, description, image, features | variant (featured) | yes | yes | `PremiumBlocksII.tsx` |
| 29 | `productGrid` | Product grid | products[] | variant (default/bento) | yes | yes | `PremiumBlocksII.tsx` |
| 30 | `booking` | Booking/service | title, description, services | — | yes | yes | `PremiumBlocksII.tsx` |
| 31 | `calendar` | Calendar | disabled dates | — | yes | yes | `PremiumBlocksII.tsx` |
| 32 | `events` | Event list | items (date/title/location/url) | — | yes | yes | `PremiumBlocksII.tsx` |
| 33 | `map` | Location map | location (lat/lng/label) | — | yes | yes | `PremiumBlocksII.tsx` |
| 34 | `music` | Music player | track title/artist/audio | variant (player/compact) | yes | yes | `PremiumBlocksII.tsx` |
| 35 | `carousel` | Image carousel | items (imageUrl/title/description/linkUrl) | — | yes | yes | `PremiumBlocksII.tsx` |
| 36 | `tabs` | Tabbed content | items (label/contentText) | — | yes | yes | `PremiumBlocksII.tsx` |
| 37 | `bottomNav` | Fixed bottom nav | items (label/url/icon) | floating anchor | yes | yes | `PremiumBlocksII.tsx` |

**Planned (NOT implemented — not inventoried as existing):** `store, products, appointment, calendar, music, podcast, map, reviews, testimonials, forms, donations, newsletter, pricing, events, countdown, faq` are listed in `PLANNED_BLOCK_TYPES` (`blockDefinitions.ts`) as *future* blocks. They are **not registered** and have **no renderer**. (Some names overlap already-implemented blocks — `map`, `music`, `pricing`, `faq`, `events` — those already exist; the planned list is a roadmap artifact.)

---

## 6. Capability grouping proposal

See §4 for the full recommended groups. The stable entitlement-key recommendation is:

```
edit_content, edit_basic_style, advanced_typography, layout_selection,
advanced_layout, manual_responsive, advanced_motion, premium_background_effects,
card_button_styling, avatar_banner, advanced_block_controls, media_assets,
templates_presets, publishing
```

These map 1:1 to either (a) a set of `BioTemplateConfig` field paths, or (b) a set of reducer actions — both stable boundaries that the code already owns. They are **not** a pricing plan; they are candidate lock keys.

## 7. Lockability / preservation-risk table

Classification vocabulary (required):
- **ALLOW_SAFE_TO_LOCK** — UI can be disabled; stored value untouched.
- **LOCK_REQUIRES_PRESERVATION_GUARD** — disabling the UI is fine, but the save path must be prevented from overwriting/erasing an already-stored advanced value.
- **NOT_SUITABLE_FOR_ENTITLEMENT_LOCK** — editor-only/meta/derived; no meaningful entitlement semantics.

| Recommended capability | Classification | Reason / preservation concern |
|---|---|---|
| `edit_content` | ALLOW_SAFE_TO_LOCK | Field-scoped writes; hiding inputs never deletes content |
| `edit_basic_style` | ALLOW_SAFE_TO_LOCK | Token writes are additive |
| `advanced_typography` | ALLOW_SAFE_TO_LOCK | Data-only scale; no overwrite path |
| `layout_selection` | ALLOW_SAFE_TO_LOCK | Selecting a preset replaces `layout`, but block-level layout is preserved unless a full template is applied |
| `advanced_layout` | LOCK_REQUIRES_PRESERVATION_GUARD | `block_positioning` writes `blocks[i].layout.*`; a future "normalize on save" path could collapse `span`/`colSpan`/`constraints`/`overlap`. Freeze these fields on locked users |
| `manual_responsive` | LOCK_REQUIRES_PRESERVATION_GUARD | `block.responsive[breakpoint].*` — same collapse risk on save/migrate |
| `advanced_motion` | ALLOW_SAFE_TO_LOCK | `motion.*` merged via `getMotionConfig` (spread), preserves explicit values |
| `premium_background_effects` | LOCK_REQUIRES_PRESERVATION_GUARD | `theme.background` has `type/gradient/imageUrl/overlay/blur/pattern`; a Free lock must not reset `type` to `solid` or strip `imageUrl` on save |
| `card_button_styling` | ALLOW_SAFE_TO_LOCK | Token writes additive |
| `avatar_banner` | ALLOW_SAFE_TO_LOCK | `profile.*` additive |
| `advanced_block_controls` | ALLOW_SAFE_TO_LOCK | Structural actions; don't delete stored data |
| `media_assets` | ALLOW_SAFE_TO_LOCK | URL writes additive |
| `templates_presets` | LOCK_REQUIRES_PRESERVATION_GUARD | Applying a template **replaces** blocks/layout/theme; must not wipe existing config if user lacks a premium template. `keep_content` mitigates content loss, not theme/layout |
| `publishing` | NOT_SUITABLE_FOR_ENTITLEMENT_LOCK | Host-level persistence, not a design capability |

**Controls whose save path might erase advanced values** (critical preservation-guard list):
1. `template_apply` — whole-config replacement.
2. `layout_preset` — replaces `layout` object (but not blocks).
3. `theme_presets` — replaces `theme` object (the `theme()` factory re-adds *defaults*, not the user's prior advanced values).
4. Any future `migrateConfig` step — `MIGRATIONS` is currently empty but is the designated place that could normalize/drop fields.

**Controls whose UI can simply be disabled:** the vast majority (all `ALLOW_SAFE_TO_LOCK` rows) — they are pure field writers.

## 8. Capabilities present in UI but not renderer-backed

- **None found** among the inspector/design controls that write config fields — every inspected field is consumed by the renderer or is a meta/editor-only flag (breakpoint switcher, preview mode, undo/redo, save/publish/export, keep-content toggle).

---

## 9. Renderer-backed capabilities without visible UI (discovered)

| Field / capability | Renderer support | UI status |
|---|---|---|
| `theme.background.pattern` (dots/grid/noise/rings) | YES (`pageBackground`) | No selector found in Sidebar/Inspector |
| `theme.background.type` = gradient/image/pattern | YES | Only `color` is surfaced in UI |
| `DecorativeFramePreset` (`decorativeFrameStyle`) | YES | No UI control found; presets exist in types only |
| `theme.surfaces` (solid/soft/glass/transparent) | YES | Data-only |
| `theme.gradients` | YES (CSS vars) | Data-only (used by gradient presets) |
| `theme.radii`, `theme.shadows`, `theme.borders` presets | YES | Data-only (only card/button/avatar radius + shadow + borderWidth exposed directly) |
| `theme.typography.scale` (xs..display) | YES | Data-only (no per-step editor) |
| `settings.language` | PARTIAL | No UI found (default "en") |
| `block.responsive[breakpoint].order` | YES | No dedicated UI found (part of responsive model) |

These are **engine-supported but not (or only partially) exposed**. They are *real* capabilities at the data/render layer; they are **not invented**.

---

## 10. Unknown / unverified capabilities

- **AI generation** (`src/premium-template-studio/ai/`): the directory exists (`ai/index.ts`, `ai/test_generator.ts`, `ai/types.ts`) but is **outside the authorized `read_scope`** and `index.ts` does **not** export it. Per `stop_conditions`, I did **not** read it. Whether AI controls are exposed in the editor UI is **unverified**. To resolve, read `src/premium-template-studio/ai/index.ts` and confirm any wiring into `PremiumTemplateStudio.tsx` / `Sidebar.tsx` (none observed in the files read).
- **Asset adapter implementations** (`adapters/`): referenced by `Inspector.tsx` (`adapters.assets`) and `index.ts` exports types, but concrete adapters are outside `read_scope`. Upload/remove behavior depends on host adapter.
- **Font loading / SEO head integration**: the renderer emits font families and SEO fields, but host `<head>` integration is outside `read_scope`.

---

## 11. Out-of-scope findings

- `src/premium-template-studio/adapters/` — not in `read_scope`.
- `src/premium-template-studio/ai/` — not in `read_scope` (AI-related, §10).
- `src/premium-template-studio/utils/` — not in `read_scope` (helper functions only).
- `src/premium-template-studio/styles/` — not in `read_scope` (CSS classes referenced by renderer).
- `src/premium-template-studio/__tests__/` — not in `read_scope`.
- A second project copy `PROYECTO PARA INTEGRA A QR/` and `.vercel/output/` exist in the workspace but are **outside** the authorized paths; **not inspected**.

---

## 12. Validation

| Check | Result |
|---|---|
| Source files modified | **0** |
| Dependencies modified | **0** |
| Routes modified | **0** |
| Billing modified | **0** |
| Frozen scope violations | **0** |
| Locks implemented | **0** (none) |
| Pricing / tier decisions made | **0** (none) |

This document is the only file produced. It is an information-only inventory and makes no product/entitlement decisions.

