# Cripqer — Direct Page Editor Reload Async Forensics V1

**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_RELOAD_ASYNC_FORENSICS_V1`  
**Modo:** `STRICT_RUNTIME_FORENSICS_THEN_MINIMAL_FIX`  
**Fecha:** `2026-09-22`  
**Estado:** `PARTIAL`

## Root cause classification

La causa SSR anterior está corregida: `directEditor=magic` se lee mediante
`Route.useSearch()` y el Direct Editor monta correctamente.

La causa exacta del bloqueo posterior a ciertos hard reloads todavía no puede
clasificarse como `SESSION_PROMISE_STALL` o `PAGE_REQUEST_STALL` porque la
automatización dejó de devolver el DOM antes de exponer el resultado del trace.

La causa de la carga indefinida sí quedó aislada en el state machine: el host
no tenía timeout ni etapa observable mientras esperaba `getSession()` o
`getOwnPageById()`.

## Trace instrumentation

Archivo instrumentado:

```text
src/components/direct-page-editor/DirectPageEditorPilotHost.tsx
```

Se añadieron eventos de consola con `instanceId`, `pageId`, etapa y milisegundos:

```text
HOST_MOUNT
LOAD_EFFECT_START
SESSION_START / SESSION_RESOLVE / SESSION_ERROR / SESSION_TIMEOUT
PAGE_START / PAGE_RESOLVE / PAGE_ERROR / PAGE_TIMEOUT
DOCUMENT_START
DIRECT_ENVELOPE_FOUND / LEGACY_FALLBACK_USED / STARTER_FALLBACK_USED
DOCUMENT_VALID
SET_DOCUMENT / SET_READY
LOAD_EFFECT_CLEANUP / HOST_UNMOUNT
```

El DOM expone ahora:

```text
data-direct-load-stage="session|page|document|ready"
data-direct-load-status="pending|ready|error"
data-direct-load-instance="..."
```

Esto permite identificar el primer paso pendiente incluso si el árbol
accesible vuelve a fallar.

## Runtime evidence

URL exacta:

```text
/pages/7e79db1f-8282-468d-8cf3-034d7727728c/edit?directEditor=magic
```

La carga inicial observada después de la corrección de ruta alcanzó:

- `DIRECT PAGE EDITOR`;
- `PageDocumentV1/direct-page`;
- Hero visible;
- edición del título del Hero;
- estado `Guardado`.

Durante los intentos de hard reload la herramienta dejó de capturar el árbol
DOM/AX antes de obtener los eventos de consola o los atributos de diagnóstico.
No se obtuvo una excepción, respuesta HTTP fallida ni error de validación que
permita atribuir el bloqueo a Auth, RLS o al documento.

## Five-run table

| Run | Session ms | Page ms | Document ms | Ready total ms | Result | Last event |
|---|---:|---:|---:|---:|---|---|
| Initial mount | n/a | n/a | n/a | n/a | PASS | `SET_READY` observado por UI |
| Reload 1 | no capturado | no capturado | no capturado | no capturado | BLOCKED | pantalla de carga Direct |
| Reload 2 | no capturado | no capturado | no capturado | no capturado | NOT_COMPLETED | captura DOM interrumpida |
| Reload 3 | no capturado | no capturado | no capturado | no capturado | NOT_COMPLETED | captura DOM interrumpida |
| Reload 4 | no ejecutado | no ejecutado | no ejecutado | no ejecutado | NOT_COMPLETED | — |
| Reload 5 | no ejecutado | no ejecutado | no ejecutado | no ejecutado | NOT_COMPLETED | — |

`DIRECT_EDITOR_RELOAD_STABILITY_5X_PASS` no alcanzado.

## Minimal fix applied

Se mantuvo el parche previo de route search y se añadió únicamente protección
diagnóstica en el Direct host:

- timeout de 20 segundos para sesión y página;
- error visible con el paso exacto;
- etapa de carga visible;
- trace de lifecycle con instancia única;
- limpieza del timeout.

No se cambiaron Auth, Storage, pageService, persistencia, SQL, RLS ni rutas
públicas.

Este cambio no se declara como corrección de la causa externa; es una mejora
de observabilidad y evita el spinner infinito mientras se obtiene la evidencia
definitiva.

## Document and lifecycle findings

- La ruta utiliza `PageDocumentV1` cuando el envelope directo es válido.
- La persistencia continúa escribiendo mediante `pageCanonicalService`.
- El documento se validó en runtime antes del reload inicial.
- No se observó corrupción del Hero editado.
- El efecto tiene guardia `active` y cleanup; no se añadió un retry loop.
- La instancia y los eventos permiten distinguir StrictMode/unmount de una
  promesa pendiente en ejecuciones posteriores.

## Remaining runtime work

No se continúa con CTA, colección, imagen, estructura ni publicación QA hasta
obtener el primer evento async fallido y completar cinco recargas estables.

Mobile queda diferido como exige la tarea; viewport y teclado permanecen
`ENVIRONMENT_BLOCKED`.

## Regression

| Verificación | Resultado |
|---|---|
| PageDocument tests | PASS — 4 tests |
| ESLint focalizado | PASS — 0 errores; warning Fast Refresh existente |
| `git diff --check` | PASS; avisos CRLF normales |
| Production build | PASS — client, SSR y Nitro |
| SQL/RLS | Sin cambios |
| Power Editor/PremiumTemplateStudio | Sin cambios |
| Engine V2, Analytics, QR, Catalog, Billing | Sin cambios |

## Final status

```yaml
status: "PARTIAL"
root_cause: "DIRECT_HOST_ASYNC_STAGE_NOT_DETERMINED; INFINITE_LOADING_STATE_MITIGATED"
trace_added: true
minimal_fix: "STEP_TRACE_DOM_DIAGNOSTICS_AND_BOUNDED_TIMEOUT"
success_gate: "CRIPQER_DIRECT_PAGE_EDITOR_RELOAD_ASYNC_FORENSICS_PASS"
success_gate_reached: false
stop_after: true
```
