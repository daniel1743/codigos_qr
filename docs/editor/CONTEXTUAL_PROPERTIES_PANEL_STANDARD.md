# Contextual Properties Panel Standard

// Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10

## Roles

The editor uses three separate responsibilities:

- Left panel: structure navigation. It answers "what do I want to edit?"
- Center: editable live preview. It keeps the current landing preview centered and interactive.
- Right panel: contextual properties only. It answers "which properties belong to the selected item?"

The right panel must not render the previous full profile, links, or appearance forms as a general editor.

## Selection Model

`selectedEditorTarget` is the single source of truth for the contextual right panel.

Supported targets:

- `profile.photo`
- `profile.name`
- `profile.bio`
- `profile.alias`
- `profile.cover`
- `profile.footer`
- `links.manage`
- `link:<link_id>`
- `appearance.templates`
- `appearance.typography`
- `appearance.colors`
- `appearance.buttons`
- `appearance.spacing`
- `appearance.decoration`
- `social_cover`
- `hero_social`
- `qr`

## Target To Controls Mapping

| Target | Right panel controls | Handler reuse |
| --- | --- | --- |
| `profile.photo` | Current avatar, upload/replace, remove, shape, ring color/thickness | `setProfile` updates existing profile fields |
| `profile.name` | Display name, font family, title size, title weight, title alignment, title color | `setProfile` updates existing profile fields |
| `profile.bio` | Bio text, bold insertion, font family, bio size, bio weight, bio alignment, bio color | `setProfile` updates existing profile fields |
| `profile.alias` | Slug input and stable-QR note | `setProfile` updates `slug` |
| `profile.cover` | Current banner, upload/replace, remove | `setProfile` updates `banner_url` |
| `profile.footer` | Footer enabled and footer text | `setProfile` updates footer fields |
| `links.manage` | Add link and select existing links | `setLinks` updates existing link collection |
| `link:<link_id>` | Enabled, platform, title, description, URL, premium image, ordering, delete | `setLinks` updates the selected link only |
| `appearance.templates` | Template gallery and premium templates | Existing template components |
| `appearance.typography` | Font, title size, bio size, title weight | `setProfile` typography fields |
| `appearance.colors` | Background, title text, bio text, button color | `setProfile` color fields |
| `appearance.buttons` | Button colors, radius, spacing, style | Existing button section |
| `appearance.spacing` | Theme spacing presets | `setProfile` `theme_spacing` |
| `appearance.decoration` | Decoration options | Existing decoration section |
| `social_cover` / `hero_social` | Social cover options | Existing social cover section |
| `qr` | Current QR/share controls | Existing QR share section |

## Preview Selection

Preview clicks are routed through `ContextualToolbar` and `PublicProfileView`:

- title selects `profile.name`
- bio selects `profile.bio`
- avatar selects `profile.photo`
- cover selects `profile.cover`
- background selects `appearance.colors`
- link card selects `link:<link_id>`

Selection changes must not save automatically and must not reset unrelated unsaved state.

## Persistence

The contextual panel edits the same `profile` and `links` state used by the existing save flow. The save handler remains centralized in `handleSave`.

Persistence expectations:

- Profile fields save through the existing profile upsert.
- Link fields save through the existing link synchronization.
- QR fields save through the existing profile QR fields.
- Public page parity depends on the same saved profile and links.

## Mobile Behavior

Mobile does not force three columns. The bottom navigation still selects the active area, and the existing mobile sheet renders the same contextual properties panel.

## Rule Against Unrelated Controls

The right panel must render only the selected target's controls.

Examples:

- Selecting Bio must not show avatar, alias, cover, templates, links, or QR controls.
- Selecting Colors must not show fonts, avatar, bio text, or link controls.
- Selecting a link must not show other links' editable fields except through the manage-links target.

If a function has no valid target, add a new explicit target instead of placing it inside an unrelated panel.
