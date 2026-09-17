# CRIPQER PREMIUM ONBOARDING — ISOLATED QA TEST ROUTE V1

**Task ID:** `CRIPQER_PREMIUM_ONBOARDING_TEST_ROUTE_V1`  
**Type:** `CONTROLLED_QA_ROUTE_ONLY`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Agent:** CODEX

## Verdict

`CRIPQER_PREMIUM_ONBOARDING_TEST_ROUTE_RUNTIME_PASS_FROZEN`

Se añadió la ruta QA aislada `/onboarding-test`. La ruta reutiliza
`PremiumOnboardingFlow` sin copiar UI, estado, intake, generación, adapter,
Engine, persistencia ni renderer. `/onboarding-preview` permanece sin cambios
y continúa siendo la ruta QA existente.

## Route contract

| Contract                                                | Result                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `NEW_ROUTE_PATH`                                        | `/onboarding-test`                                            |
| `NEW_ROUTE_FILE`                                        | `src/routes/onboarding-test.tsx`                              |
| Rendered component                                      | `PremiumOnboardingFlow` existente                             |
| State                                                   | `OnboardingV2Draft` + `OwnerContentIntakeState` existentes    |
| Generation                                              | Boundary server-safe de Smart Pages 5 existente               |
| Persistence                                             | Ninguna; el flujo inicia en memoria y se reinicia al recargar |
| Production onboarding                                   | No cambiado                                                   |
| Signup, redirects, navigation, sitemap, marketing links | No cambiados                                                  |
| Auth/ownership                                          | No se añadió una capa nueva; es una ruta interna de QA        |

La ruta declara exactamente `noindex, nofollow, noarchive` mediante la metadata
de TanStack Router:

```text
title: Onboarding Test | Cripqer
robots: noindex, nofollow, noarchive
```

## Architecture

```text
/onboarding-test
        ↓
PremiumOnboardingFlow (implementación existente)
        ↓
OnboardingIntentV2 + OwnerContentInput
        ↓
generateSmartPageFromOnboardingFn
        ↓
Smart Pages 5 → PAGES_7 → Engine V2
        ↓
BioTemplateConfig + validateTemplate()
        ↓
PublicTemplateRenderer (preview en memoria)
```

El archivo de ruta solo configura metadata y monta el componente existente. No
contiene lógica de negocio ni crea un segundo recorrido de generación.

## Manual runtime smoke

Se abrió `/onboarding-test` en Chrome con una carga fresca y se ejecutó el
recorrido completo de cinco pasos usando datos reales de prueba local:

- negocio: `Estudio Demo`;
- actividad: `Fotografía`;
- objetivo: contacto;
- servicio: `Sesión inicial`;
- precio: `$45.000`;
- WhatsApp/teléfono: `+56912345678`;
- imágenes: omitidas explícitamente mediante la opción disponible.

Resultado observado:

1. La ruta cargó con sus cinco pasos y metadata QA.
2. El botón final mostró `GENERATING` mientras se ejecutaba la llamada real.
3. El flujo llegó a `READY` después de la generación real y la validación
   canónica.
4. La preview mostró `BioTemplateConfig · Renderer Cripqer` y conservó
   `Estudio Demo`, `Fotografía`, `+56912345678`, `Sesión inicial` y `$45.000`.
5. La pantalla mantuvo la declaración verdadera de que el resultado está en
   memoria, no publicado y sin URL pública.

La consola del tab terminó con `0` errores y `0` warnings. También se navegó a
`/onboarding-preview` después de la prueba y la ruta existente siguió
resolviendo su pantalla original de cinco pasos.

## Truth and safety boundaries

- No se usó generación mock ni preview de fallback.
- No se usaron media de muestra ni se inventaron datos del propietario.
- No se creó uploader duradero, `blob:`, `data:` ni almacenamiento temporal.
- No se añadió “guardar para después”, publicación, `public_id`, QR, alias ni
  URL pública.
- La preview continúa usando exclusivamente `PublicTemplateRenderer`.
- No se modificaron `PremiumOnboardingFlow`, `OnboardingV2Shell`, el onboarding
  V1, signup, Smart Pages, Engine V2, persistencia o base de datos.

## Files changed by this task

- `src/routes/onboarding-test.tsx`
- `src/routeTree.gen.ts` — registro tipado generado automáticamente para la
  nueva ruta.
- este informe.

No se modificó `src/routes/onboarding-preview.tsx` ni se añadieron enlaces en
la navegación de plataforma, signup, sitemap o superficies de marketing.

## Verification

- Tests premium + Smart Pages 5: **18/18 passed**.
- TypeScript focalizado para la nueva ruta: **sin errores**.
- ESLint focalizado: **passed**.
- `npm run build`: **passed** para client, SSR y Nitro; se emitieron artefactos
  de `onboarding-test` en client y SSR.
- `git diff --check`: **passed**; solo permanecen avisos de conversión CRLF/LF
  propios de archivos de trabajo existentes.
- Runtime Chrome: **passed** con flujo real `GENERATING → READY`.
- Metadata: **passed** (`noindex, nofollow, noarchive`).
- Consola del tab: **0 errores / 0 warnings**.
- `/onboarding-preview`: **sin cambios funcionales observados**.

Warnings no bloqueantes existentes del repositorio:

- `vite-tsconfig-paths` recomienda resolución nativa de paths;
- `src/routes/__tests__/pages.routing.test.ts` no exporta `Route` y se omite
  del route tree;
- el build conserva un warning de chunk grande.

## Architecture gates

- `NEW_ROUTE_PATH = /onboarding-test`
- `PREMIUM_ONBOARDING_REUSED = YES`
- `SECOND_ONBOARDING_IMPLEMENTATION = NO`
- `SECOND_ONBOARDING_STATE = NO`
- `SECOND_GENERATION_CHAIN = NO`
- `REAL_SP5_SEAM_USED = YES`
- `REAL_ENGINE_V2_USED = YES`
- `REAL_CANONICAL_VALIDATION = YES`
- `REAL_PUBLIC_TEMPLATE_RENDERER = YES`
- `ENGINE_V2_CHANGED = NO`
- `SMART_PAGES_CHANGED = NO`
- `OWNER_CONTENT_CHANGED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `PERSISTENCE_CHANGED = NO`
- `DB_WRITE = NO`
- `MIGRATION_CREATED = NO`
- `SIGNUP_CHANGED = NO`
- `ONBOARDING_PREVIEW_CHANGED = NO`
- `PLATFORM_NAV_CHANGED = NO`
- `NOINDEX = YES`
- `NOFOLLOW = YES`
- `SITEMAP_CHANGED = NO`
- `MARKETING_LINKS_ADDED = NO`
- `MOCK_GENERATION = NO`
- `FAKE_READY = NO`
- `SAMPLE_MEDIA_USED = NO`
- `SAVE_FAKED = NO`
- `PUBLICATION_FAKED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Success gate

`CRIPQER_PREMIUM_ONBOARDING_TEST_ROUTE_RUNTIME_PASS_FROZEN`

No se inicia automáticamente ninguna tarea posterior.
