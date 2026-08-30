# BASIC PUBLIC EDITOR RESTORATION EVIDENCE

Fecha: 2026-08-29

## 1. Rama y base real

- Rama de trabajo: `fix/restore-basic-public-editor`
- Rama base: `origin/main`
- Commit base confirmado: `6d852fe822b43a2eef80ccfe33d47122a28968c6`
- Commit de implementacion: `b9189b9a5ec7e4ed31f8cca7191f781b6cf9e12f`
- Worktree usado: `C:\Users\Lenovo\Desktop\proyectos desplegados importante\generador de QR - restore-basic`

Evidencia:

```text
git rev-parse origin/main
6d852fe822b43a2eef80ccfe33d47122a28968c6

git show --stat --oneline --no-renames HEAD
b9189b9 Restore basic public editor
 8 files changed, 565 insertions(+), 3027 deletions(-)
```

## 2. Landing publica

`src/routes/index.tsx` se conservo desde `origin/main`. No fue modificado en el commit de restauracion.

Evidencia:

```text
git diff --exit-code -- src/routes/index.tsx
index.tsx unchanged from origin/main
```

La landing tradicional mantiene enlaces publicos hacia `/editor`.

Evidencia:

```text
rg -n '/editor|template-builder|power-editor-preview|internal/power-editor-draft' src\routes\index.tsx
src\routes\index.tsx:212:              to="/editor"
src\routes\index.tsx:299:                to="/editor"
src\routes\index.tsx:600:            to="/editor"
src\routes\index.tsx:627:            <Link to="/editor" className="hover:text-slate-950">
```

No se encontro carga publica de Graphite Atelier ni `landing-graphite`.

Evidencia:

```text
rg -n "Graphite Atelier|landing-graphite" src .vercel\output\static
sin coincidencias
```

## 3. Editor publico principal

La ruta `/editor` quedo como entrada publica del editor basico. Ya no importa ni renderiza:

- `PowerEditorMainEntry`
- Power Editor
- Template Builder
- `QRCodeAdvanced`
- `AppearanceSection`
- `ShareSection`
- `QRTemplateGallery`
- controles premium

Evidencia:

```text
rg -n "PowerEditorMainEntry|power-editor|template-builder|Graphite Atelier|landing-graphite|QRCodeAdvanced|AppearanceSection|ShareSection|QRTemplateGallery|Premium" \
  src\routes\editor.tsx \
  src\components\editor\ProfileSection.tsx \
  src\components\editor\DesignSection.tsx \
  src\components\editor\LinksSection.tsx \
  src\components\profile\PublicProfileView.tsx

sin coincidencias
```

## 4. Cambios reales aplicados

Archivos modificados por el commit:

```text
src/components/editor/DesignSection.tsx
src/components/editor/LinksSection.tsx
src/components/editor/ProfileSection.tsx
src/components/profile/PublicProfileView.tsx
src/routes/editor.tsx
src/services/profile.service.ts
src/types/database.ts
supabase/migrations/20260829120000_add_banner_fusion_strength.sql
```

Estadistica del commit:

```text
src/components/editor/DesignSection.tsx            | 1145 +++-----------------
src/components/editor/LinksSection.tsx             |  531 ++-------
src/components/editor/ProfileSection.tsx           |  206 ++--
src/components/profile/PublicProfileView.tsx       |  869 ++-------------
src/routes/editor.tsx                              |  818 +++-----------
src/services/profile.service.ts                    |    1 +
src/types/database.ts                              |   15 +-
supabase/migrations/20260829120000_add_banner_fusion_strength.sql | 7 +
```

## 5. Funcionalidad dejada en `/editor`

El editor basico publico incluye:

- Avatar: subir imagen JPG/PNG/WEBP, maximo 3 MB.
- Perfil: nombre para mostrar, biografia y alias.
- Enlaces: agregar, editar texto, editar URL, mostrar/ocultar, ordenar y eliminar.
- Diseno: color de fondo, color de boton, color de texto del boton.
- Banner: subir imagen JPG/PNG/WEBP, maximo 4 MB, reemplazar, previsualizar y eliminar.
- Difuminacion del banner: slider `0..100`.
- Guardar borrador.
- Publicar.
- Preview usando el mismo `PublicProfileView` que la pagina publica.

