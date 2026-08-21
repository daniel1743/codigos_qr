# Guia tecnica: tarjetas premium

## Objetivo
Conectar el panel de apariencia social con el tamano real de las tarjetas premium.

## Campos
- `social_cover_height`: controla el alto visual de la tarjeta y del bloque interno de imagen. Rango: 48 a 88. Default: 64.
- `social_cover_width`: controla el ancho relativo de la tarjeta premium. Rango: 88 a 116. Default: 100.

## Archivos
- `src/types/database.ts`: agrega `social_cover_width`.
- `src/components/editor/DesignSection.tsx`: panel legado de alto/ancho.
- `src/components/editor/appearance/SocialCoversSection.tsx`: panel actual de alto/ancho.
- `src/components/profile/PublicProfileView.tsx`: pasa `coverHeight` y `coverWidth`.
- `src/components/profile/PremiumMediaLinkCard.tsx`: aplica alto y ancho a la tarjeta y al area interna.
- `supabase/migrations/20260821010000_add_social_cover_width.sql`: persistencia del ancho.

## Reglas
- No tocar upload, storage ni `social_cover_image_mode`.
- No tocar el badge pequeno de plataforma.
- El alto debe afectar la tarjeta completa y tambien el contenedor interno de imagen.
- El ancho debe centrar la tarjeta y permitir 88% a 116%.
- Los layouts nuevos no deben hardcodear ancho/alto; deben respetar los props del perfil.

## Como extender
1. Crear un nuevo layout en `src/lib/design/premium-media-layouts.ts`.
2. Agregarlo a `SOCIAL_COVER_STYLE_OPTIONS` si debe aparecer en el selector.
3. Mantener la imagen lateral dentro del bloque media de `PremiumMediaLinkCard`.
4. Probar con foto real, logo cuadrado y logo con transparencia.
5. Confirmar que el badge queda visible y separado.

## Checklist QA
- Cambiar `Alto premium` modifica la altura sin romper texto ni imagen.
- Cambiar `Ancho premium` modifica el ancho sin salirse del telefono.
- El badge pequeno queda igual que antes.
- Imagen por enlace sigue usando la misma logica de subida.
- `npm run build` pasa.
