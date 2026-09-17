# CRIPQER SMART PAGES 5 — ONBOARDING → PAGE GENERATION REQUEST V1

**Task ID:** `CRIPQER_SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST_V1`  
**Type:** `CONTROLLED_HOST_INTEGRATION + CONTRACT_TESTS`  
**Agent:** CODEX  
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## Verdict

`CRIPQER_SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST_PASS_FROZEN`

Se conectó `OnboardingIntentV2` con el contrato existente `OwnerContentInput`
para producir el único `PageGenerationRequest` de Smart Pages. El recorrido
opcional en memoria continúa por el orquestador, el host mapper de Smart Pages,
el adapter PAGES_7 y el Engine V2 existente hasta `BioTemplateConfig`, donde se
ejecuta la validación canónica. No se añadió persistencia, publicación, QR,
alias, renderer, UI ni una segunda cadena de generación.

## Adapter

**ADAPTER_LOCATION:** `src/lib/onboarding-v2/smart-pages-adapter.ts`

**INPUT_CONTRACTS:**

- Requerido: `OnboardingIntentV2`.
- Opcional: `OwnerContentInput` como argumento explícito.
- Si no se entrega el argumento explícito, se reutiliza `intent.ownerContent`.
- Si ambas fuentes están ausentes, se trabaja con contenido vacío y se informa
  readiness cuando la experiencia seleccionada requiere hechos del propietario.

**OUTPUT_CONTRACT:**

- Éxito: el `PageGenerationRequest` existente, `OwnerContentInput` combinado y
  diagnósticos de campos mapeados, diferidos, no soportados y faltantes.
- Incompleto o inválido: `ok: false`, código estable, errores y diagnósticos;
  no se crea un request listo ni se ejecuta generación.

**SECOND_REQUEST_CONTRACT = NO** — el adapter usa directamente
`PageGenerationRequest` de `src/lib/smart-pages/smart-pages.types.ts`.

## Architecture flow

```text
OnboardingIntentV2 + OwnerContentInput
                ↓
src/lib/onboarding-v2/smart-pages-adapter.ts
                ↓
PageGenerationRequest existente
                ↓
generatePagePlan()
                ↓
generateSmartPageWithEngineV2()
                ↓
mapGeneratedPageToEngineInput() / adapter PAGES_7
                ↓
generateCripqerPageWithEngineV2()
                ↓
BioTemplateConfig + validateTemplate()
```

`generateSmartPageFromOnboarding()` es únicamente un seam de generación en
memoria. No llama Supabase, no escribe páginas, no publica y no crea IDs de
página, `public_id`, QR ni alias.

## Field mapping

| Fuente | Destino | Resultado |
| --- | --- | --- |
| `identity.professionOrActivity` | `request.businessType` | Mapeo directo, conservando la actividad libre del propietario. |
| `outcome.primaryGoal` | `request.goal` | `sell → sell`, `bookings → book`, `quote_requests → quote`, `show_portfolio → showcase`; presencia/contacto/servicios y demás objetivos informativos conservan `inform` o `contact` cuando corresponde. |
| `scope.density` | `request.density` | `simple → minimal`, `complete → rich`, `auto → balanced`. |
| `commercial.mode` | `request.salesMode` | Se conservan `booking`, `quote`, `contact`; `display_only → info`; `sell` no crea checkout y queda diferido. |
| `ownerContent` | `request.content` | Se delega en `ownerContentToPageGenerationRequest()` y su proyección existente a `NormalizedContentV1`. |
| `outcome.experienceHint` + objetivo + contenido real | `request.preferences.experienceType` | Selecciona `services`, `catalog`, `menu`, `portfolio` o `landing`; nunca emite `listings`. |
| `variant`, `maxPages` | `request.preferences` | Se transportan solo si el caller los entrega. No activan fan-out ni persistencia. |

No se añadió una dependencia de UI sobre `scope.density`; se preserva por
compatibilidad semántica con el request actual.

## Owner content mapping

Se reutilizan los helpers ya congelados de 5A/5B:

- `ownerContentToNormalizedContent()`;
- `ownerContentToPageGenerationRequest()`;
- `getOwnerContentReadiness()`;
- `validateOwnerContentInput()`.

Se transportan sin inventar:

- servicios → catálogo `services`;
- productos → catálogo `catalog`;
- menú → catálogo `menu`, con categorías existentes mediante
  `categories`/`categoryId`;
- portafolio → catálogo `portfolio`, con media y destino real;
- eventos → el contrato compartido existente, sin crear una experiencia nueva;
- identidad → `business.name` y `business.about`;
- contacto → teléfono, WhatsApp, email y booking URL donde los contratos
  existentes los representan;
