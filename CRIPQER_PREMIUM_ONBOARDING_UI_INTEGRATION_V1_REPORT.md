# CRIPQER PREMIUM ONBOARDING — MAGIC PATTERNS UI INTEGRATION V1

**Task ID:** `CRIPQER_PREMIUM_ONBOARDING_UI_INTEGRATION_V1`  
**Type:** `CONTROLLED_UI_INTEGRATION + REAL_STATE_WIRING + RUNTIME_QA`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Agent:** CODEX

## Verdict

`CRIPQER_PREMIUM_ONBOARDING_UI_INTEGRATION_RUNTIME_VISUAL_PASS_FROZEN`

La referencia visual Magic Patterns se integró en el onboarding V2 existente
como una superficie premium de cinco pasos. La UI usa el estado real de
Onboarding V2 y el intake compartido de owner content; la generación llama al
seam Smart Pages 5 real mediante un boundary server-safe y termina en un
`BioTemplateConfig` validado que se muestra con `PublicTemplateRenderer`.

La superficie continúa en `/onboarding-preview`, que es la ruta interna QA ya
existente (`noindex`, no enlazada desde signup). No se cambió el onboarding V1,
no se activó una nueva ruta productiva y no quedaron dos onboardings activos en
el flujo de registro.

## Reference handling

La fuente visual autorizada fue:

`C:\Users\Lenovo\Downloads\536f68fd-c50a-47e3-b968-edef94c13cdb.zip`

Se reutilizó únicamente como referencia de layout, jerarquía, copy rhythm,
progreso, elección por tarjetas, panel contextual, estados `GENERATING` y
`READY`, y comportamiento responsive. No se copiaron sus DTOs, hook de estado,
media de muestra, generación simulada, toasts de guardado ni runtime React.

La implementación local usa CSS scoped y `lucide-react`; no añadió
`framer-motion` ni dependencias nuevas.

## Component reference mapping

| Referencia Magic Patterns           | Integración Cripqer                             | Resultado                                                                    |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `OnboardingFlow`                    | `PremiumOnboardingFlow`                         | Shell premium de cinco pasos sobre estado real.                              |
| `OnboardingHeader` / `StepProgress` | header y barra `premium-onboarding__progress`   | Progreso numerado, estado activo, navegación hacia atrás y `aria-current`.   |
| `ChoiceCard`                        | `ChoiceGrid` y botones de elección              | Categoría, objetivo, densidad y preferencias con selección real.             |
| `ContextPanel`                      | `ContextPanel`                                  | Panel contextual derivado del paso, objetivo y tipo de contenido.            |
| `PremiumInput` / `FieldError`       | inputs semánticos y `role="alert"`              | Validación antes de avanzar, foco visible y mensajes humanos.                |
| `OfferItemCard`                     | `OfferCard` + `OwnerContentIntakeState`         | Alta, edición y eliminación real de servicios, productos, portafolio o menú. |
| `GeneratingScreen`                  | `GeneratingScreen`                              | Estado visual premium mientras se ejecuta la generación real.                |
| `ReadyScreen` / `PagePreview`       | `ReadyScreen` + `PublicTemplateRenderer`        | Preview canónica real, sin mock ni segundo renderer.                         |
| `sampleImages`                      | Ningún reemplazo                                | No se usan assets de muestra ni hechos ficticios.                            |
| `useOnboarding` / DTO mock          | `OnboardingV2Draft` + `OwnerContentIntakeState` | No se creó un segundo modelo de estado o contenido.                          |

## Architecture authorities

La autoridad permanece distribuida únicamente en los contratos congelados:

- intención: `OnboardingIntentV2` y `buildOnboardingIntentV2`;
- contenido: `OwnerContentInput`;
- edición de contenido: `OwnerContentIntakeState` y sus operaciones puras;
- adaptación: `mapOnboardingIntentV2ToSmartPagesRequest`;
- generación: `generateSmartPageFromOnboarding` → Smart Pages orchestrator →
  host map → PAGES_7 → Engine V2;
- documento final: `BioTemplateConfig`;
- validación/render: `validateTemplate` y `PublicTemplateRenderer`.

### Client/server boundary

La UI no importa el entrypoint server-only del Engine. Se añadió
`src/lib/onboarding-v2/smart-pages-generation-server.ts`, un `createServerFn`
que importa dinámicamente el adapter Smart Pages 5 en el servidor y devuelve
solo el resultado serializable de generación. El componente llama a ese RPC;
el handler llama al `generateSmartPageFromOnboarding` existente. Esto conserva
una sola cadena de generación y evita incluir `internal-entrypoint.ts` en el
bundle cliente.

También se retiró la reexportación del host map server-only desde el barrel
cliente `src/lib/page-generator/index.ts`; los callers server-side importan el
seam directo. Esta corrección fue necesaria para que `/pages/new` y el build
cliente no crucen accidentalmente la frontera de entorno.

## Five-step flow

### 1. Tu negocio

