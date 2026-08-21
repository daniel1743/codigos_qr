# Social Badges Image Mode — Reporte

## Flujo Actual Auditado

- `profile_links` persistía plataforma, texto, URL, orden y `social_cover_image_url`.
- `SocialCover` renderizaba el círculo principal usando `social_cover_image_url || avatarUrl`.
- El badge secundario se mostraba de forma fija en `avatar_capsule`, incluso cuando el círculo principal ya era el logo de la plataforma.
- Los modelos premium estaban registrados en `src/constants/social-cover-styles.ts`.

## Cambios Implementados

- Se agregó `social_cover_image_mode` en `profile_links` con default `platform_icon`.
- Modos soportados:
  - `platform_icon`: logo grande de la red y sin badge pequeño.
  - `main_avatar`: avatar principal como imagen grande y badge pequeño de plataforma.
  - `custom_image`: foto propia del enlace como imagen grande y badge pequeño de plataforma.
- `social_cover_image_url` se conserva como la imagen custom por enlace.
- Si `custom_image` no tiene URL válida o `main_avatar` no tiene avatar, el fallback es `platform_icon`.
- La foto custom se conserva internamente al cambiar temporalmente a otro modo.
- El icono genérico `website` cambió de globo a ventana de navegador.
- La galería premium conserva los 4 modelos actuales y reserva IDs hasta 16 estilos futuros sin mostrarlos como diseños terminados.

## Persistencia

Migración nueva:

`supabase/migrations/20260820172000_add_link_social_image_mode.sql`

No se modificaron migraciones antiguas.

## Validación Manual Pendiente

- WhatsApp en `platform_icon`: logo grande, sin badge.
- Instagram en `platform_icon`: logo grande, sin badge.
- WhatsApp en `main_avatar`: avatar grande, badge WhatsApp.
- Instagram en `main_avatar`: avatar grande, badge Instagram.
- WhatsApp en `custom_image`: foto propia A, badge WhatsApp.
- Instagram en `custom_image`: foto propia B, badge Instagram.
- TikTok en `platform_icon`: logo grande, sin badge.
