# QA — Layout de inspector y catálogo completo

## Defectos reportados

La evidencia reportada mostró controles de precisión colisionando en inspector estrecho y sólo seis paletas visibles dentro del primer viewport, lo que hacía parecer incompleto el catálogo de 24.

## Corrección aplicada

| Superficie | Corrección localizada |
|---|---|
| Métricas de texto | Los grupos de dos medidores usan `repeat(auto-fit, minmax(150px, 1fr))`; si el inspector no tiene ancho suficiente, pasan a una columna. Los medidores declaran `minmax(0, 1fr)` y botones de 30 px para no superponerse. |
| Filas de color | Las filas de dos colores usan columnas adaptativas de mínimo 120 px. |
| Catálogo de paletas | El panel usa scroll vertical propio, `scrollbar-gutter: stable both-edges`, scrollbar visible de 10 px y padding inferior de 52 px. Las categorías no recortan sus filas. |

## Verificación visual

El panel de texto mostró Tamaño y Peso sin colisión de botones o barras. Al abrir Paletas Premium, el inspector mostró las primeras categorías correctamente; al desplazarse sólo el contenedor hasta el final aparecieron las cuatro últimas opciones: **Olive & Gold, Forest Luxe, Desert Sand y Coastal Blue**, seguidas por preview, modos y botones de aplicación. El DOM enumeró 24 botones de paleta, desde Oro Imperial hasta Coastal Blue.

La corrección no modifica la lógica de aplicación de paleta, el canvas, el zoom, header, rail, historial ni el modelo de tarjetas.

## Corrección residual de Imagen/Media

El problema residual del banner no era un valor de imagen ni una fusión aplicada: el inspector montaba **dos superficies hermanas** —Fusión y Media— en lugar de un único panel raíz. Se sustituyó ese montaje por un solo `.ep-panel` que contiene ambas secciones en flujo vertical. Media se usa en modo embebido únicamente dentro de ese contenedor; los bloques perfil e imagen conservan su panel normal.

Además, los campos, etiquetas y selectores del inspector ahora declaran `min-width: 0` y `max-width: 100%`. La medida es local al inspector y evita que un selector se proyecte hacia la derecha sin cambiar el canvas, zoom, cabecera, rail, datos o efectos.

La comprobación visual del preview aislado con el banner seleccionado mostró la secuencia continua **Fusión → Subir imagen → URL → Recorte/Radio → Posición → Altura → Overlay**, con una sola barra de desplazamiento del inspector y sin capas superpuestas. La comprobación posterior de Paletas Premium enumeró los 24 botones, de **Oro Imperial** a **Coastal Blue**, dentro del panel desplazable. La suite directa `./node_modules/.bin/vitest run` concluyó con **8 archivos y 61 pruebas correctas**. No se ejecutó un empaquetado completo durante este incremento.
