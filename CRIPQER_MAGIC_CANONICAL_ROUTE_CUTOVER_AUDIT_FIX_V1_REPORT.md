# CRIPQER_MAGIC_CANONICAL_ROUTE_CUTOVER_AUDIT_FIX_V1

## Resultado

`CRIPQER_MAGIC_CANONICAL_ROUTE_CUTOVER_PARTIAL`

La conexión de las entradas autenticadas principales quedó corregida y el
build pasa. El runtime con segundo dispositivo queda pendiente de validación
manual porque el browser bridge no estuvo disponible de forma estable.

## Resolver único

Se añadió:

`src/lib/editor-routing/resolveCanonicalMagicPage.ts`

El resolver busca `public.pages` por `owner_user_id`, ordena por
`created_at` ascendente y selecciona determinísticamente la primera página.
Cuando no existe, las entradas vuelven a `/profile` para usar el flujo
canónico existente de creación; no crean páginas ni perfiles silenciosamente.

## Entradas corregidas

- `src/routes/account.tsx`: “Editar página” abre
  `/pages/{canonicalPageId}/edit` o `/profile` si aún no existe página.
- `src/routes/page.tsx`: ambos botones “Editar” usan el mismo resolver.
- `src/components/app-shell/AppShell.tsx`: el item Editor del
  `PlatformNavbar`, incluido su hamburger móvil, recibe la misma URL canónica.
- `src/components/app-shell/MobilePlatformNav.tsx`: reutiliza el resolver y
  conserva el `pageId` actual en Magic.
- `src/components/profile/MyProfilePage.tsx`: ya usaba la ruta Magic; “Ver
  página” ahora exige `canonicalPage.published`, no el estado legacy del
  perfil.

## Referencias `/editor` auditadas

Encontradas en:

- `src/routes/account.tsx` — entrada de producto, corregida.
- `src/routes/page.tsx` — dos entradas de producto, corregidas.
- `src/components/app-shell/MobileBottomNav.tsx` — componente legacy no
  montado; la autoridad activa es `MobilePlatformNav`.
- `src/components/editor/DesktopSidebar.tsx` — componente legacy no montado.
- `src/components/Auth.tsx` — enlaces del flujo de login/registro, preservados
  para no cambiar Auth dentro de esta tarea.
- `src/routes/plataforma.tsx` y `src/routes/vs/linktree.tsx` — CTAs públicos
  de superficies legacy/marketing, preservados y documentados como siguiente
  limpieza separada.
- `src/components/onboarding-v2/qa/OnboardingTestProfileGate.tsx` y
  `src/lib/onboarding-v2/basic-editor-handoff.ts` — QA/handoff legacy,
  preservados intencionalmente.
- `src/routes/editor.tsx` y `src/routeTree.gen.ts` — ruta legacy interna,
  preservada para rollback/QA; ningún entrypoint autenticado corregido la usa.

No se encontraron referencias normales a `legacyEditor=1` ni
`directEditor=magic` en los entrypoints auditados.

## Public URL y QR legacy

Profile continúa usando `/pg/{canonicalPage.public_id}` para Magic y ahora
solo presenta esa publicación cuando `canonicalPage.published` es verdadero.
El QR legacy basado en `profile.public_id` y `/p/{public_id}` no fue alterado:
no se implementó bridge `/p -> /pg` porque requeriría una decisión específica
para preservar analítica y comportamiento histórico sin tocar datos.

## Protección de sistemas

No se modificaron MagicProductionEditorHost internals, documento V1,
EditorProvider, canvas, autosave, publish, Supabase schema, RLS, QRStudio,
catálogo, Hero, Premium, Power Editor, Direct Editor ni Engine V2.

## Validación

- `npm run build`: PASS.
- `git diff --check` en archivos tocados: PASS.
- ESLint dirigido en archivos tocados: PASS.
- Prueba runtime desktop/mobile/segundo dispositivo: pendiente por browser
  bridge; no se afirma PASS sin observar la misma página en cada entrada.
- Consola fatal React: pendiente de observación runtime.

## Matriz esperada después del login

`/profile`, `/account`, `/page`, hamburger Editor y MobileNav Editor deben
terminar en el mismo `/pages/{pageId}/edit`; si no hay página, deben terminar
en `/profile` para creación. La ruta `/editor` queda solo como superficie
legacy interna y no como destino normal.