- avatar y cover → media global normalizada cuando la referencia es durable.

Nombres, descripciones, precios como etiquetas, categorías, enlaces e imágenes
se conservan desde el propietario. Un precio ausente no se convierte en cero ni
en una etiqueta inventada. Una imagen o destino ausente no se sustituye.

### Host compatibility projection

La normalización existente guarda el destino de un ítem como `item.action`.
Antes de pasar el request al host mapper, el adapter agrega únicamente un
atributo derivado `url` cuando no existe ya, para que el host actual pueda leer
el enlace real del propietario. No se crea un nuevo esquema ni se duplica el
modelo de catálogo; es una proyección de compatibilidad dentro del mismo
`PageGenerationRequest`.

## CTA policy

La intención de acción y el destino son fuentes distintas:

- una intención `whatsapp` se combina con `ownerContent.contact.whatsapp` solo
  cuando existe un valor real;
- `call`, `email`, `book` y `request_quote` usan únicamente el hecho de contacto
  correspondiente o el valor explícito de la intención;
- `website`, `buy` y `menu` usan un destino explícito de la intención; si falta,
  quedan deshabilitados y diagnosticados;
- `externalUrl` permanece como hecho del propietario y no se promueve
  automáticamente a CTA primaria, respetando la política del host;
- `follow` y acciones no representables permanecen diferidas;
- las acciones secundarias sin destino real no se emiten como enlaces.

**CTA_DESTINATION_INVENTED = NO.** El adapter no construye `wa.me`, no concatena
números, no transforma handles en URLs y no asigna dominios ficticios.

## Readiness

**READINESS_AUTHORITY:** el único `getOwnerContentReadiness()` de 5A. El
adapter traduce sus issues a su propia salida de diagnóstico, pero no crea un
sistema competidor.

| Experiencia | Requisito aplicado |
| --- | --- |
| `services` | Al menos un servicio con nombre válido. |
| `catalog` | Al menos un producto con nombre; además, el host actual requiere media de imagen real para cada producto que se emita. |
| `menu` | Al menos un elemento de menú con nombre válido. |
| `portfolio` | Proyecto con nombre, media de imagen real, destino real y cover global cuando lo exige el host actual. |
| `landing` | Identidad con nombre y descripción, o contenido compatible del propietario. |

La ausencia de `ownerContent` en un payload legacy no invalida Onboarding V2;
solo significa que la ruta Smart Pages puede no estar lista para generar. Los
campos opcionales —por ejemplo precio de servicio o media de servicio—
permanecen ausentes en el request si el propietario no los proporcionó.

**MISSING_OWNER_FACTS_DIAGNOSED = YES.** Los paths se devuelven, por ejemplo,
como `services`, `products[0].media`, `portfolioItems[0].destination` o
`actions.primary.whatsapp.destination`.

## Retail

Para catálogo se reutiliza el recorrido de Smart Pages 4 mediante el host map
existente. El adapter solo produce la solicitud semántica; no duplica lógica de
productos destacados, rails o diagnósticos retail.

Se mantienen diferidos, sin campos canónicos inventados:

- tiles de categorías de primera clase;
- rail de colección secundaria;
- benefits strip;
- densidad retail explícita;
- rich product detail;
- stock, SKU, descuento, disponibilidad y checkout.

La salida retail soportada continúa siendo producto/product-grid, nombre,
descripción, precio, media, enlace real, CTA soportada y layout existente.

## Legacy and activation policy

**LEGACY_ONBOARDING_STILL_VALID = YES.** Los payloads V2 sin `ownerContent`
siguen pasando `validateOnboardingIntentV2()`. El adapter existente
`Onboarding V2 → Engine V2` no fue eliminado ni reemplazado.

**CURRENT_ONBOARDING_UI_CHANGED = NO**  
**PAGES_NEW_CHANGED = NO**

La UI actual no cambia automáticamente a Smart Pages. La integración queda
disponible para una futura UI premium que reúna el intake compartido y luego
llame este adapter cuando existan los hechos requeridos.

## Premium UI integration surface

**PREMIUM_UI_INTEGRATION_READY = YES**

La futura UI puede permanecer ajena a Engine V2 y trabajar con esta superficie:

1. Mantener `OnboardingIntentV2` para intención, objetivo, densidad y acciones.
2. Usar `OwnerContentIntake` para hidratar, editar, ordenar, validar y exportar
   `OwnerContentInput`.
3. Llamar `mapOnboardingIntentV2ToSmartPagesRequest(intent, { ownerContent })`.
4. Mostrar `diagnostics.missingOwnerFacts` cuando `ok` sea falso.
5. Llamar `generateSmartPageFromOnboarding()` solo después de readiness; recibir
   el plan y el `BioTemplateConfig` en memoria para el handoff existente.

