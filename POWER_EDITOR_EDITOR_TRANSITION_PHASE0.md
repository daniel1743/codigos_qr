# Cripqer — Trazabilidad de transición de editores (Fase 0)

**Estado:** auditoría de solo lectura completada; integración no iniciada.  
**Rama de trabajo:** `chore/power-editor-isolated-copy`  
**Baseline de `codigos_qr`:** `b8c1998b35102650d6cd7d858751c25a32ee2f48`  
**Fuente Power Editor:** `cripqer-landing`, checkpoint `d53f2b04b846faf248322ebbe7f4038fca40d919`.

> Este documento registra el estado antes de mover rutas o modificar acceso. Sirve para localizar responsabilidades, aislar fallas y hacer rollback. No autoriza por sí solo ningún cambio de código.

## 1. Qué se ha hecho hasta ahora

| Hito | Estado | Detalle |
|---|---|---|
| Copia aislada del Power Editor | Hecho | Copiado a `src/power-editor/` sin reemplazar `/editor`. |
| Preview temporal de escritorio | Hecho | Ruta `src/routes/power-editor-preview.tsx`. |
| Preview temporal móvil | Hecho | Ruta `src/routes/power-editor-preview-mobile.tsx`. |
| Adaptador de router | Hecho | `src/power-editor/client/src/lib/wouterCompat.ts` adapta sólo la navegación requerida por el componente copiado. |
| Build de preview aislada | PASS | Generó automáticamente `src/routeTree.gen.ts`. |
| Supabase, QR y publicación | No conectados | El Power Editor aislado conserva su estado local; no toca datos reales. |
| Editor existente | Intacto | Sigue en `src/routes/editor.tsx`. |
| Commit, push y despliegue | No realizados | La rama es local y reversible. |

## 2. Estado actual del repositorio

| Elemento | Ubicación / valor | Tratamiento |
|---|---|---|
| Repositorio | `https://github.com/daniel1743/codigos_qr.git` | Destino de la transición. |
| Rama activa | `chore/power-editor-isolated-copy` | No se ha publicado. |
| Worktree | `/home/ubuntu/codigos_qr-power-editor-isolated` | Único worktree inspeccionado. |
| Editor anterior | `src/routes/editor.tsx` | Protegido; no modificar internamente. |
| Power Editor | `src/power-editor/` | Copia aislada; no es todavía editor de usuarios. |
| Rutas temporales | `/power-editor-preview`, `/power-editor-preview-mobile` | Sólo validación local. |
| Archivo generado | `src/routeTree.gen.ts` | Cambió sólo por generación automática de TanStack Router; nunca editar manualmente. |
| `package-lock.json` | Desincronizado antes de esta fase | No se modificó. |

## 3. Editor anterior: responsabilidades y dependencias

El editor anterior es `src/routes/editor.tsx`. Carga sesión Supabase, `profiles` y `profile_links`; usa `ProfileSection`, `AppearanceSection`, `LinksSection`, `ShareSection`, `PublicProfileView`, `QRCodeAdvanced` y `QRFrameShell`. Al guardar, crea/actualiza el perfil del usuario y sus links, conservando `public_id` y `slug` si ya existen.

| Dependencia | Archivo o sistema | Regla de transición |
|---|---|---|
| Ruta actual | `src/routes/editor.tsx` | Mantener sin rediseñar ni cambiar lógica interna. |
| Perfil y enlaces | `profile.service`, `link.service`, tablas `profiles` y `profile_links` | No tocar en Fase 1. |
| Identidad QR pública | `public_id`, `slug`, `getPublicProfileUrl` | No regenerar ni modificar. |
| Plantillas actuales | `src/lib/design/template-presets.ts` y `TemplatePicker.tsx` | Conservar intactos. |
| Script generador | `generate_templates.cjs` | Sólo reescribe `template-presets.ts`; no renderiza páginas ni captura previews. |
| QR | `QRCodeAdvanced`, `QRFrameShell` | Congelado. |

## 4. Autorización administrativa existente

La fuente de verdad actual es `admin_users` en Supabase. `src/lib/admin-check.ts` consulta esa tabla mediante `isUserAdmin`; el panel `/admin` usa la misma tabla y redirige si no encuentra un registro administrativo. La tabla tiene RLS y una política que permite al usuario comprobar su propio estado o al superadministrador consultar registros.

**Límite conocido:** el editor anterior es una ruta SPA y hoy no tiene un guard de ruta independiente. Para una futura ruta `/admin/template-studio` se debe reutilizar el mismo check antes de montar el editor y mantener el estado de carga hasta decidir redirección. No se debe crear una lista administrativa paralela ni confiar sólo en ocultar enlaces.

## 5. Navegación y biblioteca existentes

| Entrada | Archivo localizado | Estado en Fase 0 |
|---|---|---|
| Editor desde perfil | `src/components/profile/MyProfilePage.tsx` | Sigue apuntando a `/editor`; no cambiar aún. |
| Editor desde landing | `src/routes/index.tsx` | Sigue apuntando a `/editor`; no cambiar aún. |
| Editor desde documentos seguros | `src/routes/encrypted-documents.tsx` | Sigue apuntando a `/editor`; no cambiar aún. |
| Presets del editor anterior | `src/components/editor/TemplatePicker.tsx` | Aplica estilos sobre el perfil actual; no crea proyectos. |
| Galería QR | `src/components/editor/QRTemplateGallery.tsx` | Congelada y no relacionada con el traslado inicial. |
| Panel administrativo | `src/routes/admin.tsx`, `AdminPanel.tsx` | Congelado; no se altera para integrar editor. |

