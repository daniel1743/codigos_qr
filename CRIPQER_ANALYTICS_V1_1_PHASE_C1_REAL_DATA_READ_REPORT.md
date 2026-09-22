# Cripqer — Intelligent Analytics V1.1 · Phase C1 — Real-Data Read Bridge

**Task:** `CRIPQER_ANALYTICS_V1_1_PHASE_C1_SINGLE_QA_PROFILE_REAL_DATA_READ`
**Modo:** solo lectura · sin SQL · sin escritura de eventos · una sola página QA propia

## HEAD

| Item | Value |
|---|---|
| HEAD BEFORE | `5d7799440b6c82b9302219807f35ac3f0644e5c7` |
| HEAD AFTER | `5d7799440b6c82b9302219807f35ac3f0644e5c7` (cambios sin commit en working tree) |

No se reescribió historia publicada (regla Lovable). No se creó commit.

## 1. Resumen

Se conectó Intelligent Analytics V1.1 a datos reales de `qr_analytics` para
exactamente una página QA propia, en modo solo lectura, a través de un boundary de
compatibilidad (`fromLegacyAnalyticsRecord`). No se tocó la persistencia, no se creó
SQL, no se añadieron escrituras de eventos.

- Los registros legacy (`view`, `link_click`) se mapean de forma determinista a
  `AnalyticsEventV1` sin inventar sesión, origen QR, geografía, dispositivo ni
  atribución de red social.
- Los módulos dependientes de sesión quedan ocultos/learning cuando `session_id`
  no está persistido (caso real de `track_child_page_event`).
- El modo "Datos reales" vive dentro de la ruta existente `/pages/$pageId/analytics`
  (QA/dev únicamente), junto a los modos legacy y fixtures que se preservan.

## 2. Página QA usada

| Item | Valor |
|---|---|
| Regla | Una página autenticada propiedad del usuario QA actual |
| Mecanismo | `pageService.getOwnPageById(supabase, pageId, auth.user.id)` en la ruta |
| Identidad concreta | resuelta en runtime (no hardcodeada); depende de la sesión QA |
| Verificación live | NOT_VERIFIED (entorno headless sin sesión autenticada) — ver visual_gate_debt |

`getOwnPageById` exige `owner_user_id = auth.user.id`; la RLS `Users can read their own
analytics` es el backstop de servidor. Nunca se leen análisis de otro usuario.

## 3. Tablas / RPCs leídos (solo lectura)

| Objeto | Uso |
|---|---|
| `public.qr_analytics` | SELECT acotado por `page_id` + rango + límite + orden determinista |
| `public.pages` | `pageService.getOwnPageById` (ownership) |
| `public.profiles` | (implícito vía RLS) ownership backstop |
| `track_child_page_event` | NO ejecutado (solo lectura) |

## 4. Conteo de eventos legacy y mapeo AnalyticsEventV1

| Item | Valor |
|---|---|
| Legacy events leídos (live) | NOT_VERIFIED (requiere sesión QA autenticada) |
| `view` | `page_view` (o `smart_page_view` solo si scope lo prueba) |
| `link_click` | canal determinista (`whatsapp_click`, `instagram_click`, `facebook_click`, `tiktok_click`, `youtube_click`, `linkedin_click`, `cta_click`, `external_link_click`) |
| `view` → `qr_scan` | prohibido (nunca emitido) |
| `session_id` inventado | no (solo si está persistido) |

## 5. Matriz de procedencia de campos

Clasificación: `EXACT`, `NORMALIZED`, `APPROXIMATE`, `UNAVAILABLE`.

| Campo | Clase | Fuente |
|---|---|---|
| id | EXACT | `qr_analytics.id` |
| eventType | EXACT (view) / NORMALIZED (link_click) | `event_type` + `interaction_type`/`target_url` |
| timestamp | EXACT | `created_at` |
| profileId | EXACT | `profile_id` |
| pageId | EXACT si persistido | `page_id` |
| smartPageId | UNAVAILABLE | — |
| qrId | UNAVAILABLE | — (sin origen QR persistido) |
| linkId | EXACT si persistido | `link_id` (null en child) |
| linkLabel | EXACT si persistido | `item_label` |
| itemId | EXACT si persistido | `item_id` |
| platform | NORMALIZED si persistido | `interaction_type` |
| sessionId | EXACT si persistido, sino UNAVAILABLE | `session_id` (RPC child NO lo escribe) |
| source | UNAVAILABLE | — (no existe columna) |
| referrer | EXACT si persistido | `referrer` |
| utmSource / utmCampaign | UNAVAILABLE | — (no existen columnas) |
| device / browser / os | UNAVAILABLE | `device_type`/`browser`/`os` no escritos por RPC child (sí hay `user_agent`) |
| country | EXACT si persistido, sino UNAVAILABLE | `country` (no escrito en child) |
| cityApprox | APPROXIMATE si persistido | `city` |
| metadata | NORMALIZED | adapter (`legacyEventType`, `scope`) |

