# CRIPQER_MOBILE_PERSISTENT_NAV_AND_ACTIONS_GATE_V1

## Resultado

`CRIPQER_MOBILE_PERSISTENT_NAV_AND_ACTIONS_PARTIAL`

La integración compila y respeta el bloqueo de regresión estructural. La
certificación runtime queda pendiente como `MANUAL_RUNTIME_REQUIRED` porque el
browser bridge no permitió abrir y observar la ruta autenticada QA.

## Archivos cambiados

- `src/components/app-shell/MobilePlatformNav.tsx` — nuevo componente único,
  mobile-only, fixed, safe-area aware, con Inicio, Editor, QR, Perfil y Menú.
- `src/components/app-shell/AppShell.tsx` — montaje visual del componente,
  sin wrappers, `pb-14` ni cambios de altura.
- `src/features/magic-page-editor-production/MagicProductionEditorHost.tsx` —
  montaje del mismo componente como sibling del Magic Editor, sin envolverlo.

No se modificaron canvas, EditorProvider, documento Magic, autosave, publish,
Supabase, RLS, QRStudio, routing base, renderer público, catálogo, Hero,
Premium, Power Editor, Direct Editor ni Engine V2.

## Acciones Magic

Auditoría estática: `Acciones` ya tenía un popover funcional con `Vista previa`
y `Publicar`, usando `ed.setMode` y `ed.publish` existentes. No se modificó ni
duplicó ese código.

El feedback `Guardando…` / `Guardado` permanece sin cambios.

## Integración y regresión

- Rutas normales: `AppShell` monta una sola autoridad visual compartida.
- Magic: el nav es sibling overlay fijo; no se agregó `AppShell` alrededor.
- No se añadió padding estructural al editor ni se cambió el viewport.
- Editor desde otras rutas reutiliza la página existente del usuario; si no hay
  una, vuelve a `/profile` para que opere el flujo canónico de creación.
- Dentro de Magic conserva el `pageId` actual.
- Menú usa el `Sheet` existente y las rutas canónicas `/profile`, `/page`,
  `/encrypted-documents` y `/account`.

## Validación

- `git diff --check`: PASS.
- `npm run build`: PASS.
- Acciones runtime: no observadas por fallo del browser bridge; código
  existente auditado y no modificado.
- QR, Inicio, Perfil, Menú y secuencia de navegación: pendientes de runtime.
- Magic regression, autosave, hard reload y publish: pendientes de runtime.
- Consola hydration/React: no observable sin browser bridge.
- Evidencia móvil 360/390/430: no capturada por fallo del browser bridge.

## Instrucción manual requerida

Con sesión autenticada, probar `/profile`, `/page`, `/qr`, `/account`,
`/encrypted-documents` y `/pages/52394cf9-931b-437a-a498-23f425816e29/edit` en
360, 390 y 430 px. Confirmar una sola barra, QR funcional, Menú con cierre,
Editor canónico, Acciones visible y ausencia de hydration mismatch. No usar
consultas REST anónimas como sustituto de esta prueba.
