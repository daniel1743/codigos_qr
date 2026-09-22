# Cripqer — Direct Editor Backend Reuse Audit V1

**Proyecto:** CRIPQER  
**Task:** CRIPQER_DIRECT_EDITOR_BACKEND_REUSE_AUDIT_V1_RETRY  
**Fecha:** 2026-09-22  
**Modo:** STRICT_READ_ONLY_TECHNICAL_AUDIT

> Auditoría técnica de solo lectura. No se modificó código, no se crearon migraciones, no se tocaron tablas, RLS, Power Editor ni el Catálogo congelado.

## EXECUTIVE SUMMARY

El backend actual ya tiene base suficiente para un piloto del futuro Direct Page Editor. No existe una necesidad técnica de crear una tabla principal nueva, cambiar las URLs públicas, reconstruir QR, Auth, RLS, Storage, Analytics o el renderer.

La autoridad existente para páginas hijas es:

~~~text
authenticated user
  -> public.pages
  -> pages.template_config
  -> pages.published_template_config
  -> /pg/{public_id} or /pg/a/{slug}
  -> safe public RPC
  -> PublicTemplateRenderer
  -> page analytics by pages.id
~~~

La persistencia de página ya está separada del perfil principal:

- pageService.getOwnPageById lee una página hija con ownership explícito.
- pageCanonicalService.saveDraft escribe solamente pages.template_config.
- pageCanonicalService.publish escribe el snapshot publicado de pages.
- createPageStorageAdapter expone ese contrato al Studio existente.
- pg.$publicId.tsx y pg.a.$slug.tsx leen únicamente published_template_config mediante RPC seguro.

La principal condición de reutilización es contractual: template_config no acepta cualquier JSON arbitrario. El envelope actual es schemaVersion + editorConfig, y editorConfig debe validar como BioTemplateConfig. Un Direct Page Editor con page -> theme -> hero -> blocks puede seguir usando la columna JSONB, pero necesita un adapter de documento o una evolución posterior del contrato. Eso es trabajo de aplicación, no una nueva tabla SQL.

| Pregunta | Conclusión |
|---|---|
| ¿Puede permanecer Pages? | Sí, KEEP_AS_IS para Pilot V1 |
| ¿Puede template_config ser el documento canónico? | Sí, si el editor emite el contrato aceptado; si usa otra forma, KEEP_WITH_ADAPTER |
| ¿Puede permanecer published_template_config? | Sí, como snapshot publicado |
| ¿Puede permanecer public_id? | Sí |
| ¿Puede permanecer QR? | Sí, la URL estable depende de public_id |
| ¿Puede permanecer Auth? | Sí |
| ¿Puede permanecer RLS? | Sí para el primer piloto |
| ¿Puede permanecer Storage? | Sí, usando avatars y un adapter durable |
| ¿Puede permanecer Analytics? | Sí, para páginas hijas usa pages.id |
| ¿Puede reutilizarse save/reload? | Sí, mediante pageCanonicalService y un adapter de storage |
| ¿Puede reutilizarse publish? | Sí, con control de revisión existente |
| ¿Hace falta renderer nuevo? | No demostrado; KEEP_WITH_ADAPTER |
| ¿Hace falta SQL nueva para Pilot V1? | No |

## ACTUAL CURRENT ARCHITECTURE

### Flujo real de página hija

~~~text
src/routes/pages.$pageId.edit.tsx
  -> PowerEditorHost target={ kind: "page", id: pageId }
  -> auth.getSession()
  -> pageService.getOwnPageById()
  -> resolvePageEditorConfig(page.template_config, title, page_type)
  -> PremiumTemplateStudio
  -> StudioProvider / templateReducer
  -> createPageStorageAdapter()
  -> pageCanonicalService.saveDraft()
  -> public.pages.template_config

Publish:
  PremiumTemplateStudio.publish()
    -> adapter.storage.save()
    -> adapter.storage.publish()
    -> pageCanonicalService.publish()
    -> public.pages.published_template_config
    -> published=true, published_revision++, published_at

