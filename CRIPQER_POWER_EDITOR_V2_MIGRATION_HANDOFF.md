# Cripqer — Power Editor V2 Migration Handoff

## Current state

- Engine V2 installed path: **none**; migration stopped before copy.
- Engine V2 public/internal entry point: **none created**.
- Canonical output boundary: prepared at
  `profiles.template_config.editorConfig`, but not connected to Engine.
- Basic patch invariants: active and preserved; Basic writes do not own
  unknown/premium canonical fields.
- Power Editor V2: not migrated.

## Unresolved dependency

The portable Engine package imports the frozen Power Editor contract from:

- `@/premium-template-studio/types`
- `@/premium-template-studio/constants/layouts`
- `@/premium-template-studio/constants/blockDefinitions`
- `@/premium-template-studio/engine/BlockRegistry`
- `@/premium-template-studio/engine/TemplateValidator`

Expected host location: `src/premium-template-studio/`. It is currently absent.
No local substitute may be created.

## Exact next steps

1. Import the exact frozen Power Editor V2 contract/studio package in a
   separately authorized phase.
2. Provide the missing, dependency-closed media/AI artifact if Pexels,
   Unsplash, Media Curator, and DeepSeek are required.
3. Re-run Engine V2 self-checks without modifying Engine or Power contracts.
4. Copy Engine V2 into an isolated namespace, preserving Engine V1.
5. Add the dormant internal generation entry point.
6. Validate opaque config acceptance and atomic canonical persistence.
7. Only then consider internal Power Editor routing; keep public onboarding,
   Basic Editor, and public routes unchanged.
