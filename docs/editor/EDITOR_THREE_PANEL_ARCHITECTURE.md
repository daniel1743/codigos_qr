# Editor Three Panel Architecture

Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09

## Layout

Desktop uses:

`Top navbar + Left structure panel + Center editable preview + Right contextual properties panel`

The center preview keeps the existing phone-sized landing, internal scroll, and floating zoom controls. The public renderer remains shared through `PublicProfileView`.

Mobile keeps the existing bottom navigation and bottom sheet behavior for compatibility.

## State Ownership

The editor still owns:

- `profile`
- `links`
- `activeTab`
- `panelOpen`
- `zoomLevel`
- `saving`
- `savedPublicId`
- `isPublished`

The new selection model is `selectedEditorTarget`. It does not store form data. It only points the UI to the selected editable target.

## Selection Model

Targets:

- `profile.avatar`
- `profile.name`
- `profile.bio`
- `profile.alias`
- `profile.cover`
- `link:<id>`
- `appearance.templates`
- `appearance.typography`
- `appearance.colors`
- `appearance.buttons`
- `appearance.spacing`
- `qr`

Preview clicks pass through `ContextualToolbar.onSelectTarget`, then update `selectedEditorTarget` and the active section.

## Handler Reuse

No save, upload, link CRUD, Supabase, QR, or publish handler was rewritten.

The right panel reuses existing sections:

- `ProfileSection`
- `LinksSection`
- `AppearanceSection`
- `ShareSection`

## Functional Inventory

| Function                | Previous location                    | Handler/state                                   | Save path                         | New location                            | Preserved |
| ----------------------- | ------------------------------------ | ----------------------------------------------- | --------------------------------- | --------------------------------------- | --------- |
| Avatar upload           | Profile tab panel                    | `ProfileSection.handleAvatarUpload`             | `profiles.avatar_url`             | Right properties via Profile            | YES       |
| Avatar delete           | Profile tab panel                    | `onChange({ avatar_url: null })` when available | `profiles.avatar_url`             | Right properties via Profile            | YES       |
| Name edit               | Profile tab panel                    | `profile.display_name`                          | `profiles.display_name`           | Right properties via Profile            | YES       |
| Bio edit                | Profile tab panel                    | `profile.bio`                                   | `profiles.bio`                    | Right properties via Profile            | YES       |
| Alias edit              | Profile tab panel                    | `profile.slug`                                  | `profiles.slug`                   | Right properties via Profile            | YES       |
| Links add               | Links tab panel                      | `LinksSection.handleAddLink`                    | `profile_links` create            | Right properties via Links              | YES       |
| Links edit              | Links tab panel                      | `setLinks`                                      | `profile_links` update            | Right properties via Links              | YES       |
| Links delete            | Links tab panel                      | `removeLink` then save deletes                  | `profile_links` delete            | Right properties via Links              | YES       |
| Links reorder           | Links tab panel                      | `moveLink`                                      | `profile_links.sort_order`        | Right properties via Links              | YES       |
| Link enable/disable     | Links tab panel                      | `link.enabled`                                  | `profile_links.enabled`           | Right properties via Links              | YES       |
| URL                     | Links tab panel                      | `link.url`                                      | `profile_links.url`               | Right properties via Links              | YES       |
| CTA                     | Links tab panel if present in branch | link field                                      | `profile_links`                   | Right properties via Links              | YES       |
| Cover                   | Appearance/Profile controls          | `banner_url`                                    | `profiles.banner_url`             | Right properties via Profile/Appearance | YES       |
| Ring                    | Appearance/Profile controls          | ring fields                                     | `profiles`                        | Right properties via Profile/Appearance | YES       |
| Fonts                   | Appearance                           | typography fields                               | `profiles`                        | Right properties via Appearance         | YES       |
| Colors                  | Appearance                           | color fields                                    | `profiles`                        | Right properties via Appearance         | YES       |
| Gradients               | Appearance/QR                        | profile/QR fields                               | `profiles`                        | Right properties via Appearance/QR      | YES       |
| Buttons                 | Appearance                           | button fields                                   | `profiles`                        | Right properties via Appearance         | YES       |
| Templates               | Appearance                           | template config to profile                      | `profiles`                        | Right properties via Appearance         | YES       |
| Social Covers           | Appearance                           | social cover fields                             | `profiles` and `profile_links`    | Right properties via Appearance/Links   | YES       |
| Hero Social             | Appearance                           | `hero_link_id`                                  | `profiles.hero_link_id`           | Right properties via Appearance         | YES       |
| QR controls             | QR tab                               | `ShareSection`                                  | `profiles` and QR version history | Right properties via QR                 | YES       |
| Publish                 | Floating button + QR tab             | `handleSave(true)`                              | profile/link services             | Top navbar + QR section                 | YES       |
| Save draft              | QR tab                               | `handleSave(false)`                             | profile/link services             | Right properties via QR                 | YES       |
| Preview zoom            | Preview                              | `zoomLevel` handlers                            | local state                       | Center floating controls                | YES       |
| Mobile preview          | Mobile editor                        | existing bottom nav/sheet                       | same state                        | Existing mobile shell                   | YES       |
| Docs Seguros navigation | Sidebar                              | route link                                      | route                             | Top navbar + mobile nav                 | YES       |
| Admin navigation        | Sidebar conditional                  | `isAdmin`                                       | route                             | Top navbar conditional                  | YES       |

## Panels

Left panel answers: what should be edited. It lists profile targets, real links, appearance groups, and QR.

Right panel answers: how to edit it. It currently reuses the existing full section for the selected category to preserve all controls.

## Mobile Adaptation

Mobile remains the existing bottom navigation plus bottom sheet. This avoids forcing three columns into a small viewport.

## QA Checklist

- Navbar tab switching.
- Left structure target selection.
- Right panel property rendering.
- Preview click on title, bio, avatar, cover, and links.
- Zoom 50%, 75%, 100%, 125%, fit.
- Save draft.
- Publish.
- Refresh persistence.
- Public `/p/{public_id}` parity.
- Mobile bottom sheet.
