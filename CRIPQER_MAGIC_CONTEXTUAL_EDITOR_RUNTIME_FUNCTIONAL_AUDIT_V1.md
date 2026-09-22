# Cripqer — Magic Contextual Editor Runtime Functional Audit V1

**Modo:** `READ_ONLY_RUNTIME_FUNCTIONAL_AUDIT`  
**Fecha:** `2026-09-22`  
**Task:** `CRIPQER_MAGIC_CONTEXTUAL_EDITOR_RUNTIME_FUNCTIONAL_AUDIT_V1`

## Alcance y evidencia

Auditoría sin cambios de código ni correcciones. Se inspeccionaron las rutas actuales de toolbar, popovers, `onInlineEdit`, `patchBlockField`, `templateReducer`, historial y storage. La evidencia runtime previa confirmó selección real de título/imagen, montaje de sus toolbars y aplicación de `Negrita`; la sesión de auditoría completa no pudo ejecutar la secuencia save/reload porque la automatización de Chrome no consiguió navegar una instancia local estable (`localhost:8081` quedó cargando; la instancia limpia de Vite terminó en `8082`, pero la navegación CDP expiró).

Por regla de esta auditoría, un control no se marca `FULLY_FUNCTIONAL` sin observar también persistencia y reload reales.

## Matriz

| Target      | Control                                                     |                                      Visible |                                     Toolbar estable | Interaction works |                          Canvas changes |                 Canonical state changes |              Undo/Redo |    Save/Reload | Status                   | Root cause if failed                                                                                                                                      |
| ----------- | ----------------------------------------------------------- | -------------------------------------------: | --------------------------------------------------: | ----------------: | --------------------------------------: | --------------------------------------: | ---------------------: | -------------: | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title       | Inline text, fuente, tamaño, color, peso, italic, alignment |                                           Sí |                                        Sí observado |           Parcial | Sí por código; italic/Negrita observado |                   Sí por `onInlineEdit` | No auditado en runtime | No verificable | `PARTIAL`                | Falta la secuencia runtime completa; la paleta tiene 8 presets, no 10, y no existe `Más…` de color hacia Inspector.                                       |
| description | Inline text, fuente, tamaño, color, weight, alignment       |                                           Sí |                         Sí por misma implementación |           Parcial |                           Sí por código |          Sí por `descriptionTypography` | No auditado en runtime | No verificable | `PARTIAL`                | Sin evidencia runtime completa; `Más` solo restablece formato, no hace handoff al Inspector.                                                              |
| price       | Valor, fuente, tamaño, color, peso, alignment               |                                           Sí |                         Sí por misma implementación |           Parcial |                           Sí por código |          Sí por `typography` compartido | No auditado en runtime | No verificable | `PARTIAL`                | El precio comparte `product.typography`; no existe autoridad independiente `priceTypography`. El reporte anterior de color no puede cerrarse sin runtime. |
| image       | Cambiar imagen / popover                                    |                                           Sí |                                        Sí observado |           Parcial |                           No verificado |                Handler de upload existe | No auditado en runtime | No verificable | `PARTIAL`                | `Cambiar imagen` abre un popover, pero `Mis imágenes` está deshabilitado y no existe selector/listado canónico conectado.                                 |
| image       | Subir foto / seleccionar asset                              |                                           Sí |                                      No verificable |    No verificable |                          No verificable |          Adapter upload + patch existen | No auditado en runtime | No verificable | `PARTIAL`                | Requiere interacción de file chooser y confirmación de persistencia; no se pudo ejecutar en la sesión bloqueada.                                          |
| image       | Quitar / Undo Quitar                                        |                                           Sí |                                       Sí por código |    No verificable |                          No verificable |                Sí por `patchBlockField` | No auditado en runtime | No verificable | `PARTIAL`                | La ruta canónica existe, pero falta evidencia runtime.                                                                                                    |
| image       | Recortar / Posición                                         |                                           Sí |                                                  Sí |                No |                                      No |                                      No |                     No |             No | `INTENTIONALLY_DISABLED` | Autoridad ImagePipeline no disponible; coincide con el contrato de fase.                                                                                  |
| cta         | Label, URL, color, style preset, alignment                  |                                           Sí | Sí por implementación y evidencia previa de toolbar |           Parcial |                           Sí por código | Sí por `ctaLabel`, `ctaUrl`, `ctaStyle` | No auditado en runtime | No verificable | `PARTIAL`                | Inputs dependen de blur/Apply; no se pudo validar interacción completa ni reload.                                                                         |
| card        | Fondo, borde, radio                                         |                                           Sí |                               Sí por implementación |           Parcial |                           Sí por código |                    Sí por `block.style` | No auditado en runtime | No verificable | `PARTIAL`                | Falta validación real de popover, historial y persistencia.                                                                                               |
| card        | Duplicar / Mover / Ver detalle                              |                                           Sí |                                                  Sí |                No |                                      No |                                      No |                     No |             No | `INTENTIONALLY_DISABLED` | Fase 3 y autoridad de detalle aún no iniciadas.                                                                                                           |
| card        | Eliminar / Más                                              | No como acciones funcionales de esta toolbar |                                                 N/A |                No |                                      No |                                      No |                     No |             No | `PARTIAL`                | No están expuestos funcionalmente en la toolbar Magic; las acciones legacy/Inspector quedan fuera de este overlay.                                        |

## Floating UI / estabilidad

- El popover usa un `ref` que contiene su botón y contenido; el listener global `pointerdown` solo cierra al pulsar fuera de ese ref.
- La toolbar está en portal fijo y no usa un handler de canvas propio que la cierre.
- La selección de targets usa `blockId`, `itemId` y `field` existentes.
- No se observó durante la evidencia disponible un cierre confirmado al pulsar dentro de un popover; tampoco fue posible completar el recorrido de todos los popovers a 100%, 65% y 50%.

## Color UX

Estado auditado: `PARTIAL`.

- La palette rápida actual tiene 8 swatches, no los 10 solicitados.
- No existe acción `Más…` que enfoque una sección de color avanzada del Inspector.
- Los swatches sí escriben por `onInlineEdit` hacia `TypographyOverride` o `CTAStyle`, pero la persistencia runtime no quedó verificada.

## Severidad

- `P0`: 0 observado.
- `P1`: 0 confirmado; queda riesgo no cerrado para Cambiar imagen por falta de runtime.
- `P2`: `Cambiar imagen` sin Mis imágenes conectado; ausencia de handoff de color; acciones card no expuestas.
- `P3`: palette de 8 en vez de 10 y ausencia de `Más…` contextual.

## Resumen

| Estado                   | Cantidad de filas |
| ------------------------ | ----------------: |
| `FULLY_FUNCTIONAL`       |                 0 |
| `PARTIAL`                |                 9 |
| `VISUAL_ONLY`            |                 0 |
| `BROKEN`                 |      0 confirmado |
| `INTENTIONALLY_DISABLED` |                 2 |

**Estado final:** `AUDIT_COMPLETE_FIX_PLAN_PENDING`  
**No se realizaron fixes.**  
**STOP_AFTER:** `true`
