# Cripqer — Direct Page Editor Reload Loading Root Cause V1

**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_RELOAD_LOADING_ROOT_CAUSE_V1`  
**Modo:** `ROOT_CAUSE_AND_MINIMAL_FIX`  
**Fecha:** `2026-09-22`  
**Estado:** `PARTIAL`

## Página y URL

```text
pageId: 7e79db1f-8282-468d-8cf3-034d7727728c
editor: /pages/7e79db1f-8282-468d-8cf3-034d7727728c/edit?directEditor=magic
```

## Root cause

El bloqueo original `Cargando Power Editor…` quedó corregido previamente: la
ruta dejó de leer `window.location` solo en cliente y ahora usa
`validateSearch` + `Route.useSearch()`.

Después de esa corrección, el Direct Editor sí montó y mostró Hero, colección,
`PageDocumentV1/direct-page` y controles contextuales. El bloqueo posterior a
algunos hard reloads no pudo atribuirse a una llamada concreta porque la
automatización dejó de devolver el árbol accesible durante la espera.

La inspección del código sí aisló una causa de la carga indefinida: el host
esperaba sin timeout tanto `supabase.auth.getSession()` como
`pageService.getOwnPageById()`, manteniendo `loading=true` hasta que una de esas
promesas terminara.

**Clasificación:** `DIRECT_HOST_LOADING_BUG / ROOT_CAUSE_PARTIALLY_ISOLATED`.

No hay evidencia suficiente para declarar un fallo de Supabase, RLS o de la
forma guardada del documento.

## Load trace

```text
mount DirectPageEditorPilotHost
  -> getSession()
  -> getOwnPageById()
  -> readDirectPageEnvelope(template_config)
  -> pageDocumentFromLegacy() o starter
  -> setDocument()
  -> loading=false
```

Evidencia runtime:

- `directEditor=magic` llegó en la URL;
- el Direct host montó después del parche de ruta;
- `PageDocumentV1/direct-page` llegó al canvas;
- el Hero se mostró y pudo editarse;
- save terminó en `Guardado`;
- un reload posterior volvió a mostrar carga sin permitir capturar el siguiente
  estado.

No se obtuvo una respuesta HTTP fallida, excepción de validación ni error de
autenticación visible. El primer `await` fallido queda sin confirmar.

## Saved document forensic

La autoridad continúa siendo:

```text
DirectPageEditorShell
  -> createDirectPageStorageAdapter.save(document)
  -> pageCanonicalService.saveDraft()
  -> pages.template_config
```

El documento runtime observado fue `direct-page`, versión 1, con bloques
validados por `validatePageDocumentV1`. Los tests cubren IDs, visibilidad,
duplicados, reorder y estructura de footer. No se usó SQL manual ni se fabricó
una fila.

## State machine analysis

El host tenía estas condiciones problemáticas:

- `loading` comenzaba en `true`;
- no había timeout para sesión o página;
- una promesa pendiente dejaba la UI cargando indefinidamente;
- el error solo aparecía después de un rechazo.

## Minimal fix applied

Archivo:

```text
src/components/direct-page-editor/DirectPageEditorPilotHost.tsx
```

Se añadió únicamente:

- timeout de 20 segundos para los pasos `session` y `page`;
- etapa visible `session`, `page`, `document` o `ready`;
- timeout convertido en error visible con el paso exacto;
- limpieza del timeout al resolver;
- sin cambios de persistencia, SQL, RLS o arquitectura.

## Reload stability x3

| Intento | Resultado |
|---|---|
| Carga inicial tras el parche de ruta | PASS — Direct Editor, Hero y colección visibles |
| Hard reload 1 | BLOCKED — quedó en carga durante la sesión observable |
| Hard reload 2 | NOT_COMPLETED — la automatización no capturó el DOM de forma estable |
| Hard reload 3 | NOT_COMPLETED |

`DIRECT_EDITOR_RELOAD_STABILITY_PASS` no alcanzado.

## Remaining runtime completion

Pendientes después del gate de reload:

- CTA label + URL;
- edición completa de item de colección;
- upload durable y publicación de imagen;
- mover, duplicar y ocultar con round-trip;
- publicación QA y verificación pública;
- 360/390/430 y teclado.

## Public and mobile

La página QA no se publicó durante esta fase y no se inventó un `public_id`.
La evidencia previa `/pg/GPyZRjg` solo corresponde a la página Business
original.

Mobile queda `ENVIRONMENT_BLOCKED`: la herramienta no permitió controlar
viewport explícito ni emular teclado de forma concluyente.

## Regression

| Verificación | Resultado |
|---|---|
| PageDocument tests | PASS — 4 tests |
| ESLint focalizado | PASS — 0 errores; warning Fast Refresh existente |
| `git diff --check` | PASS; avisos CRLF normales |
| Production build | PASS — client, SSR y Nitro |
| SQL/RLS, Power Editor, Engine V2, Analytics, QR, Catalog, Billing | Sin cambios |

No se persistieron screenshots locales y no se declaran rutas inexistentes.

## Final status

```yaml
status: "PARTIAL"
root_cause: "DIRECT_HOST_LOADING_WITHOUT_TIMEOUT; FIRST_PENDING_ASYNC_STEP_NOT_OBSERVED"
minimal_fix: "STEP-AWARE_TIMEOUT_AND_VISIBLE_ERROR"
success_gate: "CRIPQER_DIRECT_PAGE_EDITOR_RELOAD_AND_RUNTIME_PASS"
success_gate_reached: false
stop_after: true
```