Public request:
  /pg/$publicId
    -> pageService.getPublicPageByPublicId()
    -> get_public_page_by_public_id()
    -> published_template_config only
    -> resolveCanonicalEditorConfig()
    -> PublicTemplateRenderer
    -> analyticsService.trackPageEvent(page.id, ...)
~~~

Evidence:

- src/routes/pages.$pageId.edit.tsx mounts PowerEditorHost with a page target.
- src/components/power-editor/PowerEditorHost.tsx loads session, page ownership, canonical config, adapters and Studio.
- src/components/power-editor/pagePersistence.ts maps Studio save/publish to child-page persistence.
- src/services/page-canonical.service.ts is the page-owned canonical write authority.
- src/routes/pg.$publicId.tsx is the public child-page load path.

### Profile path versus page path

The repository has two canonical authorities:

~~~text
Primary profile:
  profiles.template_config
  -> canonicalPageService
  -> set_profile_canonical_editor_config()
  -> publish_profile_canonical_snapshot()

Child page:
  pages.template_config
  -> pageCanonicalService
  -> direct pages update with owner filter
  -> published pages snapshot
~~~

The future Direct Page Editor must select one document target explicitly. It must not route a child page through profile RPCs. The current PowerEditorHost already contains that distinction, but the future public editor should reuse the service boundary rather than inherit the full Power Editor host.

## PAGES

### Table and fields

public.pages is created in supabase/migrations/20260914000000_cripqer_production_baseline.sql with:

~~~text
id                         uuid primary key
owner_user_id              uuid -> auth.users(id)
profile_id                 uuid -> profiles(id)
public_id                  text, generated public identity
title                      text
page_type                  text
template_config            jsonb
published_template_config  jsonb
published                  boolean
published_revision         integer
published_at               timestamptz
slug                       text nullable
qr_config                  jsonb added by PAGES_5
created_at                 timestamptz
updated_at                 timestamptz
~~~

The baseline creates indexes on owner, profile, publication state and unique non-null slug, plus the set_pages_updated_at trigger. 20260920000000_extend_page_type_services_catalog_portfolio.sql expands the check constraint to include services, catalog and portfolio without changing table shape.

### Existing operations

| Operation | Current implementation | Evidence | Assessment |
|---|---|---|---|
| Create | Validates title/type/profile ownership and inserts an empty draft | src/services/page.service.ts, createPage | Reusable |
| Read own | Filters page ID and owner user ID | src/services/page.service.ts, getOwnPageById | Reusable |
| List own | Filters owner and optionally profile | src/services/page.service.ts, listOwnPages | Reusable |
| Update draft | Updates only template_config | src/services/page-canonical.service.ts, saveDraft | Reusable with adapter |
| Publish | Updates published snapshot and revision | src/services/page-canonical.service.ts, publish | Reusable |
| Unpublish | Preserves snapshot and changes publication state | src/services/page-canonical.service.ts, unpublish | Reusable |
| Delete | Verifies ownership/profile and deletes page | src/services/page.service.ts, deleteOwnedChildPage | Reusable |
| Alias read | Resolves published pages by slug through RPC | src/services/page-alias.service.ts | Reusable |

Dependencies are auth.users through owner_user_id and profiles through profile_id. Pages does not depend on Power Editor as a database concept.

**Classification:** KEEP_AS_IS for Pilot V1.  
**Risk:** low. The main risk is selecting the wrong document authority in frontend code, not the table design.

## DOCUMENT STORAGE

### Current envelope

src/lib/canonical-page/contract.ts defines:

~~~json
{
  "schemaVersion": 1,
  "editorConfig": "BioTemplateConfig"
}
~~~

The envelope is serializable JSON and is validated by validateCanonicalPageEnvelope. acceptEngineGeneratedConfig creates it, while readCanonicalPageEnvelope rejects legacy or invalid values.

### Current BioTemplateConfig shape

src/premium-template-studio/types/index.ts defines:

~~~text
schemaVersion
pageInstanceId
templateDefinitionId
metadata
theme
layout
profile
blocks
seo
settings
motion?
~~~

