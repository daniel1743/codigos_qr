# CRIPQER_ANTIGRAVITY_REGRESSION_ROLLBACK_V1

## Resultado

`CRIPQER_ANTIGRAVITY_REGRESSION_ROLLBACK_PARTIAL`

El rollback selectivo quedó aplicado y la compilación pasa. La certificación
runtime queda pendiente como `MANUAL_RUNTIME_REQUIRED` porque el puente del
navegador falló al abrir la ruta QA y reinició el kernel.

## Hallazgo forense

Los cambios sospechosos estaban únicamente en el working tree, no en un commit
separado de AntiGravity. El delta confirmado fue:

- `src/components/app-shell/AppShell.tsx`: importación, render global de
  `MobileBottomNav` y `pb-14` en el contenedor principal.
- `src/components/app-shell/MobileBottomNav.tsx`: nueva variante Magic con
  `pageId`, rutas adicionales y cambio de layout.
- `src/isolated/magic-page-editor/pages/Editor.tsx`: inyección de la barra
  inferior dentro del editor Magic.
- `src/isolated/magic-page-editor/MagicEditorApp.tsx` y
  `src/features/magic-page-editor-production/MagicProductionEditorHost.tsx`:
  propagación de `pageId` exclusivamente para esa inyección.
- `src/isolated/magic-page-editor/components/editor/MobileCanvas.tsx`:
  padding inferior adicional para compensar la barra.

Este conjunto coincide con los síntomas reportados: navegación inferior
inesperada, shell global implicado en el stack y reducción/obstrucción del
canvas móvil. La variante global de `AppShell` era especialmente riesgosa
porque `MobileBottomNav` usa estado de ruta del cliente en todas las áreas
autenticadas.

## Rollback aplicado

Se restauraron solamente esos hunks:

- `AppShell` volvió a su shell original sin barra inferior global ni padding.
- `MobileBottomNav` volvió a su API original y a sus cinco destinos existentes.
- Magic dejó de recibir `pageId` solo para navegación.
- Magic dejó de montar `MobileBottomNav`.
- Se eliminó el padding compensatorio del canvas.

No se hizo `reset`, `checkout`, `restore` global, revert de commit ni cambio de
base de datos.

## Trabajo preservado explícitamente

Se conservaron los cambios pendientes de perfiles, Magic document V1,
autosave, publish, renderer público, bloques/card families, variantes Hero,
branding/TopBar, Premium codes, migraciones no relacionadas y demás trabajo de
otros agentes. No se tocaron Supabase, RLS, rutas, SQL, Power Editor, Direct
Editor ni Engine V2.

## Estado git

- HEAD y `origin`: `6fd7a1e` (`pagina nueva lista`).
- Los cambios inspeccionados eran no confirmados en working tree.
- El rollback no se confirmó en un commit.

## Validación

- `git diff --check`: PASS.
- `npm run build`: PASS.
- Build produjo solo warnings existentes de `@theme` y de un archivo de test
  bajo `src/routes/__tests__` que no exporta una ruta.
- Runtime `/pages/52394cf9-931b-437a-a498-23f425816e29/edit`: no certificado
  por fallo del browser bridge.
- Consola before/after: no disponible por el mismo fallo del bridge.
- Screenshot before/after: no disponible como archivo por el mismo fallo; la
  evidencia previa mostraba la barra inferior agregada y el objetivo posterior
  requiere verificación manual.

## Próximo paso manual requerido

Abrir la ruta QA con sesión autenticada y comprobar Magic canónico, canvas
usable, ausencia de barra inferior global, ausencia de `Creator Premium`,
ausencia de hydration mismatch/Invalid hook call, autosave, hard reload y
publish. No sustituir esta comprobación por consultas REST anónimas.
