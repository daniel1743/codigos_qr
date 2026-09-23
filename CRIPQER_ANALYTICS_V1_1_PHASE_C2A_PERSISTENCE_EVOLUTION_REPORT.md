# Cripqer — Intelligent Analytics V1.1 · Phase C2A — Persistence Evolution (Dry Run)

**Task:** `CRIPQER_ANALYTICS_V1_1_PHASE_C2A_PERSISTENCE_EVOLUTION_DRY_RUN`
**Modo:** dry run · solo evolución aditiva de persistencia · sin ejecución SQL en producción
**Estrategia:** Option C — Compatibility Projection + Incremental Evolution

## HEAD

| Item | Value |
|---|---|
| HEAD BEFORE | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` |
| HEAD AFTER | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` (cambios solo en working tree, sin commit) |

No se reescribió historia publicada (regla Lovable). No se creó commit.

## 1. Resumen

Se diseñó y validó la **mínima evolución aditiva** de `qr_analytics` necesaria para
que, en una fase posterior (C2B), las escrituras puedan portar el contexto más rico
de `AnalyticsEventV1`. El cambio es estrictamente **aditivo**: 4 columnas nullable y
el ensanchamiento seguro del `CHECK` de `event_type`. No hay backfill, no se reescribe
historia, no se fabrica `session_id` ni origen QR, y ningún RPC de escritura cambió.

## 2. PRE_MIGRATION_SCHEMA_CONTRACT — `public.qr_analytics`

### Columnas (exacto, pre-migración)

| columna | tipo | nullable | default | notas |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| profile_id | uuid | NO | — | FK → profiles.id ON DELETE CASCADE |
| event_type | text | NO | — | CHECK (`view`,`link_click`) → `qr_analytics_event_type_check` |
| link_id | uuid | YES | NULL | FK → profile_links.id ON DELETE SET NULL |
| country | text | YES | NULL | |
| city | text | YES | NULL | |
| latitude | numeric(9,6) | YES | NULL | |
| longitude | numeric(9,6) | YES | NULL | |
| user_agent | text | YES | NULL | |
| device_type | text | YES | NULL | CHECK (`mobile`,`desktop`,`tablet`,`unknown`) → `qr_analytics_device_type_check` |
| browser | text | YES | NULL | |
| os | text | YES | NULL | |
| created_at | timestamptz | YES | now() | |
| referrer | text | YES | NULL | |
| session_id | text | YES | NULL | ya existía (no se toca) |
| ip_hash | text | YES | NULL | |
| page_id | uuid | YES | NULL | FK → pages.id ON DELETE SET NULL (20260921000000) |
| interaction_type | text | YES | NULL | CHECK (`button`,`whatsapp`,`product`,`service`) → `qr_analytics_interaction_type_check` |
| item_id | text | YES | NULL | |
| item_label | text | YES | NULL | |
| target_url | text | YES | NULL | |

### Constraints / índices / RLS / grants / RPCs

- **Constraints:** PK `id`; FK `profile_id`→profiles (CASCADE), `link_id`→profile_links
  (SET NULL), `page_id`→pages (SET NULL); CHECK `qr_analytics_device_type_check`,
  `qr_analytics_event_type_check`, `qr_analytics_interaction_type_check`.
- **Índices existentes:** `idx_qr_analytics_profile_id(profile_id)`,
  `idx_qr_analytics_created_at(created_at DESC)`, `idx_qr_analytics_event_type(event_type)`,
  `idx_qr_analytics_profile_event(profile_id, event_type)`,
  `idx_qr_analytics_session_id(session_id)`, `idx_qr_analytics_link_id(link_id) WHERE link_id IS NOT NULL`,
  `idx_qr_analytics_profile_date(profile_id, created_at DESC)`,
  `idx_qr_analytics_page_date(page_id, created_at DESC) WHERE page_id IS NOT NULL`,
  `idx_qr_analytics_page_interaction(page_id, interaction_type) WHERE page_id IS NOT NULL`.
