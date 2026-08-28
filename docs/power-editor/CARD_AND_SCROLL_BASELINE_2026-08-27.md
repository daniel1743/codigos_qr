# Línea base — Tarjetas y scroll

## Clasificación antes de cambios

| Solicitud | Estado actual | Base reutilizable | Falta exacta | Riesgo |
|---|---|---|---|---|
| Crear tarjeta | Parcialmente implementado | `CardsPanel` agrega título, descripción, CTA, URL e imagen. | Estilo tipográfico, alineación por ítem y layout de imagen 75/25. | Bajo. |
| Subir imagen | Parcialmente implementado | `ItemImageControl` admite URL o fichero de imagen de hasta 2,5 MB y la convierte a data URL local. | Biblioteca de medios real y almacenamiento remoto. | Medio; excluido de este incremento. |
| Imagen dentro de tarjeta | Parcialmente implementado | El renderer usa imagen como fondo con overlay. | Imagen como región independiente 25%, izquierda o derecha; no centrada. | Bajo. |
| Estilo de título, texto y CTA de tarjeta | No implementado por ítem | `TextTypographyPanel` y controles de enlace aportan patrones reutilizables. | Props y panel delimitados por tarjeta, además de renderer de esos estilos. | Bajo. |
| Borde, radio y sombra de tarjeta | Parcialmente implementado | `BlockVisualStyle.border`/`shadow` y `SurfaceControls` existen al nivel de bloque. | Controles explícitos, visibles y aplicables a cada tarjeta. | Bajo. |
| Alineación de textos de tarjeta | No implementado por ítem | Renderer de texto global admite `textAlign`. | Selector izquierda/centro/derecha por tarjeta y aplicación a título, descripción y CTA. | Bajo. |
| Scroll de herramientas en escritorio | No implementado | El rail es `flex-column` y posee acciones inferiores. | `overflow-y:auto` y `min-height:0`; hoy puede quedar cortado. | Bajo. |
| Scroll del inspector en escritorio | Parcialmente implementado | El panel interior tiene `overflow:auto`. | El contenedor necesita una fila flexible `minmax(0,1fr)` para impedir que el scroll quede bloqueado al final. | Bajo. |

## Decisión de alcance

Se implementará la tarjeta enriquecida como extensión compatible de `cards.items[]`. La imagen seguirá utilizando el control de URL/subida local existente; no se inventará biblioteca remota ni se contactará almacenamiento. Se añadirán sólo los valores visuales necesarios y los renderer/CSS de tarjeta. La corrección de scroll se limitará a reglas CSS de shell y no altera canvas, header ni navegación.

La refactorización externa adjunta se mantiene en auditoría: no autoriza un cambio general ni se aplicará durante este incremento.
