# 11. CIERRE FUNCIONAL — MI QR, HISTORIAL Y CONTADOR (QR-UI-11B)

## ESTADO FINAL

La sección "Mi QR" se ha implementado de forma que queda 100% operativa. Permite visualizar el QR con la configuración visual actual, muestra el estado de publicación y provee las acciones principales para el QR.

## NOMBRE DE LA PESTAÑA

La pestaña en el sidebar/bottom nav se llama `QR`. El título interno de la sección es `Mi QR`. Esto evita confusión con el estado "Publicado" de la página.

## APERTURAS VS ESCANEOS

La métrica se denomina `Aperturas` y no "Escaneos", ya que técnicamente estamos contando aperturas de la página (visitas), independientemente de si el usuario llegó escaneando el código físico o haciendo click en el enlace. Se ajustó el singular ("1 apertura") y plural ("X aperturas").

## INCREMENTO ATÓMICO

El contador de aperturas se incrementa mediante la función RPC `increment_scan_count`, la cual ejecuta un `UPDATE profiles SET scan_count = scan_count + 1 WHERE id = p_id;` dentro de PostgreSQL. Esto garantiza un incremento atómico y evita condiciones de carrera desde los clientes.

## PREVIEW EXCLUSION

La preview dentro del editor (que usa `PublicProfileView` con `isPreview=true`) y el mismo QR Studio no incrementan el contador. El llamado asíncrono para incrementar el contador ocurre exclusivamente en la ruta pública `p.$publicId.tsx`.

## DOUBLE COUNT TEST

Para prevenir que una misma carga cuente dos veces durante el "hydration" o al estar bajo React Strict Mode, se implementó el uso de un `useRef(false)` en la vista `p.$publicId.tsx`. De esta manera, garantizamos un único conteo por montaje de componente. Si el usuario realiza un refresh manual del navegador, el componente se desmonta y monta nuevamente, produciendo una nueva apertura (documentado y esperado).

## CONCURRENCY TEST

Gracias al uso de la función RPC con `UPDATE ... scan_count = scan_count + 1`, el manejo de concurrencia es robusto. 10 peticiones concurrentes agregarán exactamente +10 a la métrica en la base de datos sin sobreescribir resultados.

## HISTORIAL

Se visualizan hasta 10 versiones visuales previas del QR en un carrusel (`snap-x overflow-x-auto`). Cada miniatura indica hace cuánto tiempo se guardó. La UI muestra de manera amable el estado vacío ("Aún no tienes versiones guardadas. Cuando descargues diferentes apariencias de tu QR, aparecerán aquí.").

## DEDUPE

El sistema verifica la última versión visual guardada. Si los parámetros (`qr_foreground_color`, `qr_background_color`, `qr_logo_url`, `qr_logo_enabled`) coinciden exactamente con la nueva descarga, no se crea una nueva entrada en el historial.

## RESTORE VERSION

El botón del historial tiene la etiqueta "Usar esta apariencia". Al pulsarlo, cambia instantáneamente los colores y estado del logo en el preview sin necesidad de un guardado forzado a la base de datos (queda en borrador hasta que se guarde) y sin alterar para nada la URL o el perfil del usuario.

## RLS

Las tablas de historial visual (`qr_visual_versions`) se mantienen seguras bajo políticas de RLS que requieren correspondencia entre `profiles.user_id = auth.uid()`. El frontend no tiene autorización de modificar directamente el `scan_count` en la tabla `profiles`.

## PUBLIC_ID STABILITY

Las pruebas validan que generar, descargar o restaurar configuraciones del QR, así como navegar por la sección "Mi QR", no modifican el `public_id`, `slug` o perfil en ningún momento, garantizando que el QR físico ya impreso nunca quede roto.

## MOBILE

- Botones de acción ("Descargar", "Copiar enlace", "Restaurar QR", "Usar esta apariencia", "Subir logo", "Eliminar logo") tienen tamaño igual o mayor a `44px` (`h-11` mínimo).
- La URL y componentes visuales no desbordan la pantalla de 360px de ancho.
- El historial es scrolleable horizontalmente y funcional con toques.

## REGRESSIONS

No se ha introducido ninguna regresión sobre: Editor general, Publicar, QR Studio (colores e inserción de logos), Descargas en PNG/SVG, ni visualización de perfiles públicos.

## TECHNICAL GATES

Los procesos `lint`, `build` y `tsc` superaron sus verificaciones con éxito. (Exit code 0 en todos los casos).

## VEREDICTO

**PASS**. La funcionalidad "Mi QR" cuenta el historial visual y la métrica de forma atómica y segura, cumpliendo todos los requerimientos planteados en QR-UI-11B.
