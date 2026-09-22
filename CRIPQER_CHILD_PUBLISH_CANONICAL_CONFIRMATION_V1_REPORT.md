# Cripqer — Child Publish Canonical Confirmation V1

**Modo:** `READ_ONLY_CANONICAL_VERIFICATION`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_CHILD_PUBLISH_CANONICAL_CONFIRMATION_V1`

## Alcance

Se realizaron únicamente lecturas contra Supabase REST y una solicitud `GET`
de la ruta pública. No se publicó, editó ni modificó ninguna página, perfil,
QR o configuración.

## Fila canónica leída

`public.pages.id = 6b01e073-da2a-464c-9c1e-d16c9207fb6d`

| Campo                       |                       Resultado |  Esperado | Estado       |
| --------------------------- | ------------------------------: | --------: | ------------ |
| `title`                     |              `QA Catalog Final` |     igual | PASS         |
| `page_type`                 |                       `catalog` |         — | PASS         |
| `public_id`                 |                       `A8LjoRw` | `A8LjoRw` | PASS         |
| `slug`                      |                          `null` |         — | INFO         |
| `published`                 |                          `true` |    `true` | PASS         |
| `published_revision`        |                             `4` |       `1` | **MISMATCH** |
| `published_at`              | `2026-09-21T18:21:43.347-03:00` |   no nulo | PASS         |
| `published_template_config` |                        presente |  presente | PASS         |
| `template_config`           |                        presente |  presente | PASS         |
| `qr_config`                 |                          `null` |         — | INFO         |

## Ruta pública

`GET https://www.cripqer.dev/pg/A8LjoRw` respondió `HTTP 200` y el documento
contiene `Nuestro catálogo` y `Productos y soluciones`. La evidencia manual
aportada además confirma `catalog products` y ausencia de controles del editor
en la superficie pública.

## Aislamiento

- El perfil principal relacionado es `public_id = sY9wHGm`, `slug = qa-dual-editor-test`.
- No existe un `profile_links` del perfil principal cuyo destino sea
  `/pg/A8LjoRw`; no se observó creación automática de botón/enlace.
- La fila principal conserva su identidad y configuración QR; la publicación
  de la página hija no escribe `profiles` ni `profile_links`.
- La página hija tiene `qr_config = null`; no se modificó el QR principal.

## Resultado

La publicación está persistida y la ruta pública funciona, pero el estado
esperado exacto no queda confirmado porque `published_revision` es `4`, no `1`.
No se puede emitir de forma estricta:

`CRIPQER_P1_CHILD_PAGE_PUBLISH_PERSISTENCE_FIXED_FROZEN`

ni, por dependencia del gate anterior, confirmar el gate 2 como congelado.

### Señales registradas

- `CHILD_PUBLISH_HANDLER_RUNTIME_PASS` — según evidencia manual aportada.
- `CHILD_PUBLISH_DB_WRITE_PASS` — `published=true`, timestamp y snapshot presentes.
- `PUBLISHED_SNAPSHOT_RUNTIME_PASS` — snapshot servido en la ruta pública.
- `PUBLISHED_REVISION_RUNTIME_PASS` — **NOT CONFIRMED**; valor observado `4`, esperado `1`.
- `CHILD_PUBLIC_ROUTE_RUNTIME_PASS` — ruta pública `HTTP 200`.

**Estado final:** `CANONICAL_VERIFICATION_MISMATCH_REVISION`  
**STOP_AFTER:** `true`
