# Mobile Editor Touch Spec

// Modified by Codex — MOBILE-NATIVE-UX-RESPONSIVE-11

## Canvas

The edited landing remains the primary object on mobile. It must stay visible when an object is selected.

## Selection Model

The editor reuses `selectedEditorTarget`.

Preview touch maps:

- avatar -> `profile.photo`
- title/name -> `profile.name`
- bio -> `profile.bio`
- cover -> `profile.cover`
- background -> `appearance.colors`
- link/card -> `link:<id>`

## First Level Toolbar

The first response to a tap is a compact bottom contextual toolbar. It shows only immediate categories/actions for the selected target.

## Second Level Panel

Detailed properties open only after an action/category is requested. The initial panel height should stay around 35-45vh unless a dedicated picker requires more.

## Target Behavior

Avatar:

- replace
- adjust
- more properties

Text:

- edit
- font
- color

Link/card:

- text
- URL
- more properties

Background:

- color
- background
- more properties

## Keyboard

Text editing should avoid hiding the selected text. Manual keyboard QA is required because virtual keyboard behavior depends on device/browser.

## Desktop Preservation

Desktop remains panel-driven with the three-panel editor. Mobile is touch-driven with bottom contextual controls.
