# Mobile Navigation IA Fix

## Estado

Patch aplicado. Build de producción pasó con código `0`.

## Cambios

- `src/components/navigation/MobileBottomNav.tsx`
  - Menú inferior canónico de 5 destinos:
    1. Plantilla -> `/template-bank`
    2. QR -> `/editor?tab=qr`
    3. Editor -> `/template-builder`
    4. Seguridad -> `/encrypted-documents`
    5. Mi Perfil -> `/profile`
  - Hugeicons preservado.
  - Bubble reducido de `96px` a `68px`, aproximadamente 29%.
  - Halo/superficie blanca externa removida mediante `fill-transparent` y `bg-transparent`.
  - El indicador activo queda clampado para no salirse del contenedor.

- `src/routes/editor.tsx`
  - La ruta real `/editor` ahora reconoce `?tab=qr`.
  - Cuando `tab=qr`, abre `activeTab = "qr"` y `selectedEditorTarget = { type: "qr" }`.
  - La vista QR renderiza `EditorQRPreview`.
  - La landing/preview `PublicProfileView` queda en la rama no QR.

- `src/components/profile/MyProfilePage.tsx`
  - Mi Perfil ahora expone accesos de visualización:
    - Ver mi perfil público.
    - Ver mi QR.
    - Ver mi enlace.
  - Las acciones de edición redirigen a los dueños correctos:
    - Editar landing -> `/template-builder`.
    - Editar QR -> `/editor?tab=qr`.
    - Editar enlace -> `/editor?tab=qr`.
  - Usa datos reales de `profiles.slug` y `profiles.public_id` si existen.

## QA

- `npm run build`: PASS.
- Playwright autenticado: BLOCKED porque no hay sesión real de Supabase ni credenciales de prueba en este entorno.
- Screenshots autenticados: NOT EXECUTED por el mismo bloqueo.

## Evidencia

- `route-inventory.json`
- `mobile-navigation-results.json`
- `profile-routing-results.json`
- `qr-isolation-results.json`
- `responsive-results.json`
- `playwright-results.json`