## 6. Sistemas explícitamente congelados

No modificar sin permiso específico: Supabase y sus migraciones/RLS; autenticación; perfiles y recuperación de sesión; `public_id`, slug, URL pública y QR; QR Studio; biblioteca de QR; documentos seguros; métricas; Social Covers; paneles administrativos no relacionados; biblioteca administrativa; corrección de `CleanTemplatePreview`; estilos globales; Vercel; variables de entorno; script generador; plantillas maestras; código interno del editor anterior; y herramientas internas del Power Editor.

## 7. Fase 1 propuesta: montaje y protección administrativa

### Archivos nuevos propuestos

| Archivo | Propósito |
|---|---|
| `src/routes/admin/template-studio.tsx` | Ruta TanStack nueva que montaría el editor anterior sin cambiarlo. |
| `src/components/admin/AdminRouteGuard.tsx` | Guard local y reutilizable que comprobaría sesión + `admin_users` antes de renderizar contenido protegido. |

### Archivos existentes que podrían requerir cambio

| Archivo | Cambio mínimo | Razón | Prueba | Rollback |
|---|---|---|---|---|
| `src/routeTree.gen.ts` | Sólo generación automática | Registrar la nueva ruta | Build | Regenerar tras quitar ruta. |
| Ningún otro archivo existente | Ninguno en Fase 1 | `/editor` y navegación permanecen temporales | Build + rutas | No aplica. |

La decisión de no cambiar `/editor` en Fase 1 es deliberada: evita dejar usuarios sin ruta mientras el editor administrativo se protege y se verifica. La retirada de `/editor` como acceso normal pertenece a la Fase 2 autorizable después.

## 8. Pruebas exigidas para Fase 1

| Caso | Resultado esperado |
|---|---|
| Administrador autenticado | Puede abrir `/admin/template-studio` y usar el editor anterior sin cambios de funcionamiento. |
| Usuario autenticado normal | Es redirigido o recibe acceso denegado antes de montar el editor. |
| Usuario sin sesión | Es redirigido a inicio/login antes de montar el editor. |
| Ruta `/editor` actual | Permanece operativa mientras se verifica la ruta administrativa. |
| Script generador | Sigue escribiendo únicamente `template-presets.ts`. |
| Build | TanStack genera su árbol de rutas y compila. |

No se declarará PASS la comprobación de roles hasta ejecutarla con una sesión administrativa y otra normal reales. La ausencia local de variables Supabase impide simular esas identidades de forma honesta.

## 9. Riesgos y bloqueo conocidos

| Riesgo | Estado | Mitigación |
|---|---|---|
| `package-lock.json` desincronizado | Preexistente | No regenerar ni modificar sin autorización explícita. |
| Guard SPA no equivale a middleware de servidor | Conocido | Reutilizar `admin_users` y RLS; documentar que backend no expone un endpoint administrativo adicional. |
| Editor anterior opera perfiles propios, no templates maestros versionados | Confirmado | No cambiar semántica ni conectar Power Editor a sus servicios en Fase 1. |
| Power Editor aislado usa `localStorage` | Confirmado | No promoverlo a usuarios ni conectarlo a datos hasta fase de persistencia autorizada. |
| Corrección de franja blanca | Fuera de alcance | Preservar cualquier cambio existente; no tocar `CleanTemplatePreview`. |

## 10. Rollback

Antes de cualquier Fase 1 se conservará el HEAD `b8c1998b35102650d6cd7d858751c25a32ee2f48` y el estado aislado actual. Si falla la nueva ruta administrativa, se eliminarán sólo `src/routes/admin/template-studio.tsx` y `src/components/admin/AdminRouteGuard.tsx`, se regenerará el árbol de rutas y se verificará que `/editor` sigue intacto. No se usarán `git reset --hard`, rebase, amend ni rollback de cambios ajenos.

## 11. Detención de Fase 0

La Fase 0 no modificó código de integración, rutas productivas, editor anterior, Power Editor, Supabase, QR, publicación, script, bibliotecas ni navegación. El único objetivo pendiente antes de escribir código es autorizar la protección de la nueva ruta administrativa.

**¿Autorizas el PERMISO GLOBAL FASE 1 para montar y proteger el editor administrativo actual sin modificar su funcionamiento?**

## Addendum — Fase 1 iniciada, validación de sesión bloqueada

Tras autorización se crearon `src/components/admin/AdminRouteGuard.tsx` y `src/routes/admin/template-studio.tsx`. La nueva ruta protege el montaje del editor anterior mediante la sesión Supabase y la fuente existente `admin_users`; `src/routes/editor.tsx` sólo fue modificado para exportar `EditorPage`, sin cambiar su lógica interna.

El build pasó y TanStack Router registró automáticamente `/admin/template-studio`. Sin embargo, la prueba de navegador no puede certificar administrador, usuario normal ni usuario sin sesión porque este worktree no tiene `VITE_SUPABASE_URL` ni las demás credenciales de Supabase. La ruta muestra el límite de error de la aplicación antes de ejecutar la comprobación de rol.

**Detención obligatoria:** no se debe avanzar a la Fase 2 ni retirar la exposición normal de `/editor` hasta probar esta ruta con un entorno que tenga una sesión administrativa y otra normal reales. No se modificó `/editor`, navegación, Supabase, QR, publicación, script ni plantillas durante este intento.
