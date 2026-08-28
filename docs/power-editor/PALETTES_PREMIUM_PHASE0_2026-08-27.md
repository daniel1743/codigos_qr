# Paletas Premium — Fase 0 de alcance y contrato

**Estado:** especificación recibida y cuantificada; implementación aislada autorizada.
**Ámbito:** exclusivamente el paquete del Power Editor en `codigos_qr-power-editor-isolated`.

## Catálogo de entrada verificado

La especificación recibida define **24 paletas**, el mínimo solicitado para la primera versión del catálogo. La distribución se conserva como categorías de interfaz, no como clasificación automática de estilos.

| Categoría | Paletas |
|---|---:|
| Lujo y elegancia | 6 |
| Editorial y minimalista | 6 |
| Elegante y sofisticada | 4 |
| Moderna y creativa | 4 |
| Natural y premium | 4 |
| **Total** | **24** |

## Contrato funcional

Cada paleta será un sistema semántico con roles explícitos: fondos, superficies, texto principal/secundario, títulos, acentos, botones, bordes, contornos, iconos, sombras y gradiente. La aplicación nunca reasignará colores al azar.

Una aplicación se ejecutará como una única transición inmutable de `PageConfig`, por lo que el historial existente de Undo/Redo podrá deshacerla o rehacerla. La selección de paleta y sus ajustes se serializarán dentro de `page_config`; este incremento no requiere una tabla, política o escritura nueva en Supabase.

## Límites preservados

No se modificarán `/editor`, QR, `public_id`, slug, rutas públicas, renderer público, templates maestros, publicación, sincronización remota, editor heredado, GitHub ni producción. La herramienta se expondrá exclusivamente en los previews aislados del Power Editor.

## Implementación prevista

| Área | Decisión |
|---|---|
| Modelo | `premiumPalettes.ts` exportará las 24 definiciones tipadas, contraste y aplicación semántica parcial/completa. |
| Estado | `PageConfig` conservará una referencia a la paleta aplicada y overrides manuales sin perder el estado previo. |
| Interfaz | `Paletas Premium` aparecerá entre Color y Formato. El inspector tendrá tarjetas, roles visibles, modo de aplicación, selección de ámbitos y preview reversible. |
| Aplicación | Modos: completa, inteligente, fondos, tipografía, acentos, bordes/contornos y selección manual de ámbitos. |
| Seguridad | Los cambios sólo actúan sobre `page_config` en memoria. No se escriben tablas ni se publica contenido. |
| Validación | Pruebas de roles, contraste, no mutación, aplicación parcial e historial; QA visual de selección, preview, apply, undo/redo y persistencia local del preview. |

## Criterio de no maqueta

Las tarjetas no serán botones decorativos. Elegir una tarjeta actualizará una vista temporal; `Aplicar` realizará una transición real sobre roles permitidos, y `Restablecer` recuperará el estado anterior a la vista temporal sin alterar manualmente colores no seleccionados.
