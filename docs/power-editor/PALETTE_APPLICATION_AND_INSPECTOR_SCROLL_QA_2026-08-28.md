# QA — Aplicación de paletas y scroll del inspector

## Aplicación visible de Paletas Premium

El badge no era una escritura falsa: `page.palette.selectedId` ya se actualizaba. El fallo real era de cobertura visual: la función aplicaba colores a `theme`, `background` y props superiores, pero las tarjetas enriquecidas usan valores anidados en `items[]`. Por eso su superficie, título, descripción, CTA y borde podían permanecer visualmente sin cambios.

La aplicación de paleta ahora recorre los items de cada bloque `cards` y aplica únicamente los ámbitos elegidos:

| Ámbito | Propiedades de tarjeta actualizadas |
|---|---|
| Superficies | `items[].background` |
| Bordes | `items[].borderColor` |
| Títulos | `items[].titleStyle.color` |
| Tipografía | `items[].descriptionStyle.color` |
| Texto de botón | `items[].ctaStyle.color` |
| Contornos | `textStrokeColor` de título, descripción y CTA |

La prueba nueva confirma aplicación completa a una tarjeta enriquecida y que el `PageConfig` original no se muta. Además se corrigió el lenguaje de interfaz: una selección no aplicada se muestra como **Vista previa**; el badge **Aplicada** sólo aparece cuando esa paleta está persistida en `page.palette.selectedId`.

En QA, Ivory Studio se mostró como `Activa: Ivory Studio`, con badge `Aplicada`, canvas claro y tarjeta con superficie/colores correspondientes. La suite de paletas pasó con cinco pruebas.

## Scroll independiente del inspector

La medición posterior mostró que el contenido del inspector de tarjetas presenta `clientHeight = 769`, `scrollHeight = 2184` y `overflowY = auto`; por tanto el contenido largo tiene scroll independiente. Header, canvas y rail no se desplazan con el inspector.