TemplateBlock is already extensible and contains id, type, variant, content, style, layout, visibility, interaction, optional motion, locked and responsive data. BlockContent already includes titles, descriptions, images, products, services, CTAs, badges, social items and other content forms.

### Can template_config host a new Direct Page document?

Yes at the database level: template_config is JSONB and public.pages does not inspect its internal shape.

Not transparently at the application contract level: pageCanonicalService.saveDraft calls acceptEngineGeneratedConfig, and assertValidEditorConfig calls validateTemplate. The public bridge also validates the stored editorConfig as BioTemplateConfig before rendering.

Therefore:

~~~text
new shape == current BioTemplateConfig-compatible shape
  -> reuse directly

new shape != BioTemplateConfig
  -> reuse JSONB column and page identity
  -> add application adapter before persistence/rendering
  -> do not create a new principal table for Pilot V1
~~~

A document organized as page -> theme -> hero -> blocks can fit in JSONB. The current config already has theme, layout, profile, blocks, hero blocks and block-level media. It should not be stored blindly because validators and renderer expect BioTemplateConfig.

**Classification:** KEEP_WITH_ADAPTER.  
**Adapter needed:** Direct Editor document <-> CanonicalPageEnvelopeV1<BioTemplateConfig>, or a versioned future envelope adapter.  
**Risk:** medium. The risk is schema/renderer mismatch, not JSONB capacity.

## SAVE / RELOAD

### Existing save pipeline

~~~text
StudioProvider.save()
  -> adapters.storage.save(snapshot)
  -> createPageStorageAdapter.save()
  -> pageCanonicalService.saveDraft()
  -> pages.update({ template_config: envelope })
  -> select(template_config)
  -> readCanonicalPageEnvelope()
~~~

The save coordinator in src/premium-template-studio/state/StudioProvider.tsx captures document ID and local revision, exposes saving/saved/dirty/error and prevents stale responses from acknowledging a newer edit. Autosave is enabled by PowerEditorHost through PremiumTemplateStudio autoSave.

The reducer in src/premium-template-studio/state/templateReducer.ts maintains local history with a limit of 60 snapshots, increments a local revision on mutation and supports undo/redo. This is editor-state infrastructure, not a database history table.

### Hard reload

~~~text
PowerEditorHost
  -> pageService.getOwnPageById()
  -> page.template_config
  -> resolvePageEditorConfig()
  -> readCanonicalPageEnvelope()
  -> validateTemplate()
  -> PremiumTemplateStudio(config=loadedConfig)
~~~

A fresh page with null template_config receives a blank config in memory; the first successful save writes it.

### Reusable functions

- pageService.getOwnPageById for authenticated load.
- pageCanonicalService.saveDraft for draft persistence.
- createPageStorageAdapter as the host-to-Studio persistence seam, if the future editor keeps StorageAdapter.
- readCanonicalPageEnvelope and validateTemplate if the future document remains BioTemplateConfig.
- Studio save coordinator and revision guards if the future editor reuses the same document state infrastructure.

### Power Editor-specific pieces

PowerEditorHost owns session loading, route-specific loading UI, profile/page branching, diagnostics and adapter assembly. The persistence services do not require the Power Editor UI.

**Classification:** KEEP_WITH_ADAPTER.  
**Risk:** medium if a new editor emits a different document shape; low if it emits the current canonical config.

## PUBLISH

pageCanonicalService.publish:

1. Wraps the editor config in the canonical envelope.
2. Validates the editor config.
3. Updates published_template_config.
4. Sets published=true.
5. Increments published_revision from an expected revision.
6. Writes published_at.
7. Returns the updated Page row.

The optimistic predicate eq("published_revision", expectedRevision) prevents a stale session from silently overwriting a newer publication.

pageCanonicalService.unpublish changes publication state and revision without deleting the published snapshot.

**Answer:** Yes, published_template_config can remain the Direct Editor published snapshot.

**Classification:** KEEP_AS_IS.  
**Risk:** low, subject to the adapter producing a renderer-valid canonical snapshot.

## PUBLIC_ID / ROUTING

