# Comparación preliminar — Especificación maestra de edición contextual

## Conclusión ejecutiva

La especificación propone una **arquitectura rectora** para evolucionar el editor de forma incremental, no una modificación puntual. Su regla esencial es: un preview interactivo, una selección estable de elemento o subelemento y **un inspector contextual único** que expone únicamente los acordeones compatibles con esa selección.

El Power Editor aislado ya contiene varios resultados compatibles con esta dirección: canvas separado, zoom sólo sobre template, rail e inspector fijos, historial inmutable, paletas reversibles, tarjeta enriquecida y controles tipográficos. Sin embargo, el patrón aún no es un framework contextual completo: la tarjeta usa un editor por cada ítem dentro del inspector y no dispone todavía de selección granular de título, media y CTA desde el canvas.

## Comparación de cobertura

| Área del documento rector | Estado actual | Observación |
|---|---|---|
| Preview, canvas y zoom aislado | **Cubierto** | El zoom sólo escala `.ep-canvas-scale`; header, rail e inspector permanecen fijos. |
| Inspector contextual único por bloque | **Parcial** | Se abre una superficie contextual por tipo de bloque, pero el bloque de tarjetas lista los editores de todas las tarjetas. |
| Selección estable por elemento | **Parcial** | Los bloques tienen `id` estable; falta `subTarget` para seleccionar título, descripción, imagen o CTA dentro de una tarjeta. |
| Acordeones compactos | **Parcial** | Existen secciones desplegables, aunque varias quedan abiertas y la distribución no es todavía uniforme por capacidad. |
| Estilo global + override individual | **Parcial** | Enlaces ya admiten aplicación global/individual; tarjetas aún guardan valores por ítem sin un contrato explícito `inherit/custom`. |
| Presets | **Parcial** | Hay variantes de enlaces, layouts y 24 paletas; faltan presets coherentes específicos de tarjeta, texto y vídeo. |
| Tarjeta normal | **Parcial avanzado** | Contenido, imagen opcional 75/25 izquierda/derecha, CTA, URL, tipografía, borde y sombra están disponibles. Faltan modos superior/inferior/fondo, crop, object-fit, opacidad, hover configurable y destacado. |
| Títulos y textos | **Parcial avanzado** | Fuente, color, peso, cursiva, alineación, tamaño, altura, espaciado, contorno y sombra están disponibles. Faltan presets de texto, reset por sección y overrides responsive granulares. |
| Botones | **Parcial avanzado** | Colores, borde, grosor, variantes, tipografía y paletas están disponibles. Faltan iconos, estados hover/active/focus configurables y un contrato común con tarjetas/vídeo. |
| Vídeo | **Parcial** | Existe bloque de vídeo, pero todavía no se ha llevado al patrón rector de poster, rendimiento, overlay y controles compactos. |
| Partículas y efectos | **Parcial** | La biblioteca y sus controles están reunidos en Efectos; aún no comparten un inspector unificado por capacidad. |
| Responsive, accesibilidad y persistencia reales | **Parcial** | Hay responsive de bloque, foco y Undo/Redo. Falta QA exhaustiva de breakpoints, estados, guardado/remoto/recarga con sesión real y build completo tras detener el preview temporal. |

## Orden seguro que impone el documento

La secuencia correcta no es reestructurar todo simultáneamente. Primero debe completarse el patrón base del inspector contextual. Después, **una tarjeta normal** debe alcanzar cumplimiento total y sólo entonces se extraen controles reutilizables para vídeo, botones, textos y efectos.

En el estado actual, la siguiente etapa segura no es el vídeo ni una refactorización global. Es convertir el módulo de tarjeta enriquecida en la primera referencia del inspector contextual: una tarjeta seleccionada, subselección de título/media/CTA, acordeones por capacidad, un preset breve, esencial y avanzado, y un contrato explícito de herencia. Esto resolvería el scroll repetitivo sin reabrir los módulos ya estabilizados.

## Riesgos que se deben evitar

No se deben añadir todos los controles a la vez ni mover módulos existentes sin una capa de compatibilidad. Los riesgos principales son romper `PageConfig` V5/V6, duplicar controles de tipografía/borde, perder Undo/Redo, hacer que el clic de preview navegue cuando debería seleccionar y reintroducir scroll global o zoom sobre panels.

## Recomendación preliminar

El documento es coherente y debe conservarse como guía. Su aplicación debería autorizarse por etapas. La primera propuesta posterior sería una **Fase A de inspector contextual de tarjeta**, sin tocar vídeo, botones existentes, rutas, QR, publicación ni Supabase. Antes de comenzar esa fase, deben fijarse criterios de aceptación de tarjeta y completar una base de QA responsive/persistencia.
