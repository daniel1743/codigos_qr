# CRIPQER ONBOARDING 5A — ADDITIVE OWNER CONTENT CONTRACT V1

**Task ID:** `CRIPQER_ONBOARDING_5A_ADDITIVE_OWNER_CONTENT_CONTRACT_V1`  
**Type:** `CONTROLLED_ADDITIVE_CONTRACT_IMPLEMENTATION`  
**Agent:** CODEX  
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## Verdict

`CRIPQER_ONBOARDING_5A_ADDITIVE_OWNER_CONTENT_CONTRACT_PASS_FROZEN`

Se añadió un único contrato host compartido, opcional y transitorio para que
Onboarding V2 y el creador actual de `/pages/new` puedan transportar hechos
estructurados del propietario. El contrato se proyecta hacia los contratos ya
existentes del Page Generator, Engine V2 y Smart Pages; no se convirtió en una
nueva base de datos, esquema canónico, renderer o motor de generación.

## Contrato creado

**Autoridad:** `src/lib/page-generator/owner-content.ts`

El tipo público es `OwnerContentInput` y contiene:

- identidad opcional: `businessName`, `shortDescription`;
- `services`, `products`, `menuItems` y `portfolioItems`;
- `events`, como extensión mínima para conservar el objetivo de evento que ya
  existe en `/pages/new`;
- hechos de contacto: `whatsapp`, `phone`, `email`, `bookingUrl`,
  `externalUrl`;
- media global opcional: `avatar` y `cover`.

Los elementos conservan nombre, descripción, precio cuando fue entregado,
media, categoría de menú y destinos suministrados. Los precios no se parsean ni
se convierten a cantidades; el texto del propietario se conserva como etiqueta.

### Media

`OwnerMediaReference` reutiliza la forma existente de `MediaAssetV1`, haciendo
opcionales únicamente `id` y `alt`, que `/pages/new` no puede proporcionar sin
inventarlos. Se aceptan referencias durables `https://` o rutas relativas
durables; se rechazan `blob:`, `data:` y referencias no seguras. No se creó un
sistema de upload, base64, preview temporal ni almacenamiento adicional.

### Verdad de los datos

- Ningún nombre, descripción, precio, imagen, teléfono, WhatsApp, email,
  dirección, horario, stock, SKU, review o testimonial se inventa.
- Los campos opcionales ausentes permanecen ausentes.
- La proyección normalizada puede crear IDs deterministas y metadatos de
  revisión (`price`, `media`) porque son metadata estructural, no hechos de
  negocio.
- La ausencia de contenido se diagnostica; no se completa silenciosamente.

## Integración de Onboarding V2

Se modificaron de forma aditiva:

- `src/lib/onboarding-v2/types.ts`: `ownerContent?: OwnerContentInput`;
- `src/lib/onboarding-v2/validation.ts`: validación opcional con paths
  `ownerContent.*`;
- `src/components/onboarding-v2/state.ts`: el builder acepta un tercer
  argumento opcional `ownerContent` para futuros host callers.

Los payloads V2 existentes sin `ownerContent` siguen siendo válidos. No se
hicieron obligatorios servicios, productos, media ni contacto. No se modificó
ninguna pantalla, label, ruta, flujo visual ni preview de onboarding.

## Integración de `/pages/new`

No se modificó la UI ni la ruta. El adaptador existente ahora usa:

`GeneratedPageInput → ownerContentFromGeneratedPageInput() → OwnerContentInput`

El mismo contrato se usa después para:

- construir la intención V2 mediante `buildGeneratedPageIntent`;
- construir los `ContentSourceV2` ya existentes mediante
  `ownerContentToEngineContentBlocks`.

Se conservaron los seis objetivos actuales, incluidos `promotion` y `event`.
WhatsApp, email, reserva, sitio y follow continúan siendo acciones/CTA del
host; los hechos de contacto no se mezclan con la intención semántica.

## Proyecciones disponibles

### Smart Pages

`ownerContentToNormalizedContent()` proyecta a `NormalizedContentV1` y conserva
catálogos de servicios, productos, menú y portafolio, incluidas categorías de
menú, precios como `PriceV1.label`, media y destinos como acciones externas.

`ownerContentToPageGenerationRequest()` construye el `PageGenerationRequest`
existente a partir de contexto explícito (`goal`, `density`, `salesMode` y
acciones). No ejecuta generación ni activa el runtime onboarding → Smart Pages.