- nombre de marca, actividad y descripción breve;
- categoría mapeada a `BusinessCategoryV2`;
- validación de identidad antes de continuar;
- edición de identidad actualiza el intake compartido, no un DTO paralelo.

### 2. Lo que buscas

Las tarjetas mapean a objetivos existentes: contacto, reservas, productos,
portafolio, menú y presencia. Se conserva la intención real y se deriva el
`experienceHint` compatible; nunca se emite `listings`.

### 3. Tu contenido

El contenido es condicional al objetivo/categoría:

- servicios → `addService`, `updateService`, `removeService`;
- productos → `addProduct`, `updateProduct`, `removeProduct`;
- portafolio → `addPortfolioItem`, `updatePortfolioItem`,
  `removePortfolioItem`;
- menú → `addMenuItem`, `updateMenuItem`, `removeMenuItem`.

Los nombres son obligatorios para avanzar. Descripción, precio, categoría,
enlace y media permanecen opcionales cuando el contrato lo permite. No se
inventan stock, SKU, descuento, rating, checkout, disponibilidad ni claims de
venta.

### 4. Contacto

La UI separa intención de acción y hecho de contacto. Las opciones WhatsApp,
teléfono, email, reserva y sitio web escriben el dato real en `setContact` y
guardan la intención en `OnboardingIntentV2`. El adapter posterior decide si
el destino es representable. No se construyen `wa.me`, dominios ni URLs desde
handles o números.

### 5. Imágenes

Se conserva la composición visual de portada/avatar y preferencia de media. El
repositorio no expone un uploader de onboarding durable y desacoplado, por lo
que esta versión no sube el archivo. El selector solo mantiene localmente el
nombre pendiente, permite omitir y muestra explícitamente “pendiente de carga
segura”. No se genera `blob:`, `data:`, `objectURL`, media de muestra ni éxito
falso.

## Save-later policy

No se añadió botón de “guardar para después” ni toast de guardado. La pantalla
indica de forma verdadera que la información queda en la sesión actual. No se
creó persistencia de onboarding ni una tabla adicional. La generación y el
preview son en memoria; aún no existe publicación, `public_id`, QR, alias ni
URL pública desde esta superficie.

## Generation and READY contract

El botón final no usa una simulación de éxito:

```text
OnboardingV2Draft + OwnerContentIntakeState
        ↓
OnboardingIntentV2 + OwnerContentInput
        ↓
generateSmartPageFromOnboardingFn (server boundary)
        ↓
generateSmartPageFromOnboarding
        ↓
PagePlanV1 → Smart Pages host map → PAGES_7 → Engine V2
        ↓
BioTemplateConfig + validateTemplate
        ↓
PublicTemplateRenderer (preview en memoria)
```

`GENERATING` se pinta antes de la llamada RPC. `READY` solo aparece cuando el
resultado real es exitoso y el documento canónico pasa validación. Si el
adapter falla, la UI muestra `FAILURE` con mensaje humano, rutas de datos
faltantes cuando existen y acciones de reintento/volver. No se muestra preview
de fallback.

El smoke runtime produjo y mostró, con datos de prueba locales:

- `Estudio Norte`;
- actividad `Fotografía`;
- servicio `Sesión inicial`;
- precio `$45.000`;
- teléfono/WhatsApp `+56912345678`.

La preview mostró `BioTemplateConfig · Renderer Cripqer`, el contacto y el
servicio suministrados. La pantalla READY declara que el resultado está en
memoria, no publicado y sin URL pública.

## Responsive and accessibility

Verificado visualmente en:

- desktop: 1366, 1440 y 1920 px;
- tablet: 834 px;
- mobile: 360, 390 y 430 px.

El layout pasa de dos paneles a una columna, reduce la barra a numeración en
móvil, conserva el footer de navegación y mantiene targets táctiles visibles.
Los controles son botones/inputs semánticos con labels, `aria-current`,
`aria-pressed`/`aria-checked`, `role="alert"`, foco visible y soporte de
`prefers-reduced-motion` en el CSS.

## Visual evidence

Las capturas quedaron en `cripqer-premium-onboarding-final/`:

- [desktop 1366 — step 1](cripqer-premium-onboarding-final/desktop-1366-step-1.png)
- [desktop 1440 — step 1](cripqer-premium-onboarding-final/desktop-step-1.png)
- [desktop 1920 — step 1](cripqer-premium-onboarding-final/desktop-1920-step-1.png)
- [tablet 834 — step 1](cripqer-premium-onboarding-final/tablet-step-1.png)
- [mobile 360 — step 1](cripqer-premium-onboarding-final/mobile-360-step-1.png)
- [mobile 390 — step 1](cripqer-premium-onboarding-final/mobile-390-step-1.png)
- [mobile 430 — step 1](cripqer-premium-onboarding-final/mobile-430-step-1.png)
- [desktop — GENERATING real](cripqer-premium-onboarding-final/desktop-generating.png)
- [desktop — READY real](cripqer-premium-onboarding-final/desktop-ready.png)

