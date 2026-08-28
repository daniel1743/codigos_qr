# Implementación — Tarjetas enriquecidas y scroll

## Alcance realizado

La extensión se limita al Power Editor aislado. No altera QR, rutas públicas, editor heredado, navegación, Supabase, templates maestros ni publicación.

| Capacidad | Implementación |
|---|---|
| Tarjeta nueva | `Agregar tarjeta` crea una tarjeta con texto completo, CTA y apariencia editable. |
| Imagen opcional | El interruptor `Agregar imagen` habilita una región fija: **75% texto / 25% imagen**. |
| Posición de imagen | Sólo se admiten **Izquierda** o **Derecha**. El modelo normaliza cualquier valor ajeno a `right`, por lo que no existe estado centrado. |
| Fuentes de imagen | URL, subida local máxima de 2,5 MB y biblioteca de medios ya presentes en la plantilla cuando hay imágenes disponibles. No se consulta almacenamiento remoto. |
| Texto de tarjeta | Título, descripción y CTA tienen, cada uno, color, fuente, tamaño, peso/negrita, cursiva, alineación, espaciado, altura de línea, contorno, grosor y color de contorno. |
| Contenedor | Fondo, borde visible, color y grosor de borde, radio, sombra y padding se controlan por tarjeta. |
| Compatibilidad | Una tarjeta anterior que tenía `imageUrl` y no tenía `imageEnabled` conserva su imagen visible; se asigna lado derecho de forma determinista. |
| Scroll | El rail de escritorio tiene scroll vertical propio. El inspector usa una fila flexible `minmax(0, 1fr)` y su panel interior conserva scroll vertical independiente. El canvas y header no se desplazan. |

## Validación técnica

La suite `richCards.test.ts` pasó con cuatro pruebas: creación, posiciones permitidas, actualización inmutable y compatibilidad con tarjetas anteriores. El chequeo de tipos no mostró diagnósticos vinculados a `richCards` ni a `PremiumCards*`.

La validación posterior amplió la suite a cinco pruebas y confirmó el flujo real del interruptor: se puede activar `Agregar imagen` **antes** de elegir un archivo. Al activarse aparecen URL, `Subir imagen` y un selector con sólo `Izquierda` y `Derecha`; no existe una opción centrada.

La QA visual confirmó además que `Agregar tarjeta` abre el inspector enriquecido completo. El inspector alcanzó los controles inferiores mediante su propio scroll, mientras el canvas, la barra superior y el rail de herramientas permanecieron estáticos. La posición se cambió de `Derecha` a `Izquierda` mediante el selector y el único conjunto de opciones disponible siguió siendo esas dos posiciones.

## Límites deliberados

La subida usa data URL temporal, como el control existente del candidato. Una biblioteca remota compartida requeriría almacenamiento real, autorización y una política de archivos; no se introdujo para no ampliar el alcance ni escribir en Supabase.

El módulo de vídeo no se modificó. Su extensión debe usar el mismo principio —contenido, poster, estilo de card y enlace reproducible— como tarea posterior separada, una vez validada la tarjeta.