### Engine V2

`ownerContentToEngineContentBlocks()` usa las formas existentes de
`ContentSourceV2`: `services`, `products`, `portfolio`, `events`, `contact`,
`bookingUrl` y `about`. El adaptador PAGES_7 sigue siendo la autoridad de
entrada; no se modificó `parametric-engine-v2` ni su entrypoint.

Cuando el host exige media para un producto o proyecto, la validación actual de
`/pages/new` continúa siendo la barrera previa a la generación. Un contrato
parcial puede conservar el hecho sin prometer que ya está listo para renderizar.

## Diagnósticos de readiness

`getOwnerContentReadiness()` es condicional y no impone requisitos globales:

| Experiencia | Diagnóstico mínimo                              |
| ----------- | ----------------------------------------------- |
| `services`  | al menos un servicio con nombre                 |
| `catalog`   | al menos un producto con nombre                 |
| `menu`      | al menos un elemento con nombre                 |
| `portfolio` | proyecto con nombre y media del propietario     |
| `landing`   | identidad + descripción, o contenido compatible |

Estos diagnósticos no escriben en base de datos ni sustituyen la validación
canónica o la validación específica de `/pages/new`.

## Archivos modificados/creados dentro del alcance

- `src/lib/page-generator/owner-content.ts`
- `src/lib/page-generator/intent.ts`
- `src/lib/page-generator/adapter.ts`
- `src/lib/page-generator/index.ts`
- `src/lib/onboarding-v2/types.ts`
- `src/lib/onboarding-v2/validation.ts`
- `src/components/onboarding-v2/state.ts`
- `src/lib/page-generator/__tests__/owner-content.test.ts`
- `src/lib/onboarding-v2/__tests__/owner-content-contract.test.ts`
- este informe.

Los cambios Smart Pages 4 y el informe de readiness que ya estaban en el
working tree pertenecen a tareas anteriores y no fueron modificados por este
task.

## Verificación

- Contrato nuevo: **14/14 tests passed**.
- Regresión ampliada Page Generator + Smart Pages host/retail + Onboarding V2:
  **109/109 tests passed** en 14 archivos.
- ESLint focalizado sobre todos los archivos nuevos/modificados: **passed**.
- TypeScript focalizado: **sin errores en los archivos nuevos o modificados**.
- TypeScript global: mantiene errores preexistentes fuera de este alcance;
  no se corrigieron archivos ajenos para evitar ampliar el task.
- `git diff --check`: **passed**.

Los avisos de Vitest sobre `vite-tsconfig-paths` y el archivo de tests de rutas
sin export `Route` son warnings del repositorio y no fallaron las pruebas.

## Architecture gates

- `SECOND_OWNER_CONTENT_SCHEMA = NO`
- `OWNER_CONTENT_PERSISTED = NO`
- `ONBOARDING_UI_CHANGED = NO`
- `PAGES_NEW_UI_CHANGED = NO`
- `ENGINE_V2_CHANGED = NO`
- `BIO_TEMPLATE_CONFIG_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `SMART_PAGES_CORE_CHANGED_BY_THIS_TASK = NO`
- `SMART_PAGES_RETAIL_CHANGED_BY_THIS_TASK = NO`
- `DB_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `NEW_DEPENDENCY = NO`
- `SMART_PAGES_RUNTIME_USED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Limitaciones explícitas

- Onboarding V2 actualmente no captura registros estructurados desde su UI; el
  parámetro opcional permite que un host futuro los inyecte sin rediseñar las
  pantallas.
- No se activó todavía el flujo `Onboarding V2 → PageGenerationRequest →
Smart Pages`; únicamente se dejó la proyección pura disponible.
- `externalUrl` es un hecho de destino del propietario, pero no se convierte
  automáticamente en una acción primaria; esa decisión continúa bajo la
  política CTA del host.
- No se añadió merge de regeneración sobre un `BioTemplateConfig` ya editado.

## Success gate

`CRIPQER_ONBOARDING_5A_ADDITIVE_OWNER_CONTENT_CONTRACT_PASS_FROZEN`

Próximas tareas —no iniciadas automáticamente—:

`ONBOARDING_5B_SHARED_CONTENT_INTAKE`  
`SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST`  
`ONBOARDING_VISUAL_REDESIGN`
