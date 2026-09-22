# CRIPQER ONBOARDING 5B — SHARED OWNER CONTENT INTAKE V1

**Task ID:** `CRIPQER_ONBOARDING_5B_SHARED_CONTENT_INTAKE_V1`  
**Type:** `CONTROLLED_STATE_AND_CONTENT_INTAKE_IMPLEMENTATION`  
**Agent:** CODEX  
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## Verdict

`CRIPQER_ONBOARDING_5B_SHARED_CONTENT_INTAKE_PASS_FROZEN`

Se creó un único módulo de estado de intake, agnóstico de UI, alrededor del
contrato existente `OwnerContentInput`. Permite hidratar, editar, ordenar,
validar y exportar contenido real del propietario para el onboarding actual,
`/pages/new` y una futura UI premium.

El task termina en un `OwnerContentInput` válido. No activa generación Smart
Pages, no crea persistencia y no modifica ninguna UI.

## Intake location and authority

**Shared intake:** `src/lib/onboarding-v2/owner-content-intake.ts`  
**Owner-content authority reused:** `src/lib/page-generator/owner-content.ts`  
**SECOND_CONTENT_SCHEMA = NO**

El intake no redefine servicios, productos, menú, portafolio, eventos, contacto
ni media. Su estado solamente envuelve esos valores con metadata temporal de
edición.

## State model

`OwnerContentIntakeState` contiene:

- `identity`, `contact` y `media` del contrato compartido;
- colecciones de servicios, productos, menú, portafolio y eventos;
- `localId` estable por ítem para la sesión de edición;
- `dirty`, `revision` y `nextLocalId`, exclusivamente transitorios.

La hidratación conserva los IDs de propietario si existen y asigna un ID local
estable cuando no existen. `reorder` mueve el ítem completo, por lo que su
identidad local no cambia. Todas las operaciones devuelven nuevo estado y no
mutan el argumento recibido.

## Operations

### Identity

- `setIdentity`
- `setBusinessName`
- `setShortDescription`

### Services

- `addService`
- `updateService`
- `removeService`
- `reorderServices`

### Products

- `addProduct`
- `updateProduct`
- `removeProduct`
- `reorderProducts`

### Menu

- `addMenuItem`
- `updateMenuItem`
- `removeMenuItem`
- `reorderMenuItems`

### Portfolio

- `addPortfolioItem`
- `updatePortfolioItem`
- `removePortfolioItem`
- `reorderPortfolioItems`

### Events

- `addEvent`
- `updateEvent`
- `removeEvent`
- `reorderEvents`

### Contact and media

- `setContact`
- `setAvatar`
- `setCover`

Los parches de identidad y contacto son parciales: editar email no borra
WhatsApp, teléfono ni booking URL. El borrado es explícito con una clave
presente cuyo valor sea `undefined`, o con `null` para media.

## Export and truth rules

`getOwnerContent()` elimina `localId`, `dirty`, `revision`, `nextLocalId` y
cualquier metadata del intake. Solo exporta los campos del contrato
`OwnerContentInput`, conservando nombres, descripciones, precios, categorías,
destinos y media suministrados.

`exportOwnerContent()` ejecuta la validación compartida y solo devuelve `ok: true`
cuando el resultado es válido. Un borrador incompleto puede permanecer en el
estado y ser inspeccionado mediante `getOwnerContent()`, pero no se presenta
como listo para generación si falla la validación o readiness.

No se crean campos de stock, SKU, descuento, disponibilidad, checkout, rating,
review o testimonial. Los valores ausentes permanecen ausentes.

## Conditional readiness

`getReadiness()` delega directamente en el único `getOwnerContentReadiness()` de
5A. No se creó un sistema competidor.

- servicios: al menos un servicio con nombre;
- catálogo: al menos un producto con nombre;
- menú: al menos un elemento con nombre;
- portafolio: proyecto con nombre y media del propietario;
- landing: identidad y descripción, o contenido compatible.

Un proyecto sin media se conserva como borrador de intake, pero no se reporta
listo. Como corrección mínima demostrada por este task, `media` en
`OwnerPortfolioItemInput` pasó a ser opcional durante edición; readiness sigue
siendo la barrera para el host que requiere media antes de generación.

