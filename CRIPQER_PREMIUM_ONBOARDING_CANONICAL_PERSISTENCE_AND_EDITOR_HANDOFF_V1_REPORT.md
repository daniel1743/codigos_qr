# CRIPQER PREMIUM ONBOARDING — CANONICAL PERSISTENCE AND EDITOR HANDOFF V1

**Task ID:** `CRIPQER_PREMIUM_ONBOARDING_CANONICAL_PERSISTENCE_AND_EDITOR_HANDOFF_V1`  
**Type:** `CONTROLLED_PRODUCT_INTEGRATION_P0`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## Verdict

`CRIPQER_PREMIUM_ONBOARDING_PERSISTENCE_EDITOR_HANDOFF_RUNTIME_PASS_FROZEN`

Premium onboarding ya no termina en una preview en memoria. Después de la
generación real, el flujo pasa por `PERSISTING`, autentica la sesión, valida la
propiedad del perfil, crea una página hija en `public.pages`, guarda el
`BioTemplateConfig` canónico, hace read-after-write y solo entonces muestra
`READY`. El botón de éxito abre el editor existente de la página hija.

## Root cause and solution

La causa era concreta: `PremiumOnboardingFlow` llamaba a
`generateSmartPageFromOnboardingFn` y ponía `phase = "ready"` inmediatamente,
sin invocar ninguna autoridad de persistencia. Por eso el documento mostrado
era válido, pero no existía una fila hija ni un handoff real.

La solución reutiliza el tramo persistente de PAGES_7. Se extrajo de forma
aditiva `persistGeneratedCanonicalPage()` desde `create-page.ts`; este helper
recibe el documento ya generado y conserva la secuencia existente:

```text
BioTemplateConfig generado
  → validateTemplate
  → pageService.createPage
  → pageCanonicalService.saveDraft
  → lectura propia de public.pages
  → comparación estructural del editorConfig
```

No se ejecuta Engine V2 una segunda vez y no se escribe el canonical principal
del perfil. La única actualización de perfil posterior al éxito es el patch
Basic existente para limpiar el estado de invitación (`declined`), evitando el
bucle que redirigía de `/editor` a `/onboarding-preview` nuevamente.

## Exact flow

```text
PremiumOnboardingFlow
  → Smart Pages 5 + Engine V2 (una vez)
  → BioTemplateConfig + validateTemplate
  → persistPremiumOnboardingGeneratedPageFn
  → persistPremiumOnboardingGeneratedPage (server-only)
  → auth.getUser verificado por Supabase
  → profiles ownership check
  → existing PAGES_7 child-page persistence tail
  → read-after-write
  → existing Basic invite patch
  → READY
  → /pages/{pageId}/edit
```

El server function recibe el `accessToken` de la sesión únicamente como
credencial de transporte; el servidor lo verifica con Supabase y nunca acepta
`userId`, `ownership=true` ni una identidad de propietario desde el cliente.
`profileId` se lee del query param de la ruta, se valida como UUID en el
coordinador y se verifica server-side antes de crear la página.

## State machine

| Estado       | Significado                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `onboarding` | Edición local del draft y del intake.                                        |
| `generating` | Smart Pages 5 + Engine V2 están generando el documento.                      |
| `persisting` | El documento validado se está guardando y verificando.                       |
| `ready`      | Existe una página persistida y verificada; el renderer muestra ese snapshot. |
| `failure`    | Generación, auth, ownership, persistencia o handoff falló.                   |

El botón final queda protegido por un `ref` de envío en curso. Un doble clic no
crea una segunda generación ni una segunda petición de persistencia. Un fallo
de generación no crea páginas y conserva el input local. Un fallo de
persistencia nunca muestra `READY`.

## Handoff and loop fix

La ruta autoritativa inspeccionada es:

`src/routes/pages.$pageId.edit.tsx` →
`<PowerEditorHost target={{ kind: "page", id: pageId }} />`

El resultado entrega `/pages/{pageId}/edit`. La ruta premium recibe ahora
`?profileId=...` mediante `validateSearch`; la aceptación de invitación desde
`/editor` también transporta ese `profileId`. Tras una persistencia completa,
el patch Basic existente marca la invitación como estado no redirigente, por lo
que `/editor` deja de devolver al usuario al onboarding premium.

