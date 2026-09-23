# Cripqer — Direct Page Editor QA Mount and Runtime Completion V1

**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_QA_MOUNT_BLOCKER_AND_RUNTIME_COMPLETION_V1`  
**Modo:** `ROOT_CAUSE_THEN_VERIFY`  
**Fecha:** `2026-09-22`  
**Estado:** `PARTIAL`

## QA PAGE

```text
title: Direct Editor QA Runtime
type: services
pageId: 7e79db1f-8282-468d-8cf3-034d7727728c
```

## ROOT CAUSE

**Clasificación:** `ROUTE_FLAG_MISSING` en la renderización SSR inicial, no un
fallo confirmado de Supabase.

La URL observada estaba correctamente formada:

```text
http://localhost:8081/pages/7e79db1f-8282-468d-8cf3-034d7727728c/edit?directEditor=magic
```

Sin embargo, `pages.$pageId.edit.tsx` calculaba el piloto con
`typeof window !== "undefined"` y `window.location.search`. En la primera
renderización SSR esa condición era falsa y el componente montaba
`PowerEditorHost`, cuyo estado visible es `Cargando Power Editor…`.

La condición correcta del cliente existía, pero la superficie inicial no era
determinista entre SSR y cliente.

## COMPONENTE ANTES/DESPUÉS

Antes:

```text
SSR -> PowerEditorHost -> "Cargando Power Editor…"
cliente -> lectura imperativa de window.location.search
```

Después:

```text
Route.validateSearch -> Route.useSearch()
directEditor === "magic" -> DirectPageEditorPilotHost
```

## MINIMAL FIX APPLIED

Archivo:

```text
src/routes/pages.$pageId.edit.tsx
```

Cambio aplicado:

- se declaró `validateSearch` para `directEditor`;
- se reemplazó la lectura de `window.location.search` por `Route.useSearch()`;
- la ruta legacy `/pages/{pageId}/edit` permanece intacta;
- no se hizo global el Direct Editor.

## DIRECT MOUNT GATE

URL funcional observada:

```text
/pages/7e79db1f-8282-468d-8cf3-034d7727728c/edit?directEditor=magic
```

Resultado: `QA_DIRECT_EDITOR_MOUNT_PASS`.

Se observó:

- `DIRECT PAGE EDITOR`;
- `PageDocumentV1/direct-page`;
- bloque Hero real;
- bloques de colección y texto;
- controles contextuales `HERO`, `Subir`, `Bajar`, `Duplicar`, `Ocultar`;
- ausencia de tabs, inspector, estructura y chrome visible de Studio.

El texto `Cargando Power Editor…` desapareció después del parche. La primera
carga posterior terminó montando `Cargando Direct Page Editor…` y luego el
shell Direct.

## RUNTIME COMPLETION MATRIX

| Prueba | Estado | Evidencia |
|---|---|---|
| Hero existe | PASS | El starter QA mostró un bloque Hero. |
| Seleccionar Hero | PASS | Apareció la etiqueta `HERO` y toolbar contextual. |
| Editar Hero title | PASS | `Direct Editor QA Runtime` cambió a `QA Hero Runtime`. |
| Guardar Hero | PASS | Estado `Guardando…` y luego `Guardado`. |
| CTA editor label/URL | NOT_VERIFIED | La carga posterior quedó intermitente antes de completar esta prueba. |
| Collection item title/description/CTA | NOT_VERIFIED | No se completó el ciclo tras el reload intermitente. |
| Imagen durable | NOT_VERIFIED | No se subió archivo real. |
| Mover bloque | NOT_VERIFIED | No se completó el round-trip. |
| Duplicar bloque | NOT_VERIFIED | No se completó el round-trip. |
| Ocultar bloque | NOT_VERIFIED | No se completó el round-trip público. |
| IDs estables | CODE PASS / RUNTIME PENDING | Tests y contrato cubren IDs; falta ciclo runtime completo. |
| Hard reload Hero | BLOCKED | Después del reload el host quedó en `Cargando Direct Page Editor…` sin resolver en la sesión observada. |
| Public QA page | NOT_VERIFIED | La publicación dedicada no se completó. |
| 360 px | ENVIRONMENT_BLOCKED | No se pudo aplicar viewport explícito. |
| 390 px | ENVIRONMENT_BLOCKED | No se pudo aplicar viewport explícito. |
| 430 px | ENVIRONMENT_BLOCKED | No se pudo aplicar viewport explícito. |
| Keyboard | ENVIRONMENT_BLOCKED | No se obtuvo emulación móvil/teclado concluyente. |
| Legacy | NOT_AVAILABLE_FOR_RUNTIME_TEST | No se encontró otra página propia legacy genuina. |

## PUBLIC VERIFICATION

La evidencia pública anterior `/pg/GPyZRjg` continúa válida para texto,
ausencia de chrome de editor y CTA como anchor con `href`. La página QA no
alcanzó publicación durante esta fase, por lo que no se inventa una URL pública
ni un `public_id` QA.

## VISUAL VERIFICATION

El runtime QA montado mostró Hero premium, tarjetas/colecciones independientes,
CTA alto y redondeado, spacing y canvas Direct. No se generaron screenshots
persistidas como archivos locales; por ello no se declaran rutas inexistentes.

La matriz móvil queda pendiente.

## REGRESSION

| Verificación | Resultado |
|---|---|
| PageDocument tests | PASS — 4 tests |
| Focused ESLint | PASS — 0 errores; warning Fast Refresh existente |
| Production build | PASS — client, SSR y Nitro |
| SQL/RLS | Sin cambios |
| Power Editor/PremiumTemplateStudio | Sin cambios de código |
| Engine V2 | Sin cambios |
| Analytics | Sin cambios |
| QR/public_id | Sin cambios |
| Catalog/Billing | Sin cambios |

## SCREENSHOTS

No hay rutas locales de screenshots persistidas. Se observaron capturas en la
sesión interactiva, pero la herramienta no produjo un archivo local verificable.

## FILES MODIFIED

```text
src/routes/pages.$pageId.edit.tsx
CRIPQER_DIRECT_PAGE_EDITOR_QA_MOUNT_AND_RUNTIME_COMPLETION_V1_REPORT.md
```

No se modificó SQL, RLS, backend, Power Editor ni la página Business original.

## FINAL STATUS

```yaml
status: "PARTIAL"
root_cause: "ROUTE_FLAG_MISSING_ON_SSR_INITIAL_RENDER"
mount_gate: "QA_DIRECT_EDITOR_MOUNT_PASS"
success_gate: "CRIPQER_DIRECT_PAGE_EDITOR_QA_RUNTIME_COMPLETION_PASS"
success_gate_reached: false
remaining:
  - "CTA editor round-trip"
  - "collection item complete round-trip"
  - "durable image round-trip"
  - "move/duplicate/hide public round-trip"
  - "reload completion after intermittent Direct host loading"
  - "public QA page"
  - "360/390/430 and keyboard"
stop_after: true
```