## Compatibility

### Onboarding V2

`src/lib/onboarding-v2/index.ts` exporta el intake para futuros callers. No se
añadieron pantallas, labels, pasos, progreso ni integración visual. La UI actual
puede seguir usando su flujo existente y una futura UI puede llamar las mismas
operaciones.

### `/pages/new`

La compatibilidad existente de 5A permanece intacta. El route y sus controles no
fueron modificados. El adapter continúa proyectando sus datos mediante
`ownerContentFromGeneratedPageInput()` hacia `OwnerContentInput`.

### Smart Pages

No se activó ningún envío automático a `PageGenerationRequest`, no se tocó el
host mapping y no se ejecutó runtime Smart Pages. El contrato 5A conserva sus
proyecciones puras hacia Smart Pages para la siguiente tarea autorizada.

### Media

El intake acepta únicamente `OwnerMediaReference` ya durable y reutiliza el
validador de 5A. Acepta `https` y referencias relativas durables cuando el
contrato lo permite; rechaza `blob:`, `data:` y URLs inseguras. No implementa
upload, base64, preview temporal ni un nuevo bucket/sistema de media.

### CTA versus owner facts

`setContact` conserva hechos como WhatsApp, email y booking URL. El intake no
crea acciones semánticas ni infiere una CTA a partir de un teléfono o email.
La decisión de CTA permanece bajo la política del host.

## Files changed or created

- `src/lib/onboarding-v2/owner-content-intake.ts`
- `src/lib/onboarding-v2/index.ts` — exports públicos del intake.
- `src/lib/page-generator/owner-content.ts` — ajuste mínimo probado para
  permitir portafolio incompleto durante edición.
- `src/lib/onboarding-v2/__tests__/owner-content-intake.test.ts`
- este informe.

No se modificaron Engine V2, Smart Pages core/retail/host mapping, renderer,
`BioTemplateConfig`, Power Editor, Supabase, migraciones, Analytics, QR,
navegación ni UI.

## Verification

- Intake + contrato OwnerContent + proyecciones: **22/22 tests passed**.
- Regresión 5A/5B: **117/117 tests passed** en **15 archivos**, incluyendo
  Onboarding V2, Page Generator, Smart Pages host/retail y componentes del
  flujo actual.
- ESLint focalizado: **passed**.
- TypeScript focalizado en intake, owner-content y exports: **sin errores**.
- `git diff --check`: **passed**.
- No se ejecutó una afirmación de suite completa del repositorio.

Los warnings de Vitest sobre `vite-tsconfig-paths` y el archivo de tests de
rutas sin export `Route` pertenecen a la configuración existente y no afectaron
el resultado de las pruebas.

## Architecture gates

- `OWNER_CONTENT_AUTHORITY_REUSED = YES`
- `SECOND_CONTENT_SCHEMA = NO`
- `SECOND_ONBOARDING_ENGINE = NO`
- `SECOND_PAGE_GENERATOR = NO`
- `NEW_CATALOG_MODEL = NO`
- `OWNER_CONTENT_PERSISTED = NO`
- `NEW_UPLOAD_SYSTEM = NO`
- `ENGINE_V2_CHANGED = NO`
- `SMART_PAGES_CHANGED = NO`
- `SMART_PAGES_RUNTIME_USED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `ONBOARDING_UI_CHANGED = NO`
- `PAGES_NEW_UI_CHANGED = NO`
- `DB_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `DEPENDENCY_ADDED = NO`
- `GIT_MUTATION_PERFORMED = NO`
- `TRANSIENT_UI_STATE_EXPORTED_AS_OWNER_FACT = NO`
- `TEMPORARY_MEDIA_EXPORTED = NO`
- `FABRICATED_OWNER_DATA = NO`

## Success gate

`CRIPQER_ONBOARDING_5B_SHARED_CONTENT_INTAKE_PASS_FROZEN`

Próxima tarea recomendada —no iniciada automáticamente—:

`SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST`

Trabajo paralelo permitido:

`ONBOARDING_VISUAL_REDESIGN_IN_MAGIC_PATTERNS`
