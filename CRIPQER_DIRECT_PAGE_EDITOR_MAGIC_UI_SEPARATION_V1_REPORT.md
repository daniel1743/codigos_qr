# Cripqer — Direct Page Editor Magic UI Separation V1

**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_UI_SEPARATION_V1`  
**Modo:** `CONTROLLED_IMPLEMENTATION`  
**Fecha:** `2026-09-22`

## IMPLEMENTACIÓN

La ruta `directEditor=magic` ya no renderiza `PremiumTemplateStudio` ni `PowerEditorHost` como superficie visible.

Se implementó:

- `DirectPageEditorPilotHost`: auth, carga de página propia, resolución del contrato canónico y adapters existentes.
- `DirectPageEditorShell`: top bar mínimo con undo/redo, estado de guardado, Guardar y Publicar.
- `TemplateRenderer` en modo edición como renderer de página, sin Studio provider ni chrome de Studio.
- `PageDocumentV1` como estado vivo de edición.
- selección única de bloque/elemento/fondo.
- toolbar flotante de escritorio.
- bottom sheet contextual para móvil.
- inserter directo de bloques existentes: Texto, Servicios, Imagen y Enlaces.
- duplicar, ocultar, eliminar, mover y reordenar bloques desde la selección.
- persistencia mediante `pageCanonicalService` a través del adapter existente.
- upload de assets mediante el bucket durable existente.

No se añadieron Bio, Portfolio, bloques nuevos, métricas, SQL, RLS ni Engine V3.

## FIRST GATE — RUNTIME

Ruta observada:

```text
/pages/165979be-421c-4fdb-9496-4e6c839e24a6/edit?directEditor=magic
```

Resultado observado:

- aparece `DIRECT PAGE EDITOR` como top bar propio;
- la página es el canvas dominante;
- no aparecen `PremiumTemplateStudio`, tabs de Studio, inspector, panel `ESTRUCTURA`, ni controles de zoom del Studio;
- el árbol accesible identifica `PageDocumentV1`;
- la selección de un bloque muestra controles contextuales de bloque y la toolbar flotante `Duplicar`, `Ocultar`, `Cerrar`;
- la ruta carga la página existente y mantiene su composición visible.

**FIRST_GATE:** `PASS`

## ADAPTER CORRECTIONS

- La visibilidad `desktop/tablet/mobile` se conserva en `PageDocumentV1` durante round-trip.
- El alineamiento se conserva desde `layout.align`; el fallback ahora es `left`, no `center`.
- La conversión `collection -> services` está marcada como `PILOT_ONLY` mediante `PAGE_DOCUMENT_ADAPTER_SCOPE`.
- El footer conserva únicamente la autoridad existente `settings.showBranding`; el contenido genérico de footer queda documentado como `PILOT_ONLY_UNSUPPORTED`.

## VERIFICACIÓN DE CÓDIGO

| Verificación | Resultado |
|---|---|
| Focused ESLint | `PASS` |
| PageDocument adapter tests | `PASS — 3 tests` |
| Production build | `PASS` |
| SQL/RLS changes | `NONE` |

## RUNTIME PENDIENTE

No se completaron aún todas las acciones del segundo gate:

- edición específica de hero, texto, CTA y servicio;
- reemplazo de imagen;
- add/move/duplicate/hide con save y hard reload;
- publish y apertura pública `/pg/{public_id}`;
- validación de ausencia de chrome en la vista publicada;
- pruebas visuales completas en 360, 390 y 430 px;
- verificación completa de bottom sheet y teclado.

## ESTADO FINAL

**Status:** `RUNTIME_PENDING`  
**FIRST_GATE:** `CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_UI_SEPARATION_FIRST_GATE_PASS`  
**SUCCESS_GATE:** pendiente del segundo gate runtime  
**STOP_AFTER:** `true`