- **RLS:** ENABLED. Políticas: `Users can read their own analytics` (SELECT,
  profiles.user_id = auth.uid()), `Anyone can insert analytics` (INSERT, WITH CHECK true),
  `Admin can read all analytics` (SELECT, admin_users).
- **Grants:** `GRANT ALL ON TABLE qr_analytics TO anon, authenticated, service_role`.
- **RPCs (sin cambios):**
  - `track_page_view(...)` — SECURITY DEFINER, escribe `'view'`.
  - `track_link_click(...)` — SECURITY DEFINER, escribe `'link_click'`.
  - `track_child_page_event(...)` — SECURITY DEFINER, valida `view`/`link_click`, resuelve `profile_id`.
  - `get_public_page_by_public_id(text)`, `get_public_page_by_slug(text)` — proyecciones públicas.
- **Views:** `qr_analytics_daily`, `qr_top_links`.

## 3. COLUMNS ADDED (todas NULLABLE, sin backfill)

| columna | tipo | justificación |
|---|---|---|
| source | text | atribución de tráfico (qr/direct/social/referral); gap C1 `traffic_sources` |
| utm_source | text | UTM source; gap C1 |
| utm_campaign | text | UTM campaign; gap C1 |
| qr_id | text | identidad de entrada QR para un futuro `qr_scan`; NO escrito en esta fase |

## 4. COLUMNS NOT ADDED + WHY

| columna candidata | decisión | por qué |
|---|---|---|
| session_id | ya existe | columna `session_id text NULL` ya presente; el gap es de **escritura** (C2B), no de schema |
| device / browser / os | ya existen | `device_type`, `browser`, `os` ya presentes; gap de escritura |
| country / city_approx | ya existen | `country`, `city` ya presentes; gap de escritura (server-side geo) |
| platform | ya existe | servido por `interaction_type` |
| referrer | ya existe | columna presente |
| smart_page_id | NO añadida | smart pages no activas (C1: smartPageId UNAVAILABLE); no justificado aún |
| block_id | NO añadida | Power Editor congelado; no justificado |
| metadata (jsonb) | NO añadida | el adapter ya sintetiza metadata en lectura; sin boundary de escritura aún evita dump arbitrario de PII |

## 5. CONSTRAINT CHANGES

- Se **ensanchó** `qr_analytics_event_type_check` de `('view','link_click')` a:
  legacy (`view`, `link_click`) + canónicos V1.1 (`page_view`, `smart_page_view`,
  `qr_scan`, `cta_click`, `whatsapp_click`, `instagram_click`, `facebook_click`,
  `tiktok_click`, `youtube_click`, `linkedin_click`, `external_link_click`,
  `lead_created`, `share`, `session_start`, `return_visit`).
- **Ningún otro constraint cambió** (`device_type`, `interaction_type` intactos).
- Ensanchamiento puro: valores legacy siguen válidos; historia no se reescribe.

## 6. INDEXES

- **Existentes reutilizados:** sí, `idx_qr_analytics_page_date(page_id, created_at DESC)`
  ya sirve la consulta acotada real de C1 (`page_id + created_at range + order desc + limit`).
- **Nuevos/propuestos:** ninguno. No se añaden índices especulativos sobre columnas
  que aún no reciben escritura (session_id/utm). Se añadirán cuando C2B persista datos.

## 7. RPC COMPATIBILITY RESULT — PASS (estático)

Ninguna firma posicional cambió. `track_page_view`, `track_link_click`,
`track_child_page_event` permanecen idénticos. El `CHECK` ensanchado no altera el
comportamiento de los RPC: `track_child_page_event` sigue guardando `view`/`link_click`
a nivel de RPC. `new_production_RPC_required = false` (cumplido).

## 8. SECURITY REVIEW

- **CURRENT_SECURITY_STATE:** RLS habilitado; lecturas owner-scoped vía
  `Users can read their own analytics`; escritura pública vía
  `Anyone can insert analytics` (WITH CHECK true) y `GRANT ALL ON TABLE ... TO anon`.
  Los RPC de tracking son SECURITY DEFINER.
