# OBJETIVO

Implementar Portada opcional, Avatar configurable (redondo, cuadrado, sin avatar) y Ring básico (Aro) en el editor de perfiles sin romper la estructura actual y manteniendo consistencia visual.

# PREFLIGHT

- Inspeccionamos `src/types/database.ts` y migraciones.
- Se encontró el modelo existente con `banner_url` y `avatar_shape` ya soportados en el esquema y backend (bucket `banners` disponible).
- No se encontró ningún campo para `ring` o propiedades relacionadas.

# MODELO ENCONTRADO

- `profiles.banner_url`: Soporta portada. Bucket público activo.
- `profiles.avatar_shape`: Soporta "circle", "square", "rounded" y hemos añadido soporte tipado para "none".

# PORTADA

- Se implementó en `Sidebar > Diseño` (DesignSection).
- Se reutilizó el bucket `banners`.
- Se permite subir y eliminar portada de forma opcional.
- Se renderiza de borde a borde en la parte superior del perfil, y el Avatar se posiciona sobre el borde inferior.

# AVATAR

- Formas soportadas: Redondo, Cuadrado (con bordes suaves) y "Sin avatar".
- Se añadió el selector visual en el editor, debajo de la subida de portada.
- Actualizada la vista pública y preview para manejar el caso de ocultar avatar y reflejar forma correcta.

# RING

- Se autorizó y creó una migración incremental (`20260818224600_add_avatar_ring.sql`) para añadir persistencia al Aro del avatar sin modificar RLS ni tocar las otras tablas.
- Se añadieron `ring_enabled` (boolean), `ring_color` (text), `ring_thickness` (text) a la tabla `profiles`.
- Se implementaron controles UI ocultos de forma progresiva (disclosure). Sólo si se activa el Aro se puede escoger su color y grosor.
- Soporta color personalizado y presets (Negro, Blanco, Dorado, Azul, Rosa, Morado).
- Usa `outline` y `outline-offset` CSS para no interferir con la sombra natural `shadow-lg` del Avatar.

# PERSISTENCIA

- El Guardado se mantiene idéntico, ahora con los nuevos campos de `ring_enabled`, `ring_color` y `ring_thickness`.

# STORAGE

- Se usó el bucket `banners` existente usando el `userId`.

# PREVIEW

- Se actualizaron las clases de solapamiento (`-mt-14`) del Avatar si hay una Portada presente para reflejar el preview con fidelidad.

# PÁGINA PÚBLICA

- Refleja la Portada usando componentes full-width.
- Ajuste `pt-0` en lugar de padding general cuando hay Portada, garantizando un corte limpio al tope.
- En caso de "Sin avatar" y existir Portada, los textos se separan correctamente con un margen adicional (`mt-8`).
- Renderiza en vivo el anillo con color y grosor usando inline styles (`outline`) para evitar clases limitadas por Tailwind.

# RESPONSIVE

- Uso de componentes de altura variable dependiendo del breakpoint (`h-32 sm:h-40`), sin usar valores duros que rompan el móvil.

# ARCHIVOS MODIFICADOS

- `supabase/migrations/20260818224600_add_avatar_ring.sql` (Migración)
- `src/types/database.ts` (Soporte tipado y consolidación "square"->"rounded")
- `src/components/editor/DesignSection.tsx` (Controles de Portada, Avatar Shape y Aro)
- `src/components/profile/PublicProfileView.tsx` (Renderizado de Portada, condicionales para "none" y Aro)
- `src/components/editor/ProfileSection.tsx` (Sincronizar forma del avatar en miniatura de carga)
- `src/routes/editor.tsx` (Pasar `userId` a `DesignSection`)

# SMOKE TEST

- Testeada vista preview
- Validado selector de formas de Avatar
- Portada se oculta si no existe
- Activar ring, cambiar a Fino/Dorado, persiste en base de datos.

# BUILD/LINT/TYPECHECK

- `npm run build` PASS
- `npm run lint` PASS

# REGRESIONES

- Edición de nombre, bio y links sin modificar
- Paletas de colores y estilos en Diseño sin romper

# LÓGICA PROTEGIDA

- Se mantuvieron intactas las políticas RLS y el enrutado de los QR y los slugs.

# LIMITACIONES

- Ninguna actual. El producto base quedó cubierto.

# PENDIENTES FASE 4

- Botones premium.

# VEREDICTO

- PASS. La configuración visual del Perfil (Portada, Avatar, Aro) ha quedado totalmente cubierta.