public.pages.public_id is the stable child-page identity. src/lib/url.ts builds /pg/{public_id}. src/routes/pg.$publicId.tsx resolves it through get_public_page_by_public_id and emits that stable URL as canonical.

/pg/a/{slug} is a convenience alias. src/routes/pg.a.$slug.tsx resolves the slug through get_public_page_by_slug but canonicalizes back to /pg/{public_id}.

Replacing the editor UX does not require changing public_id, /pg/$publicId or /pg/a/$slug.

**Classification:** DO_NOT_TOUCH.  
**Risk:** low if the new editor never mutates public_id or fabricates aliases.

## AUTH / OWNERSHIP

PowerEditorHost obtains the Supabase browser session with getBrowserSupabaseClient().auth.getSession(). Without a session it refuses to mount the editor.

For child pages it passes currentSession.user.id to pageService.getOwnPageById. For profile mode it filters profile queries by both requested identity and user_id.

Ownership is:

~~~text
pages.owner_user_id -> authenticated user authority
pages.profile_id    -> owning profile relationship
~~~

pageService.createPage verifies that profile_id belongs to the authenticated user before insert. deleteOwnedChildPage repeats ownership checks before delete.

The future editor can reuse the same session and ownership model. It must never accept owner_user_id from editable client data.

**Classification:** KEEP_AS_IS.  
**Risk:** low if the new route reuses getOwnPageById and owner-scoped services.

## RLS

The production baseline enables RLS on public.pages and defines:

~~~text
owner_insert_page
  WITH CHECK (auth.uid() = owner_user_id)

owner_select_page
  USING (auth.uid() = owner_user_id)

owner_update_page
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id)

owner_delete_page
  USING (auth.uid() = owner_user_id)
~~~

Evidence: supabase/migrations/20260914000000_cripqer_production_baseline.sql, policies owner_insert_page, owner_select_page, owner_update_page and owner_delete_page.

Public reads do not require a public table policy. Public routes use SECURITY DEFINER RPCs with narrow projections:

- get_public_page_by_public_id from 20260917000000_create_public_page_lookup_rpc.sql.
- get_public_page_by_slug from 20260919000000_add_page_alias_rpc.sql.

Both require published=true and non-null published_template_config.

**Classification:** DO_NOT_TOUCH for Pilot V1.  
**Risk:** low. The public and owner paths are already separated. A direct anonymous table SELECT would be a regression.

## STORAGE / ASSETS

### Existing buckets and policies

20260916000000_ensure_cripqer_storage_bootstrap.sql bootstraps avatars, banners and encrypted-documents. It defines owner-scoped object policies for writes and deletes; avatar paths are scoped under the authenticated user ID.

### Existing durable adapter

PowerEditorHost.tsx defines createDurableAssetAdapter using avatars. It stores under userId/power-editor, uploads through Supabase Storage, returns public URLs and removes objects by resolving the stored URL to a bucket path.

This differs from objectUrlAssetAdapter in src/premium-template-studio/adapters/index.ts, which uses data URLs/localStorage and is demo-only.

Current asset references are ordinary URL fields inside the canonical config, including imageUrl, avatarUrl, bannerImage and collection item image fields. No asset table is required by the current pipeline.

The Direct Editor can reuse Storage if it uses the durable adapter or an equivalent adapter with the same ownership/path rules. It must not persist blob URLs or session-only object URLs in template_config.

**Classification:** KEEP_WITH_ADAPTER.  
**Adapter needed:** Direct Editor asset adapter backed by avatars.  
**Risk:** medium. The main risk is selecting the local demo adapter.

## QR

src/components/qr/PageQrPanel.tsx builds the QR destination from getPublicPageUrl(page.public_id). The destination is /pg/{public_id}, not the slug and not an editor route.

20260918000000_add_page_qr_config.sql adds page-owned pages.qr_config. pageQrService reads and writes only that field with owner filters. It explicitly does not touch template_config, published_template_config or published_revision.

Replacing the editor UI does not affect page ID, public_id or page-owned QR config.

**Classification:** DO_NOT_TOUCH.  
**Risk:** low. The only prohibited change is using a draft URL or alias as QR authority.

## ANALYTICS