`READY` ya no afirma que la vista esté “en memoria”. Ahora declara que es un
borrador guardado, todavía no publicado y sin prometer QR, alias ni URL pública.

## Files changed by this task

- `src/lib/page-generator/create-page.ts` — extracción del tramo común de
  persistencia; el flujo PAGES_7 existente continúa usando la misma autoridad.
- `src/lib/onboarding-v2/premium-onboarding-persistence.ts` — coordinador
  server-only de auth, ownership, canonical, persistencia, verificación y
  cierre de handoff.
- `src/lib/onboarding-v2/premium-onboarding-persistence-server.ts` — boundary
  server-safe para la UI.
- `src/lib/onboarding-v2/index.ts` — export del boundary RPC.
- `src/components/onboarding-v2/premium/PremiumOnboardingFlow.tsx` — estados
  `persisting`, persistencia real, bloqueo de doble envío y CTA de editor.
- `src/routes/onboarding-preview.tsx` y `src/routes/onboarding-test.tsx` —
  lectura tipada de `profileId` desde la ruta.
- `src/routes/editor.tsx` — transporte de `profileId` al aceptar la invitación.
- `src/lib/onboarding-v2/__tests__/premium-onboarding-persistence.test.ts` —
  contratos del coordinador.
- `src/components/onboarding-v2/__tests__/premium-onboarding-state.test.tsx` —
  máquina de estados y doble envío.
- este informe.

No se modificaron Engine V2, Smart Pages core/retail, `BioTemplateConfig`,
renderer, migraciones, esquema, media uploader, QR, alias ni Analytics.

## Verification

- Coordinador: **5/5 passed**.
- Máquina de estados premium: **1/1 passed**.
- Regresión combinada Premium + Smart Pages 5 + PAGES_7 + host/retail:
  **44/44 passed** en 7 archivos.
- Regresión previa de creación PAGES_7: **11/11 passed**.
- ESLint focalizado: **passed**.
- `npm run build`: **passed** para client, SSR y Nitro.
- `git diff --check`: **passed**; solo muestra warnings de conversión
  CRLF/LF del working tree existente.

El chequeo TypeScript global conserva errores preexistentes fuera de este task
en `src/lib/onboarding-v2/v1-adapter.ts` y otras áreas antiguas. No se
reportaron errores TypeScript en los archivos nuevos ni en las rutas premium
modificadas.

No se ejecutó una escritura real contra Supabase desde Chrome en este entorno;
el test de integración usa un stub de PostgREST y la prueba live requiere una
sesión autenticada, un `profileId` real y una base disponible. El build sí
confirmó que el coordinador y la persistencia se emiten en SSR/Nitro y que el
cliente recibe solamente el boundary RPC.

## Architecture gates

- `ONE_SMART_PAGES_ENGINE_GENERATION = YES`
- `NO_REGENERATION_DURING_PERSISTENCE = YES`
- `SERVER_SIDE_AUTH_AND_OWNERSHIP = YES`
- `PROFILE_ID_ROUTE_PLUMBING = YES`
- `CHILD_PAGE_AUTHORITY_PUBLIC_PAGES = YES`
- `EXISTING_PAGE_CREATION_AUTHORITY_REUSED = YES`
- `EXISTING_CANONICAL_SAVE_AUTHORITY_REUSED = YES`
- `READ_AFTER_WRITE_VERIFIED = YES`
- `READY_REQUIRES_PERSISTED_PAGE = YES`
- `DUPLICATE_SUBMIT_BLOCKED = YES`
- `INVITE_LOOP_CLEARED_AFTER_SUCCESS = YES`
- `PROFILE_CANONICAL_OVERWRITTEN = NO`
- `SECOND_PERSISTENCE_IMPLEMENTATION = NO`
- `ENGINE_V2_CHANGED = NO`
- `SMART_PAGES_CHANGED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `MEDIA_UPLOAD_IMPLEMENTED = NO`
- `DB_SCHEMA_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `QR_OR_ALIAS_CHANGED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Success gate

`CRIPQER_PREMIUM_ONBOARDING_PERSISTENCE_EDITOR_HANDOFF_RUNTIME_PASS_FROZEN`
