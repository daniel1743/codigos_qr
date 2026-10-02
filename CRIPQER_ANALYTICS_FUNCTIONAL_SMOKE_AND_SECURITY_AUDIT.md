# CRIPQER — Analytics Functional Smoke Test and Security Audit

Fecha de ejecución: 2026-10-01 UTC  
Entorno funcional: producción `https://www.cripqer.dev`  
Supabase: `mlinfiuhkxdhlveflbkj`  
Página: `VvUsngW` / `1c4aa062-a012-47e4-b0f1-99ca8e80d1ec`

## Veredicto ejecutivo

- `final_functional_status: ANALYTICS_FUNCTIONAL_PARTIAL`
- `final_security_status: SECURITY_NOT_VERIFIED`
- `final_rollout_recommendation: SAFE_FOR_LIMITED_ALLOWLIST`

Las visitas directas, sesiones, page views, clasificación desktop y QR scan funcionan mediante el flujo real navegador → aplicación → RPC → `qr_analytics`.

UTM no se persiste. Los clics reales probados en WhatsApp y en un enlace externo abrieron correctamente el destino, pero no generaron una nueva fila de analytics. No se aplicaron correcciones.

La verificación de grants PostgreSQL, `security_invoker` y policies no se considera realizada: PostgREST no expone el catálogo SQL y no había una conexión SQL de solo lectura disponible.

## Marcadores sintéticos

Se usaron únicamente URLs con:

- `utm_source=cripqer_qa`
- `utm_campaign=analytics_smoke_20261001_direct`
- `utm_campaign=analytics_smoke_20261001_fresh`

Resultado: `0` filas persistieron esos marcadores, lo que constituye el fallo UTM observado.

## Matriz funcional

| Test | Acción | Esperado | Resultado DB | Estado |
|---|---|---|---|---|
| Direct visit | `/pg/VvUsngW` con UTM QA | `session_start`, `page_view` | Ambos persistieron; misma sesión | PASS |
| Session start | Primera visita | Una sesión | `session_start` persistió | PASS |
| Page view | Primera visita y recarga | Page views | Persistieron | PASS |
| UTM source | `utm_source=cripqer_qa` | Valor persistido | `NULL` | FAIL |
| UTM campaign | `analytics_smoke_*` | Valor persistido | `NULL` | FAIL |
| QR scan | `/q/VvUsngW` | `qr_scan` y redirect | Persistió y redirigió a `/pg/VvUsngW` | PASS |
| QR source | Flujo QR | `source=qr` | `qr` | PASS |
| QR ID | Flujo QR | `qr_id=VvUsngW` | `VvUsngW` | PASS |
| WhatsApp click | Click CTA real | `whatsapp_click` | No apareció fila nueva | FAIL |
| External link | Click “Ver productos” | Click canónico/legacy | No apareció fila nueva | FAIL |
| Desktop device | Chromium desktop | `desktop` | `desktop` | PASS |
| Mobile device | Contexto móvil nuevo | `mobile` | No ejecutado en este smoke | NOT VERIFIED |
| Country | Visita real | Valor si implementado | `NULL` | NOT_IMPLEMENTED/NO DATA |
| City | Visita real | Valor si implementado | `NULL` | NOT_IMPLEMENTED/NO DATA |

## Filas persistidas después del smoke

Para la página objetivo quedaron 35 filas:

| Evento | Cantidad |
|---|---:|
| `page_view` | 18 |
| `session_start` | 10 |
| `qr_scan` | 3 |
| `view` legacy | 2 |
| `whatsapp_click` | 2 históricas; ninguna nueva en esta prueba |

El smoke generó correctamente:

- dos sesiones nuevas con `session_start` + `page_view`;
- un `qr_scan` nuevo;
- tres `qr_scan` totales con `qr_id=VvUsngW` y `source=qr`.

La recarga en la misma pestaña generó otro `page_view` y no duplicó `session_start` para la sesión persistida.

## UTM y tráfico

El writer canónico acepta `utmSource` y `utmCampaign`, pero las rutas públicas no extraen `window.location.search` ni pasan esos valores al writer. Las filas reales verificadas contienen ambos campos como `NULL`.

El tráfico directo no se clasifica explícitamente como `direct`; queda `source=NULL`. El único source probado y persistido correctamente es el de QR, forzado server-side a `qr`.

## Clics

Los dos clics reales abrieron nuevos destinos:

- WhatsApp: nueva pestaña `api.whatsapp.com`.
- Producto externo: nueva pestaña `bienestarenclaro.com`.

No apareció una fila nueva después de cada acción. El código usa `void writer.track(...)` en el callback y permite que el anchor navegue inmediatamente. Ese patrón puede perder la escritura asíncrona al abrir una nueva pestaña o abandonar el documento. El hallazgo requiere una corrección separada; no se modificó.

## Geografía

En las 28 filas de la página objetivo, `country` y `city` fueron nulos. El frontend público no envía esos campos, y el writer/RPC canónico observado no recibe una inferencia geográfica. Estado: `NOT_IMPLEMENTED/NO DATA`, no un fallo de una sola máquina.

## Auditoría de seguridad

| Elemento | Estado |
|---|---|
| `track_page_view` anon/authenticated | NOT_VERIFIED |
| `track_link_click` anon/authenticated | NOT_VERIFIED |
| `track_child_page_event` | NOT_VERIFIED |
| `track_analytics_event` | NOT_VERIFIED |
| `qr_analytics_daily security_invoker=true` | NOT_VERIFIED |
| `qr_top_links security_invoker=true` | NOT_VERIFIED |
| Policy de inserción unrestricted ausente | NOT_VERIFIED |

No se usó una prueba funcional como evidencia de seguridad. Las consultas PostgREST con service role confirmaron que las relaciones existen y son legibles, pero no prueban grants ni opciones internas del catálogo PostgreSQL.

## VITE_APP_URL

El bundle de producción contiene:

```text
VITE_APP_URL=http://localhost:3000
```

`.env.local` también contiene `http://localhost:3000`, aunque el servidor local escucha en `8080`.

El getter aparece en `src/lib/env.ts`, pero no encontré consumidores efectivos relevantes; las URLs públicas usan `CANONICAL_PUBLIC_ORIGIN`. No se puede atribuir el fallo UTM o geográfico a `VITE_APP_URL` con la evidencia actual. Debe corregirse antes de un rollout general, pero no fue cambiado.

## Qué no se modificó

- No se modificó código de analytics.
- No se modificaron migraciones ni policies.
- No se aplicaron migraciones.
- No se eliminaron filas sintéticas ni históricas.
- No se cambiaron variables remotas ni se desplegó.
- No se tocó Catalog, FuXion ni ButtonGroup.

## Próximos pasos mínimos

1. Verificar grants, `security_invoker` y policies mediante SQL de solo lectura.
2. Corregir la extracción y propagación de UTM en las rutas públicas.
3. Asegurar el envío de clic antes de navegar, usando una estrategia de beacon/await controlada.
4. Repetir el smoke con desktop y móvil.
5. Mantener Analytics V1.1 limitado al allowlist hasta completar esos puntos.