## 6. Matriz de capacidad de módulos

| Módulo | Clasificación |
|---|---|
| KPI page views | REAL_DATA_READY |
| KPI interactions | REAL_DATA_READY |
| performance trend | REAL_DATA_READY |
| sparklines | REAL_DATA_READY |
| top links | REAL_DATA_READY_WITH_LIMITATION (`item_label` sí; `link_id` null) |
| channel performance | REAL_DATA_READY (normalización URL/interaction) |
| traffic sources | NEEDS_SESSION_ID / NEEDS_NEW_FIELD |
| devices | NEEDS_NEW_FIELD (`device_type` no persistido) |
| geography | NEEDS_NEW_FIELD (`country`/`city` no persistidos en child) |
| hot hours | REAL_DATA_READY |
| realtime 15/30/60 | REAL_DATA_READY |
| new vs returning | NEEDS_SESSION_ID |
| funnel | NEEDS_SESSION_ID (+ QR) |
| goals | REAL_DATA_READY_WITH_LIMITATION |
| records | REAL_DATA_READY |
| momentum | REAL_DATA_READY_WITH_LIMITATION |
| Daily Brief | REAL_DATA_READY_WITH_LIMITATION |
| insights | REAL_DATA_READY_WITH_LIMITATION |
| Smart Toast candidate generation | REAL_DATA_READY_WITH_LIMITATION |
| Notification Center | REAL_DATA_READY_WITH_LIMITATION |

## 7. Módulos dependientes de sesión — resultado

`resolveRealDataWidgets` fuerza a **hidden** (con razón explícita) cuando
`sessionTracking === false`: `new_vs_returning`, `conversion_funnel`, `geography`,
`devices`, `traffic_sources`, `period_comparison` (por su fila "Visitors").

Motivo: sin `session_id`, el metrics engine degrada esas agregaciones a conteo de
eventos (`visitors = sessionIds.size || views`), lo que fabricaría visitantes/sesiones.

## 8. Boundary futuro del qr_scan

El punto exacto y más seguro para emitir un futuro `qr_scan` canónico sin cambiar
identidad QR, semántica de redirect ni URLs históricas es el entry del renderizador
público, en el mismo lugar donde ya se emite `trackPageEvent(..., "view")`
(`src/routes/pg.$publicId.tsx`, `pg.a.$slug.tsx`), cuando la request trae un parámetro
de identidad QR (p.ej. `?qr=...`). Ese sitio ya resuelve `page_id`/`profile_id` vía RPC,
no toca el redirect y puede persistir un `qr_scan` adicional al `view`.

Phase C1 no añade esa escritura. Requiere columna/evento nuevo y queda para C2.

## 9. Resultado de consulta acotada por rango

Consulta: `page_id` + `gte(created_at, from)` + `lt(created_at, to)` +
`order(created_at desc)` + `limit(2000)`.

| Rango | Bounds | Row count (live) |
|---|---|---|
| today | start-of-local-day → now | NOT_VERIFIED |
| 7d | -6 días → now | NOT_VERIFIED |
| 30d | -29 días → now | NOT_VERIFIED |
| 90d | -89 días → now | NOT_VERIFIED |

Verificación determinista de bounds y forma de consulta: PASS en tests unitarios.
El modo real en runtime carga 90d (acotada) y el selector nativo del dashboard filtra
hoy/7d/30d/90d en cliente; nunca se carga historial ilimitado.

## 10. Ownership

- App: `pageService.getOwnPageById` (`owner_user_id = auth.user.id`).
- DB: RLS `Users can read their own analytics` (`profiles.user_id = auth.uid()`).
- Query: filtro `page_id` sobre una página ya verificada como propia.
- Sin filas cross-user. Resultado: PASS (diseño) / NOT_VERIFIED (runtime live).

## 11. Build y tests

| Check | Resultado |
|---|---|
| `npx vite build` (client + SSR + nitro) | PASS (`✓ built in 43.02s` + `40.76s`, deployable) |
| Staging tsc (`tsconfig.staging.json`) | PASS |
| `cripqer-event-adapter.test.ts` | PASS |
| `real-data-capability.test.ts` | PASS |
| `analyticsRealData.test.ts` | PASS |
| `analytics.page.test.ts` (regresión) | PASS |
| `staging-harness.test.ts` (regresión) | PASS (`PHASE_A_HARNESS_PASS`) |
| TypeScript global estricto | errores preexistentes fuera de alcance; ninguno en archivos de producción de esta tarea |