La interacción desktop fue además inspeccionada en Chrome con accessibility
tree: selección de categoría y objetivo, alta de servicio, selección de
WhatsApp, ingreso del destino real, omisión explícita de imágenes, estado
`GENERATING`, `READY` y render público canónico. La consola no reportó errores.

## Files changed or created by this task

- `src/components/onboarding-v2/premium/PremiumOnboardingFlow.tsx`;
- `src/components/onboarding-v2/premium/premium-onboarding.css`;
- `src/components/onboarding-v2/index.ts` — export de la UI premium y del
  boundary server-safe;
- `src/components/onboarding-v2/__tests__/premium-onboarding.test.tsx`;
- `src/lib/onboarding-v2/smart-pages-generation-server.ts`;
- `src/lib/onboarding-v2/index.ts` — export del boundary sin exponer el
  adapter server-only al cliente;
- `src/lib/page-generator/index.ts` — barrel cliente seguro;
- `src/routes/onboarding-preview.tsx` — la ruta interna QA usa la UI premium;
- `cripqer-premium-onboarding-final/*.png`;
- este informe.

No se modificaron `OnboardingV2Shell.tsx`, el onboarding V1, signup, la UI de
`/pages/new`, el intake compartido, `OwnerContentInput`, Smart Pages core,
Smart Pages retail, `BioTemplateConfig`, el renderer público, Supabase,
migraciones, QR, alias, Analytics o Billing.

## Verification

- componente premium: **4/4 tests passed**;
- regresión focalizada onboarding-v2 + page-generator: **135 passed, 1 skipped**
  en 18 archivos;
- ESLint focalizado: **passed**;
- TypeScript focalizado en UI, route y server boundary: **sin errores**;
- `npm run build`: **passed** para client, SSR y Nitro;
- `git diff --check`: **passed**;
- runtime Chrome local: **passed** en desktop/tablet/mobile y flujo
  `GENERATING → READY`;
- consola del tab durante QA: **0 errores/warnings**.

Warnings no bloqueantes del repositorio:

- `vite-tsconfig-paths` recomienda la resolución nativa de paths;
- `src/routes/__tests__/pages.routing.test.ts` no exporta `Route` y se omite
  del route tree;
- `git diff --check` muestra únicamente avisos de conversión CRLF/LF para
  archivos de trabajo existentes.

## Architecture gates

- `MAGIC_PATTERNS_STATE_IMPORTED = NO`
- `MAGIC_PATTERNS_DTO_IMPORTED = NO`
- `MAGIC_PATTERNS_SAMPLE_MEDIA_IMPORTED = NO`
- `SECOND_ONBOARDING_STATE = NO`
- `SECOND_OWNER_CONTENT_SCHEMA = NO`
- `OWNER_CONTENT_INTAKE_REUSED = YES`
- `ONBOARDING_INTENT_V2_REUSED = YES`
- `SMART_PAGES_5_REAL_SEAM_USED = YES`
- `ONE_ENGINE_BOUNDARY_PER_GENERATION = YES`
- `SERVER_ONLY_ENGINE_IN_CLIENT_BUNDLE = NO`
- `BIO_TEMPLATE_CONFIG_REUSED = YES`
- `PUBLIC_TEMPLATE_RENDERER_REUSED = YES`
- `SECOND_RENDERER = NO`
- `MOCK_PREVIEW = NO`
- `SAMPLE_MEDIA_USED = NO`
- `TEMPORARY_MEDIA_EXPORTED = NO`
- `DURABLE_UPLOAD_FAKED = NO`
- `SAVE_LATER_FAKED = NO`
- `ONBOARDING_DRAFT_PERSISTED = NO`
- `DB_WRITE = NO`
- `MIGRATION_CREATED = NO`
- `PRODUCTION_SIGNUP_SWITCHED = NO`
- `OLD_ONBOARDING_V1_CHANGED = NO`
- `PAGES_NEW_CHANGED = NO`
- `NEW_DEPENDENCY = NO`
- `SMART_PAGES_RUNTIME_USED = NO`
- `GIT_MUTATION_PERFORMED = NO`
- `FABRICATED_OWNER_DATA = NO`
- `CTA_DESTINATION_INVENTED = NO`

## Limitations and next gates

- El uploader duradero de portada/avatar sigue pendiente de una abstracción
  host segura; la pantalla visual ya está preparada para conectarla sin
  exportar temporales.
- No se añadió persistencia de borradores ni publicación; el siguiente handoff
  debe definir explícitamente autenticación, guardado y destino editorial.
- La preview READY no crea una URL pública ni entrega un documento editado al
  Power Editor; ese handoff requiere una tarea posterior autorizada.
- La política P0 de regeneración de documentos ya editados permanece vigente:
  este flujo solo genera un documento nuevo en memoria y no hace merge ni
  reemplazo silencioso.

## Success gate

`CRIPQER_PREMIUM_ONBOARDING_UI_INTEGRATION_RUNTIME_VISUAL_PASS_FROZEN`