## 6. Banner y difuminacion

Se agrego `banner_fusion_strength` al tipo `Profile` y a `PROFILE_WRITABLE_COLUMNS`.

Evidencia:

```text
rg -n "banner_fusion_strength" src\types\database.ts src\services\profile.service.ts supabase\migrations\20260829120000_add_banner_fusion_strength.sql
src\types\database.ts:27:  banner_fusion_strength?: number | null;
src\services\profile.service.ts:13:  "banner_fusion_strength",
supabase\migrations\20260829120000_add_banner_fusion_strength.sql:2:  ADD COLUMN IF NOT EXISTS banner_fusion_strength INTEGER NOT NULL DEFAULT 60,
supabase\migrations\20260829120000_add_banner_fusion_strength.sql:4:    CHECK (banner_fusion_strength >= 0 AND banner_fusion_strength <= 100);
```

La formula visual esta en `PublicProfileView`, por lo que preview y pagina publica usan el mismo componente:

```text
src\components\profile\PublicProfileView.tsx:9:function normalizeBannerFusionStrength(value: unknown)
src\components\profile\PublicProfileView.tsx:15:function getBannerFusionMask(strength: unknown)
src\components\profile\PublicProfileView.tsx:46:WebkitMaskImage: getBannerFusionMask(profile.banner_fusion_strength)
src\components\profile\PublicProfileView.tsx:47:maskImage: getBannerFusionMask(profile.banner_fusion_strength)
```

## 7. Migracion creada

Archivo:

```text
supabase/migrations/20260829120000_add_banner_fusion_strength.sql
```

Contenido:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_fusion_strength INTEGER NOT NULL DEFAULT 60,
  ADD CONSTRAINT profiles_banner_fusion_strength_check
    CHECK (banner_fusion_strength >= 0 AND banner_fusion_strength <= 100);

COMMENT ON COLUMN public.profiles.banner_fusion_strength IS
  'Strength from 0 to 100 for the visual transition between banner and profile background.';
```

Estado:

- Migracion aplicada a produccion: NO
- Deploy: NO
- Merge a main: NO
- Push: NO

## 8. Verificacion tecnica ejecutada

Build:

```text
npm run build
resultado: PASS
```

Lint dirigido:

```text
npx eslint src/routes/editor.tsx src/components/editor/ProfileSection.tsx src/components/editor/DesignSection.tsx src/components/editor/LinksSection.tsx src/components/profile/PublicProfileView.tsx src/services/profile.service.ts src/types/database.ts
resultado: PASS, sin errores ni warnings
```

Servidor local:

```text
npm run dev -- --host 127.0.0.1 --port 5173
Local: http://127.0.0.1:5173/
```

HTTP:

```text
Invoke-WebRequest -Uri http://127.0.0.1:5173/ -UseBasicParsing
resultado: render HTML de landing tradicional

Invoke-WebRequest -Uri http://127.0.0.1:5173/editor -UseBasicParsing
resultado: 200
```

## 9. Elementos no tocados

No se modificaron:

- `src/routes/index.tsx`
- `src/power-editor/**`
- `src/routes/template-builder.tsx`
- `public/template-builder.html`
- `package.json`
- `package-lock.json`
- `bun.lock`
- `vite.config.ts`
- configuracion de produccion
- variables de entorno
- datos reales de usuarios
- ramas del Power Editor

Evidencia:

```text
git diff --name-only -- package.json package-lock.json bun.lock vite.config.ts src/routes/index.tsx src/routes/template-builder.tsx public/template-builder.html src/power-editor
sin salida
```

## 10. Limitaciones de evidencia

- No se aplico la migracion en produccion.
- No se hizo deploy.
- No se hizo merge a `main`.
- No se hizo push.
- La persistencia real autenticada de `banner_fusion_strength` queda pendiente hasta aplicar la migracion en una base de datos de prueba o produccion.
- No hubo evidencia visual con screenshot automatizado porque Playwright/browser no estaba disponible en este worktree.

## 11. Estado final

Estado final: `IMPLEMENTATION COMPLETE - MIGRATION PENDING`

La rama `fix/restore-basic-public-editor` queda lista para revision. `/` conserva la landing tradicional de `origin/main` y `/editor` queda como editor basico publico principal.