La señal de generación lista es `ok: true` del adapter, después de validación de
owner content, validación de intención, readiness y requisitos adicionales del
host. La respuesta no expone internals del Engine ni crea una autoridad de
persistencia.

## End-to-end contract smoke

Se verificaron en memoria los cuatro escenarios requeridos:

- servicios: nombre, precio y WhatsApp real preservados;
- catálogo: producto, precio, media y destino preservados, con ruta retail
  compatible;
- portafolio: proyecto, media, cover y destino reales preservados;
- menú: elemento, precio y categoría preservados.

Cada escenario recorrió `PageGenerationRequest → PagePlanV1 → Smart Pages host
mapper → PAGES_7 → Engine V2` y terminó con `validateTemplate(editorConfig).valid
=== true`. Los documentos resultantes no se escribieron en la base de datos.

**SMART_PAGES_ORCHESTRATOR_USED = YES**  
**SMART_PAGES_HOST_MAPPING_USED = YES**  
**ENGINE_V2_USED = YES**  
**REAL_VALIDATE_TEMPLATE_RESULT = PASS**  
**DB_WRITE = NO**  
**ONE_ENGINE_BOUNDARY_PER_GENERATION = YES**

## Regeneration safety

Este task conserva la política congelada de **new document generation only**.
El seam no recibe ni reemplaza un `BioTemplateConfig` editado. No existe merge
silencioso de regeneración; el riesgo P0 documentado en la reconciliación de
capacidades sigue fuera de alcance.

## Files changed or created by this task

- `src/lib/onboarding-v2/smart-pages-adapter.ts` — adapter y seam en memoria.
- `src/lib/onboarding-v2/index.ts` — export público mínimo.
- `src/lib/onboarding-v2/__tests__/smart-pages-adapter.test.ts` — contratos y
  smoke end-to-end.
- este informe.

Los cambios previos de 5A/5B, Smart Pages 2/3/4 y sus archivos permanecieron
intactos. No se modificó la UI, el intake congelado, el contrato
`OwnerContentInput`, Smart Pages core/retail/host map, Engine V2 interno,
`BioTemplateConfig`, renderer, editor, Supabase, migraciones, QR, alias,
Analytics o Billing.

## Verification

- Nueva suite SP5: **14/14 tests passed** en 1 archivo.
- Regresión ampliada 5A/5B + onboarding legacy + host/retail Smart Pages + Page
  Generator: **125/125 tests passed** en 15 archivos; la suite focalizada SP5
  quedó en **14/14**.
- ESLint focalizado sobre adapter, export y suite: **passed**.
- TypeScript focalizado: sin errores en adapter, export ni suite SP5.
- `git diff --check`: **passed**; Git solo mostró warnings de conversión
  CRLF/LF para archivos de trabajo existentes.
- TypeScript global: mantiene errores preexistentes fuera de este alcance; no se
  modificaron archivos ajenos para corregirlos.

Los warnings de Vitest sobre `vite-tsconfig-paths` y el archivo de tests de
rutas sin export `Route` pertenecen a la configuración existente y no
afectaron el resultado de las pruebas.

## Architecture gates

- `ONE_ONBOARDING_INTENT_CONTRACT = YES`
- `ONE_OWNER_CONTENT_CONTRACT = YES`
- `SECOND_REQUEST_CONTRACT = NO`
- `SECOND_SMART_PAGES_ADAPTER_CHAIN = NO`
- `SECOND_PAGE_GENERATOR = NO`
- `SMART_PAGES_CORE_CHANGED = NO`
- `SMART_PAGES_RETAIL_CHANGED = NO`
- `ENGINE_V2_CHANGED = NO`
- `CANONICAL_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `OWNER_CONTENT_CHANGED = NO`
- `OWNER_CONTENT_PERSISTED = NO`
- `ONBOARDING_UI_CHANGED = NO`
- `PAGES_NEW_CHANGED = NO`
- `DB_WRITE = NO`
- `DB_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `DEPENDENCY_ADDED = NO`
- `SMART_PAGES_RUNTIME_USED = NO`
- `FABRICATED_OWNER_DATA = NO`
- `CTA_DESTINATION_INVENTED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Success gate

`CRIPQER_SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST_PASS_FROZEN`

Próximas tareas —no iniciadas automáticamente—:

- `ONBOARDING_VISUAL_REDESIGN_IN_MAGIC_PATTERNS`;
- `PREMIUM_ONBOARDING_UI_INTEGRATION`;
- `SMART_PAGES_6_MINISITE_MULTI_PAGE_FANOUT`.