analyticsService.trackPageEvent calls track_child_page_event with page ID, event type, interaction type, item ID, item label, URL, user agent and referrer.

The public child routes call it for view and interaction events. PublicTemplateRenderer exposes onTrack, and the routes map product/service/WhatsApp/button interactions into the existing event contract.

20260921000000_add_page_analytics_events.sql adds qr_analytics.page_id with a foreign key to public.pages and defines track_child_page_event. The RPC resolves the owning profile and writes both profile and page identity.

Analytics depends on public renderer events, pages.id and the public route. It does not depend on Power Editor. The future editor should preserve block/item IDs if it wants per-item analytics continuity.

**Classification:** KEEP_WITH_ADAPTER.  
**Adapter needed:** none for public rendering; optional event mapping if IDs differ.  
**Risk:** low to medium if IDs are regenerated or event types change.

## ENGINE V2

Engine V2 is used as generation and normalization authority, not as public editor database or public route.

Evidence:

- src/lib/parametric-engine-v2/internal-entrypoint.ts generates validated editor configs and canonical envelopes.
- src/lib/page-generator/adapter.ts maps inputs to Engine V2 and accepts generated config.
- src/lib/page-generator/create-page.ts passes generated canonical config into page persistence.
- onboarding and Smart Pages use Engine V2 before persistence.

The Direct Editor does not inherently need Engine V2. It needs a serializable document contract, mutation/persistence boundaries and a renderer. Engine V2 may remain upstream for initial generation or page-type scaffolding, but direct mutations should not rerun generation and overwrite authored changes.

**Classification:** KEEP_WITH_ADAPTER.  
**Adapter needed:** generation result -> Direct Editor initial document, and Direct Editor document -> canonical/renderer shape if needed.  
**Risk:** medium.

## PUBLIC RENDERER

The public child route uses:

~~~text
resolveCanonicalEditorConfig()
  -> PublicTemplateRenderer
  -> TemplateRenderer(mode="public")
  -> block registry/components
~~~

PublicTemplateRenderer explicitly has no editor, inspector, drag-and-drop or history. It reuses TemplateRenderer so public and editor canvas share rendering.

TemplateRenderer is configuration-driven and accepts theme/layout/profile/blocks and onTrack independently of editing.

It cannot consume an arbitrary new document shape directly if that shape is not BioTemplateConfig. It can consume it through an adapter that normalizes to BioTemplateConfig.

A technical seam requires verification: PowerEditorHost passes documentKind="page" to PremiumTemplateStudio, but PublicTemplateRenderer currently does not explicitly pass documentKind to TemplateRenderer. TemplateRenderer has page-specific behavior for wide product grids when documentKind="page". This does not prove a new renderer is needed; it identifies a runtime contract to verify.

**Classification:** KEEP_WITH_ADAPTER.  
**Adapter needed:** only if the Direct Editor document shape differs.  
**Risk:** medium.

## POWER EDITOR DEPENDENCIES

### Frontend-only

These should not constrain the public Direct Editor:

- PowerEditorHost loading/error shell.
- PowerEditorGuidedTour.
- Power Editor route wrappers.
- Studio panels, inspector and editing controls.
- StudioProvider selection/panel state if the new editor uses another state model.

### Shared infrastructure

Reusable boundaries:

- pageService ownership and lifecycle.
- pageCanonicalService draft/publish.
- readCanonicalPageEnvelope and envelope versioning.
- createPageStorageAdapter shape, if compatible.
- durable Storage adapter pattern.
- PublicTemplateRenderer and TemplateRenderer.
- analyticsService.trackPageEvent.
- pageQrService and stable URL helpers.

### Persistence dependency

Studio depends on StorageAdapter.save and publish, but database services do not depend on Studio. The Direct Editor should inject a persistence adapter rather than import PowerEditorHost.

### Must decouple

Before a public pilot, isolate:

- profile-mode versus page-mode branching currently inside PowerEditorHost;
- editor UI state from page document state;
- BioTemplateConfig assumptions if a simpler document is desired;
- local demo asset adapter from hosted durable media;
- Power Editor diagnostics/guided-tour concerns from persistence;
- generation-time Engine V2 from manual mutations.

