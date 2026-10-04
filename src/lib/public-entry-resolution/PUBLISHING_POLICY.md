# Política de publicación (Fase 2) — CRIPQER

Estado: **aprobada**. Este documento describe el contrato que implementa el
resolver canónico. **No cambia ningún comportamiento**: en Fase 2 nada lo
consume todavía (las rutas públicas siguen igual).

## 1. Fuente canónica

- **`pages.published_template_config` es la fuente canónica** del render público
  **cuando existe una página moderna publicada**.
- El **draft** (`pages.template_config`) **nunca** puede resolverse públicamente.
  Toda lectura es *published-only* y los mapeadores exigen además que el
  documento publicado exista.

## 2. Compatibilidad legacy (intacta)

- **`profiles.published_*` permanece intacto** como compatibilidad para perfiles
  que **todavía no tienen** una página moderna publicada (perfil → layout
  link-in-bio).
- **No se borra, migra, sobrescribe ni marca físicamente** ningún dato legacy en
  esta fase. Cero escrituras.
- Un perfil no migrado sigue resolviendo `legacy-profile` (nunca 404, nunca
  rewrite silencioso).

## 3. Orden de resolución (regla única)

| Entrada | Identificador | Resolución |
|---|---|---|
| `/pg/{public_id}` | `page-public-id` | página moderna publicada, o `not-found` |
| `/pg/a/{slug}` | `page-slug` | página moderna publicada, o `not-found` |
| `/p/{profile_public_id}` (QR histórico) | `legacy-profile-public-id` | **página moderna publicada** si existe; si no, `legacy-profile` |
| `/{profile_slug}` (alias raíz) | `legacy-profile-slug` | **página moderna publicada** si existe; si no, `legacy-profile` |

**La página moderna gana siempre** que esté publicada. El legacy solo se
mantiene cuando no hay página moderna publicada.

## 4. Errores

- Un fallo de infraestructura (RPC/BD) **propaga una excepción**
  (`CanonicalPublicPageReadError`, con `operation`) — **nunca** un fallback
  silencioso a legacy ni a "not found".
- `null` significa exclusivamente "no existe / no publicado".

## 5. Consultas utilizadas (read-only)

| Necesidad | Fuente existente |
|---|---|
| página por identidad | RPC `get_public_page_by_public_id { p_public_id }` |
| página por alias | RPC `get_public_page_by_slug { p_slug }` |
| perfil por identidad | `profiles` (`public_id`, `published = true`) |
| perfil por alias | `profiles` (`slug`, `published = true`) |
| perfil → página | RPC `get_published_magic_page_by_legacy_public_id { p_legacy_public_id }` |

## 6. Fuera de alcance en Fase 2 (Fase 3+)

- Conectar el resolver a `$alias.tsx`, `p.$publicId.tsx`, `/pg`, `/q` o `qr.tsx`.
- Cambiar la URL que codifica el QR.
- Reasignar identificadores, migrar datos o marcar legacy en BD.
- Introducir `qr_id`/campaña explícitos (Fase 4).
