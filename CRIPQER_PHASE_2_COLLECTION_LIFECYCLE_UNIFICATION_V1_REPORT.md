# Cripqer — Phase 2 Complete Collection Lifecycle V1

**Status:** CRIPQER_PHASE_2_COLLECTION_LIFECYCLE_IMPLEMENTED

**Scope:** Collection lifecycle only. Authentication, Pages, analytics, custom URLs, header mode, Engine V2, Smart Pages, global style, hover/motion and global contextual selection were not changed.

## Result

Collection editors now share one small reorder authority and one touch-safe control pattern:

- Mover arriba
- Mover abajo
- Eliminar

The controls operate on the existing canonical arrays through the existing patchBlockField reducer path. IDs and item objects are preserved; reorder does not recreate items or alter sibling values. First-item move-up and last-item move-down are disabled. Add actions remain at the end of each collection editor.

## Collection inventory

| Collection/block | Lifecycle result |
|---|---|
| Links | Add/edit/delete/reorder |
| Button group | Add/edit/delete/reorder |
| Social | Add/edit/delete/reorder |
| Gallery | Existing lifecycle preserved and normalized to shared controls |
| Portfolio | Phase 1 media editor preserved; add/edit/delete/reorder |
| Stats | Add/edit/delete/reorder |
| Services | Existing reorder behavior moved to shared controls |
| Testimonials | Add/edit/delete/reorder |
| Pricing | Add/edit/delete/reorder |
| FAQ | Add/edit/delete/reorder |
| Timeline | Add/edit/delete/reorder |
| Floating actions | Add/edit/delete/reorder |
| Product grid | Existing reorder behavior moved to shared controls |
| Events | Add/edit/delete/reorder |
| Carousel | Add/edit/delete/reorder |
| Tabs | Add/edit/delete/reorder |
| Bottom navigation | Add/edit/delete/reorder |

Pricing features remain a comma-separated field and Booking dates/times remain their existing string/list model. No unrelated domain model was redesigned.

## Shared implementation

Added:

- src/premium-template-studio/components/inspector/CollectionItemControls.tsx

The module contains:

- moveCollectionItem, a pure array reorder helper with boundary guards.
- CollectionItemControls, a common accessible control group with practical touch targets and plain-language labels.

Updated:

- src/premium-template-studio/components/inspector/Inspector.tsx

The Inspector now uses the shared control for every targeted collection. Gallery keeps its existing semantic media lifecycle while using the same reorder contract.

## Delete semantics

Delete removes the complete semantic object from its canonical array. Portfolio deletion removes imageUrl, label, description, URL and any other item fields together. The same object-boundary rule applies to testimonials, events, products, services, pricing plans, FAQ entries, timeline events, carousel slides, tabs, navigation items, social items and generic link/button items.

No collection-specific orphan caption, CTA or metadata state was introduced. Existing reducer history owns restoration.

## Undo and redo

No collection-specific history state was added. Every add, reorder and delete continues through StudioProvider/templateReducer history:

- add → undo restores the previous array;
- add → undo → redo restores the new item;
- reorder → undo restores exact prior order;
- reorder → redo reapplies the exact move;
- delete → undo restores the complete item at its previous array position;
- delete → undo → redo removes the same complete object again.

## Media lifecycle safety

Collection media paths now use the existing non-destructive AssetField option:

- Gallery image removal no longer physically removes the asset before history is useful.
- Generic link/button media-card items no longer clean up prior assets during edit.
- Services, testimonials, product-grid, events and carousel item media no longer synchronously remove prior assets on replace/clear.
- Portfolio remains non-destructive from Phase 1.

This intentionally defers orphan-asset cleanup. It does not add a global garbage collector. Canonical configuration and Undo correctness take priority over immediate storage deletion.

## Persistence and public parity

The canonical array order is the renderer order. Save/reload already serializes BioTemplateConfig, so the new control path changes only the array value and preserves IDs, item content and media references. The public renderer consumes the same current arrays; Inspector controls remain editor-only.

Required runtime scenario:

1. Add an item.
2. Edit every existing field.
3. Move it up/down.
4. Delete another item.
5. Save and reload.
6. Verify item count, order, IDs, fields and media references.
7. Verify public output follows the same order and excludes deleted items.

## Tests added

- src/premium-template-studio/__tests__/collectionLifecycle.test.ts
  - shared reorder boundary behavior;
  - all 17 collection types in the task inventory;
  - add, reorder, atomic delete, undo, redo and JSON save/reload serialization.

The earlier Portfolio media tests remain in:

- src/premium-template-studio/__tests__/portfolioMediaEditability.test.tsx

## Verification status

- git diff --check completed without content whitespace errors; existing repository CRLF normalization warnings remain.
- Targeted Vitest and Vite build commands reached startup but did not complete within the available command window. No passing code-test gate is claimed.
- Browser runtime validation remains required for touch controls, adapter-backed upload/save/reload and public order parity.

The implementation is complete, but CRIPQER_PHASE_2_COLLECTION_LIFECYCLE_CODE_TEST_PASS_FROZEN and CRIPQER_PHASE_2_COLLECTION_LIFECYCLE_RUNTIME_PASS_FROZEN remain pending until the runners and browser smoke complete.