## 12. Matriz de gap de persistencia

| Campo AnalyticsEventV1 | Hoy | Gap mínimo |
|---|---|---|
| session_id | columna existe, NO escrita por `track_child_page_event` | escribir `session_id` en el RPC child |
| event_type expansion | solo `view`/`link_click` | añadir tipos canónicos (`qr_scan`, `share`, `lead_created`) |
| platform | `interaction_type` | ampliar catálogo si se necesitan más canales |
| source / referrer | `referrer` sí; `source` no | columna `source` (o derivar de referrer/utm) |
| utm_source / utm_campaign | no existen | columnas utm |
| device / browser / os | `user_agent` sí, derivados no escritos | persistir derivados en escritura |
| country / city_approx | columnas existen, no escritas en child | persistir en escritura (server-side) |
| qr_id / context | no existe | columna `qr_id` o `entry_context` |
| smart_page_id | no existe | columna si se activan smart pages |
| item/link/block identity | `item_id`/`item_label` sí; `link_id` null | mapear block/item del editor |
| metadata | no existe | columna JSONB opcional |


## 13. Evaluación de opciones de persistencia

**Option A — EXTEND_EXISTING_QR_ANALYTICS**
migration risk BAJO; backward compat ALTA; ownership/RLS resuelto; extensibilidad de
eventos MEDIA; session requiere escribir `session_id`; query performance buena
(indexada); histórico preservado; complejidad BAJA; server aggregation/notification viable.

**Option B — NEW_CANONICAL_ANALYTICS_EVENTS**
migration risk MEDIO (tabla + backfill); backward compat requiere proyección;
ownership/RLS a redefinir; extensibilidad ALTA; session ALTA; query performance óptima;
histórico requiere backfill (riesgo); complejidad ALTA.

**Option C — COMPATIBILITY_PROJECTION + INCREMENTAL_EVOLUTION**
migration risk BAJO-MEDIO; backward compat ALTA; ownership/RLS heredado; extensibilidad
MEDIA-ALTA; session ALTA (añade `session_id`); query performance buena; histórico
preservado; complejidad MEDIA.

## 14. Estrategia de persistencia recomendada

**Option C — Compatibility Projection + Incremental Evolution**, con el primer
incremento siendo Option A mínimo:

1. Mantener `qr_analytics` como fuente de verdad histórica (no reescribir).
2. Mantener la proyección de lectura `fromLegacyAnalyticsRecord` ya construida en C1.
3. El primer cambio de schema (en C2, NO en C1) es extender la tabla existente:
   persistir `session_id` en `track_child_page_event` y añadir columnas nullable para
   `source`, `utm_source`, `utm_campaign`, `qr_id/entry_context` y dispositivos
   normalizados. Sin tabla nueva, sin backfill destructivo.

Por qué: preserva histórico y RLS/ownership, evita una segunda plataforma, reduce
riesgo de migración y cumple el contrato `AnalyticsEventV1` incrementalmente. Una tabla
canónica nueva (Option B) solo se justificaría si el volumen/eventos excede lo que una
extensión mantiene legible; hoy la evidencia no lo exige.

## 15. Qué queda sin verificar

- Conteo real de filas legacy por rango (requiere sesión QA autenticada).
- Página QA concreta usada (resuelta en runtime por ownership).
- Visual final del modo real (browser/CUA no puede forzar viewports/tiers/pantallas).
- `visual_gate_debt` permanece OPEN (no se re-ejecuta el flujo bloqueado idéntico).
- Limitación residual conocida: el Daily Brief incluye una frase "% de sesiones con una
  vista tomó acción". Sin `session_id` ese porcentaje no es defendible; el brief se
  clasifica `REAL_DATA_READY_WITH_LIMITATION` y su frase de sesión quedará condicionada
  a la disponibilidad de `session_id` cuando se persista (C2).

## 16. Indicadores de cumplimiento

| Indicador | Valor |
|---|---|
| SQL_CREATED | `false` (esperado false) |
| SQL_EXECUTED | `false` (esperado false) |
| PRODUCTION_WRITES_CHANGED | `false` (esperado false) |
| FROZEN_AREAS_TOUCHED | `false` (Catalog, Power Editor, Engine V2, QR identity, public routes, published runtime, Billing, notifications: no tocados) |
| VISUAL_GATE_DEBT | `OPEN` |
| production rollout | deshabilitado |

**Estado:** `PHASE_C1_REAL_DATA_READ_BRIDGE_PASS` (bridge de lectura construido y
verificado a nivel de código/tests/build; la verificación visual live queda como
deuda abierta del entorno).