No backend table or RLS decoupling is indicated.

## KEEP / ADAPT / REPLACE MATRIX

| System | Current implementation | Files/tables/functions | Power Editor dependency | Direct Editor relevance | Classification | Adapter needed | Risk | Recommendation |
|---|---|---|---|---|---|---|---|---|
| Pages table | JSON draft/published snapshots, ownership and stable identity | public.pages; baseline migration | None at DB level | Primary document identity | KEEP_AS_IS | No | Low | Reuse |
| Page lifecycle | Create/list/read/delete own pages | pageService | No | Page management | KEEP_AS_IS | No | Low | Reuse service boundary |
| Draft save | Owner-filtered update of template_config | pageCanonicalService.saveDraft | Host calls it, service does not own UI | Canonical persistence | KEEP_WITH_ADAPTER | Document/storage adapter if shape differs | Medium | Keep authority |
| Published snapshot | Optimistic published update | pageCanonicalService.publish | No | Publication | KEEP_AS_IS | No | Low | Reuse unchanged |
| Envelope | schemaVersion plus editorConfig | canonical-page/contract.ts | No | Versioning/validation | KEEP_WITH_ADAPTER | Shape adapter if needed | Medium | Do not bypass |
| BioTemplateConfig | Theme/layout/profile/blocks document | premium-template-studio/types | Shared with Studio/renderer | Current renderer contract | KEEP_WITH_ADAPTER | New document to/from current config | Medium | Reuse first |
| Save coordinator | Autosave, dirty state, stale revision guard | StudioProvider | Studio-specific | Optional editor utility | KEEP_WITH_ADAPTER | Storage adapter | Medium | Reuse only if fit |
| Page editor host | Auth/load/adapters/Studio assembly | PowerEditorHost | Yes | Reference integration | DO_NOT_TOUCH | Extract boundaries later | Medium | Do not make UX depend on it |
| Public routing | Stable ID and alias routes | pg routes and RPCs | No | Public identity | DO_NOT_TOUCH | No | Low | Preserve |
| Auth | Session and owner identity | Supabase Auth, PowerEditorHost | Host reads session | Access control | KEEP_AS_IS | Route/session seam only | Low | Reuse |
| RLS | Owner CRUD policies | baseline migration | No | Isolation | DO_NOT_TOUCH | No | Low | No change |
| Storage | avatars with owner-scoped policies | storage bootstrap migration | Host creates durable adapter | Media | KEEP_WITH_ADAPTER | Durable asset adapter | Medium | Reuse bucket |
| Local assets | localStorage/data URLs/object URLs | premium-template-studio/adapters | Standalone demo | Unsafe for hosting | REPLACE | Supabase Storage adapter | High | Never use as authority |
| QR | Page config plus stable public URL | pageQrService, PageQrPanel | No | Page QR | DO_NOT_TOUCH | No | Low | Preserve |
| Analytics | Page ID event RPC and renderer hook | analyticsService, migration | Public renderer hook only | Views/interactions | KEEP_WITH_ADAPTER | Event mapping if IDs differ | Low/Medium | Preserve |
| Engine V2 | Initial generation/normalization | parametric-engine-v2, page-generator | No direct runtime requirement | Generation | KEEP_WITH_ADAPTER | Generation adapter | Medium | Keep upstream only |
| Public renderer | PublicTemplateRenderer to TemplateRenderer | renderer files | No editor UI | Public document rendering | KEEP_WITH_ADAPTER | Shape adapter if needed | Medium | Do not fork |
| Profile RPCs | Primary profile save/publish | canonicalPageService and SQL RPCs | Profile mode | Not page authority | DO_NOT_TOUCH | No | Medium | Never use for child pages |

## DEPENDENCY MAP

~~~text
Direct Page Editor
  -> document target { kind: "page", id }
  -> pageService.getOwnPageById()
  -> resolve/read canonical document
  -> editor document state
  -> field-scoped mutations
  -> persistence adapter
  -> pageCanonicalService.saveDraft()
  -> public.pages.template_config