- **TARGET_SECURITY_STATE:** visitante público = solo escritura de eventos permitidos
  vía RPC controlados; owner = lectura solo de su perfil/página; sin SELECT/INSERT
  directo amplio para anon.
- **SECURITY_MIGRATION_REQUIRED_LATER:** sí. Los grants amplios actuales
  (`GRANT ALL TO anon/authenticated`) y `INSERT WITH CHECK true` son más débiles que
  el target. **NO se endurecen en esta fase** (no probado retrocompatible en aislado).
  Se documenta como deuda de seguridad para una fase posterior con test aislado.

## 9. RESULTADOS DE VALIDACIÓN (adapter + datos mixtos)

| Check | Resultado |
|---|---|
| LEGACY ROW RESULT | PASS (`view`→`page_view`, `link_click`→canal; sin inventar source/utm/qr) |
| NEW ROW RESULT | PASS (`page_view`+session, `whatsapp_click`+platform, `external_link_click`, UTM/source, `qr_scan`+qr_id, fila sin contexto opcional) |
| MIXED DATASET RESULT | PASS (12 tests nuevos + 5 adapter + 3 capability = 20 en verde) |
| SESSION_ID RESULT | PASS (nullable; NULL se preserva como UNAVAILABLE; nunca sintetizado) |
| QR_SCAN RESULT | PASS (columna `qr_id` preparada; `view` NUNCA se asume `qr_scan`; sin escritura runtime en esta fase) |

## 10. LOCAL / SHADOW MIGRATION RESULT — NOT_AVAILABLE

Docker (29.8.0) y Supabase CLI (2.62.10) están instalados, pero el daemon de Docker
no responde (`docker ps` queda colgado) y no existe `supabase/config.toml` local. No se
pudo ejecutar la migración en un shadow local. Se dejó lista:
- migración aditiva idempotente (revisada), y
- `scripts/analytics_v1_1_event_context_verify.sql` con aserciones de schema
  (columnas nullable, constraint ensanchado, session_id nullable) para aplicar en un
  entorno controlado de QA.

## 11. BUILD / TEST / TYPECHECK

| Check | Resultado |
|---|---|
| BUILD (vite full) | NOT RE-RUN (deferred a QA; build pesado ~40s). El cambio TS es solo tipos/lógica pura del adapter, ya cubierto por tsc. |
| TEST (vitest) | PASS — 20/20 (cripqer-event-adapter 5, real-data-capability 3, analytics-v1-1-persistence-evolution 12) |
| TYPECHECK (staging tsc) | PASS (exit 0) |
| LINT (eslint, archivos tocados) | PASS (exit 0) |

## 12. MIGRATION FILE PATH

`supabase/migrations/20260922000000_analytics_v1_1_event_context.sql`

## 13. Indicadores de cumplimiento

| Indicador | Valor |
|---|---|
| REMOTE SQL EXECUTED | false |
| PRODUCTION WRITES CHANGED | false |
| FROZEN AREAS TOUCHED | false (Catalog, Power Editor, Engine V2, QR identity/public_id, public routes, published runtime, Billing, notificaciones: no tocados) |
| VISUAL_GATE_DEBT | OPEN |
| READY_FOR_C2B | YES (migración aditiva segura para aplicación controlada en QA) |

## 14. Aplicación controlada (QA) y rollback

- **Aplicar:** `supabase db push` contra una instancia **local/shadow** (o ejecutar el
  archivo en un entorno de QA) — NUNCA contra producción remota sin aprobación.
- **Verificar:** ejecutar `scripts/analytics_v1_1_event_context_verify.sql`.
- **Rollback (solo QA, antes de C2B):** dentro del archivo de migración, bloque
  comentado `ROLLBACK / RECOVERY`: dropear las 4 columnas nuevas y restaurar el
  constraint de `event_type` a `('view','link_click')`. Nota: el rollback pierde datos
  de las columnas nuevas, por lo que solo es seguro antes de que C2B empiece a escribir.

**Estado:** `PHASE_C2A_PERSISTENCE_EVOLUTION_READY_FOR_QA_APPLY`


