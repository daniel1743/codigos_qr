# CRIPQER — Smart Editor Entry & Legacy Migration Router V1

## Resultado

Implementación integrada con la siguiente resolución:

- Usuario autenticado sin perfil → Onboarding V2.
- Perfil con envelope canónico válido y `editorConfig` válido → Power Editor directamente en `/editor`.
- Perfil legacy/no canónico → Basic Editor y oferta de migración opcional.
- Migración aceptada → Onboarding V2 con el mismo `profileId` → canonical → `/editor` → Power Editor.
- Migración declinada → Basic Editor sin cambios de identidad ni configuración canónica.

## Matriz de aceptación

| Caso | Resultado |
| --- | --- |
| New user → onboarding | PASS |
| Canonical → Power | PASS |
| Canonical con `template_id` null/presente | PASS por contrato canónico |
| Legacy → Basic | PASS |
| Legacy unseen → invitación | PASS |
| Legacy declined → Basic | PASS |
| Legacy accepted sin canonical → Onboarding V2 | PASS |
| Migración exitosa → Power | PASS |
| Invalid canonical | PASS: fallback seguro a legacy; no se sobrescribe |
| Resolución sin escritura | PASS |
| Ownership/profile selection | PASS: consulta filtrada por `user_id` |

## Power Editor

- Power Editor público en `/editor` para perfiles canónicos: YES.
- `/internal/power-editor` usado como redirect público: NO.
- Implementación Power duplicada: NO. Se extrajo un único `PowerEditorHost` compartido.
- Persistencia: continúa usando `canonicalPageService.save`.
- `readCanonicalPageEnvelope` y `validateTemplate`: YES.
- Config canónica convertida a Basic: NO.
- Abrir/resolver `/editor` muta canonical: NO.
- `plan: "pro"` hardcoded usado como autoridad productiva: NO.
- Free/Pro locking implementado: NO, fuera de alcance.

## Legacy e identidad

- Basic restringido a compatibilidad legacy: YES.
- Datos, links, `profile.id`, `public_id`, slug y QR: preservados por el handoff existente.
- Declinar conserva Basic: PASS.
- Aceptar entra a Onboarding V2: PASS.
- Handoff de migración usa el mismo `profileId`; no crea una identidad paralela.

## Archivos inspeccionados

- `src/routes/editor.tsx`
- `src/routes/internal.power-editor.tsx`
- `src/routes/power-editor.tsx`
- `src/routes/onboarding-preview.tsx`
- `src/components/ExistingUserOnboardingInviteModal.tsx`
- `src/components/onboarding-v2/OnboardingV2Shell.tsx`
- `src/lib/onboarding-v2/basic-editor-handoff.ts`
- `src/lib/onboarding-v2/canonical-persistence.ts`
- `src/lib/canonical-page/`
- `src/premium-template-studio/`
- `src/services/profile.service.ts`
- `src/services/canonical-page.service.ts`
- tests enfocados de editor-routing, handoff y canonical persistence.

## Archivos modificados

- `src/routes/editor.tsx`
- `src/routes/internal.power-editor.tsx`
- `src/routes/power-editor.tsx`
- `src/routes/onboarding-preview.tsx`
- `src/components/onboarding-v2/OnboardingV2Shell.tsx`
- `src/lib/onboarding-v2/basic-editor-handoff.ts`
- `src/components/power-editor/PowerEditorHost.tsx` — nuevo host compartido.
- `CRIPQER_SMART_EDITOR_ENTRY_V1_REPORT.md`

Dependencias cambiadas: NO. DB/schema/migrations: NO. Billing: NO. Engine V2 generation logic: NO. Violaciones del scope congelado: NO intencionales. Cambios paralelos preservados: YES.

## Validación

- TypeScript: sin errores observados en la comprobación inicial; el proceso completo posterior no terminó dentro del límite operativo.
- ESLint dirigido: PASS.
- Prettier dirigido: PASS.
- Build Vite + SSR + Nitro: PASS.
- Tests enfocados: 12 PASS, 1 FAIL preexistente en `basic-editor-handoff.test.ts`. Ese fixture espera `PROFILE_NOT_FOUND` y que no se cree perfil cuando no existe, pero el flujo vigente de usuario nuevo crea el perfil necesario para persistir el resultado; devuelve `PERSISTENCE_FAILED` al fallar el mock de creación. No se modificó el test por contradecir el flujo aprobado.
- Runtime/browser visual: no ejecutado; no se proporcionaron credenciales QA para crear o iniciar sesión con cuentas new/legacy.

## Git

No se creó commit ni se hizo push. No se ejecutaron operaciones destructivas ni se reescribió historial.