Publish
  -> validated document snapshot
  -> pageCanonicalService.publish()
  -> public.pages.published_template_config
  -> pages.published=true
  -> pages.published_revision increment

Public request
  -> /pg/{public_id}
  -> get_public_page_by_public_id()
  -> published_template_config
  -> resolveCanonicalEditorConfig()
  -> PublicTemplateRenderer
  -> onTrack()
  -> analyticsService.trackPageEvent()
  -> track_child_page_event()

QR
  -> pages.public_id
  -> getPublicPageUrl(public_id)
  -> /pg/{public_id}
~~~

The profile path remains separate:

~~~text
Profile Editor
  -> profiles.template_config
  -> set_profile_canonical_editor_config()
  -> profiles.published_template_config
  -> /p/{profile.public_id}
~~~

## RISK REGISTER

| Risk | Evidence | Severity | Mitigation |
|---|---|---:|---|
| New document is not BioTemplateConfig | Envelope and validator require current editor contract | High | Add versioned application adapter |
| Child page uses profile RPCs | pageCanonicalService and canonicalPageService are separate | High | Inject page-specific persistence |
| Local object URL reaches canonical JSON | Default asset adapter is local; durable adapter is host-specific | High | Use Supabase Storage adapter |
| Invalid public snapshot | Public route not-founds on invalid/missing envelope | High | Validate before publish and reload public route |
| Analytics item IDs change | Events include page_id and item_id | Medium | Preserve stable IDs through conversion |
| Public page rendering differs from editor page mode | documentKind is explicit in host but not PublicTemplateRenderer | Medium | Runtime verify page-specific rendering |
| Publish conflict | Publish matches expected published_revision | Medium | Keep optimistic concurrency |
| Public table read bypasses RPC | Public path intentionally uses SECURITY DEFINER RPC | High | Keep public RPC path |
| Engine regeneration overwrites manual edits | Engine is generation-oriented | Medium | Generate once; mutate afterwards |
| QR identity changes | QR helper uses public_id | High | Never change target contract |
| Alias becomes canonical identity | Alias route canonicalizes to public_id | Medium | Preserve metadata behavior |

## PILOT INTEGRATION BOUNDARY

The smallest safe boundary is:

~~~text
Direct Editor UI/state
  -> page document adapter
  -> existing pageService load
  -> existing pageCanonicalService save/publish
  -> existing durable asset adapter
  -> existing PublicTemplateRenderer
~~~

The pilot should own document editing state, conversion, field-scoped mutations, adapter wiring, stable block/item IDs and save/publish status.

The pilot should not own page ownership rules, public IDs, QR identity, public RPCs, analytics table writes, Storage policy, publication columns or profile canonical RPCs for child pages.

## WHAT MUST NOT BE REBUILT

- public.pages as the child-page table.
- template_config and published_template_config for Pilot V1.
- pageService lifecycle and ownership.
- pageCanonicalService draft/publish.
- Supabase Auth and owner_user_id.
- Existing pages RLS.
- public_id and /pg/{public_id}.
- /pg/a/{slug} alias behavior.
- pages.qr_config and pageQrService.
- avatars bucket and owner policy model.
- Child-page analytics RPC and page_id relation.
- PublicTemplateRenderer / TemplateRenderer before an adapter is proven insufficient.
- Engine V2 generation when only initial generation is needed.

## WHAT MUST NOT BE TOUCHED

- No SQL migration.
- No table or column replacement.
- No RLS change.
- No Power Editor rewrite.
- No Catalog modification.
- No public URL change.
- No QR target change.
- No renderer fork.
- No replacement of profile canonical infrastructure.

## WHAT REQUIRES RUNTIME VERIFICATION

1. Authenticated child-page load through /pages/$pageId/edit.
2. Draft save, hard reload and exact template_config round trip.
3. Publish with expected published_revision and public reload through /pg/{public_id}.
4. Concurrent/stale publish conflict.
5. Public route when draft exists but published snapshot is null.
6. Rendering of Bio, Landing, Catálogo, Menú, Portfolio and Servicios.
7. Page-specific wide product-grid behavior because documentKind is explicit in editor host but not public renderer.
8. Durable upload, public URL, reload and removal through avatars.
9. Analytics view and click events using a child page ID.
10. QR destination remains /pg/{public_id}.
11. Alias resolves same page and canonicalizes to stable ID.
12. Invalid canonical document is rejected without exposing draft data.

## RECOMMENDED NEXT TECHNICAL STEP

Do a non-destructive contract spike, not a schema change:

~~~text
1. Define Direct Editor document adapter boundary.
2. Feed one current/generated page document through it.
3. Load with pageService.
4. Save with pageCanonicalService.saveDraft.
5. Reload and compare canonical snapshots.
6. Publish with pageCanonicalService.publish.
7. Open /pg/{public_id} and verify PublicTemplateRenderer.
8. Verify one durable asset and one analytics event.
~~~

Use an existing owned page and existing migrations. Do not create a new table, migration, RLS policy or renderer until a failing contract is demonstrated.

## FINAL SUMMARY

### reusable_now

- public.pages table and ownership relationship.
- pageService lifecycle and ownership checks.
- pageCanonicalService saveDraft, publish and unpublish.
- readCanonicalPageEnvelope and canonical versioning.
- published snapshot fields and optimistic revision.
- Auth session and owner_user_id.
- Existing page RLS.
- Stable public_id and /pg/{public_id}.
- Page alias routing.
- pages.qr_config and pageQrService.
- Child-page analytics RPC and page_id.
- avatars Storage bucket and owner policies.
- PublicTemplateRenderer / TemplateRenderer.
- Engine V2 as optional initial-generation authority.

### reuse_with_adapter

- New Direct Editor document shape to/from BioTemplateConfig.
- createPageStorageAdapter if the editor keeps StorageAdapter.
- Durable asset adapter for upload/list/remove.
- Analytics item mapping if IDs differ.
- Renderer documentKind/page-width semantics.
- Engine V2 output to Direct Editor initial document.

### must_decouple

- Public Direct Editor from PowerEditorHost UI and guided tour.
- Child-page persistence from profile canonical RPCs.
- Direct editing state from Engine V2 regeneration.
- Hosted assets from localStorage/data URL demo adapter.
- New document semantics from the assumption that every page is a profile document.

### do_not_touch

- Pages schema for Pilot V1.
- RLS policies.
- public_id and public routes.
- QR stable destination.
- Public RPCs.
- Analytics relationship.
- Storage bucket policy contract.
- Power Editor and frozen Catalog under this audit.

### unknown_needs_runtime

- Full save/reload/public-publish round trip.
- Public renderer compatibility for every page type and new adapter.
- Public documentKind behavior.
- Durable asset lifecycle.
- Revision conflict behavior.
- Analytics and QR in deployed environment.

### new_sql_required_for_pilot

~~~yaml
answer: "NO"
evidence:
  - "public.pages already stores draft and published JSONB snapshots"
  - "owner RLS policies already cover page CRUD"
  - "pageCanonicalService already persists and publishes child pages"
  - "page analytics, QR config and Storage migrations already exist"
~~~

### new_renderer_required_for_pilot

~~~yaml
answer: "NO, not from current code evidence"
evidence:
  - "PublicTemplateRenderer already delegates to TemplateRenderer"
  - "TemplateRenderer is configuration-driven and block-based"
  - "Engine V2 integration tests render generated configs through the current public renderer"
  - "A shape adapter is the first required experiment"
~~~

### power_editor_required_for_new_public_editor

~~~yaml
answer: "PARTIAL"
evidence:
  - "PowerEditorHost currently assembles auth, page loading, adapters and Studio"
  - "pageService and pageCanonicalService do not import the Power Editor UI"
  - "Public routes use PublicTemplateRenderer and analytics independently of PowerEditorHost"
  - "The future Direct Editor can reuse service/adapter boundaries without inheriting Power Editor UX"
~~~

**SUCCESS_GATE:** CRIPQER_DIRECT_EDITOR_BACKEND_REUSE_AUDIT_PASS  
**STOP_AFTER:** true

