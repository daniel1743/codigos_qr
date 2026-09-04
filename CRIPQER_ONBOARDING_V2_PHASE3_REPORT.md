# Cripqer — Onboarding V2 Phase 3 Report

Date: 2026-09-04
Mode: `STRICT_INTERNAL_SEMANTIC_INTEGRATION`
Status: **PHASE_3_STATUS: BLOCKED**

## Resultado ejecutivo

La Fase 3 implementa el adaptador semántico y el wrapper interno de generación
sin persistir ni publicar. El contrato existente de Engine V2 se mantuvo
intacto. La generación de los escenarios reales queda bloqueada de forma
explícita por una incompatibilidad del host congelado:

`internal-entrypoint.ts` convierte `identity.professionOrActivity` en
`business_type`, mientras el validador V1 exige `business_other` para
actividades específicas fuera de su taxonomía. `EngineV2HostGenerationInput`
no expone `business_other`. El adaptador no degrada “Jardinero”, “Veterinaria”
o “Fotógrafo” a una categoría genérica y no llama al Engine con un input que
será rechazado.

| Requisito                              | Resultado                                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 implementada                   | SÍ                                                                                                                               |
| Adaptador implementado                 | SÍ                                                                                                                               |
| Wrapper de generación implementado     | SÍ                                                                                                                               |
| `OnboardingIntentV2` modificado        | NO                                                                                                                               |
| Lógica de negocio Engine V2 modificada | NO                                                                                                                               |
| Power Editor V2 modificado             | NO                                                                                                                               |
| Basic Editor modificado                | NO                                                                                                                               |
| Persistencia canónica modificada       | NO                                                                                                                               |
| Supabase modificado                    | NO                                                                                                                               |
| Rutas públicas modificadas             | NO                                                                                                                               |
| Commerce implementado                  | NO                                                                                                                               |
| Generación jardinero                   | BLOCKED — falta `business_other` en el host                                                                                      |
| Generación veterinaria                 | BLOCKED — falta `business_other` en el host                                                                                      |
| Generación portfolio                   | BLOCKED — falta `business_other` en el host                                                                                      |
| Señal commerce futura                  | BLOCKED — `buy` no existe en el host V1                                                                                          |
| Sin CTA principal                      | NEEDS_INPUT — Engine exige acción/destino                                                                                        |
| Destino inválido                       | PASS — rechazado antes de Engine                                                                                                 |
| Acciones secundarias                   | PARTIAL — URLs HTTPS preservadas como enlaces ordenados; teléfono/handle quedan diagnosticados porque no existe campo secundario |
| Diferencia estructural simple vs rich  | BLOCKED para escenarios reales                                                                                                   |
| Validación `BioTemplateConfig`         | PASS en smoke fixture compatible con taxonomía; BLOCKED para escenarios reales                                                   |
| Pérdida semántica silenciosa           | NO — todas las limitaciones quedan en diagnósticos                                                                               |

## Diagnósticos y reglas de mapeo

- Identidad y bio se mapean a `content.name`, `profession` y `content.bio`.
- Objetivos V2 se transforman al vocabulario exacto disponible (`whatsapp`,
  `booking`, `sell`, `portfolio`, `social`, `leads`).
- Dirección visual solo usa estilos existentes; `let_cripqer_decide` deja el
  default del Engine.
- Necesidades de contenido se mapean a tokens semánticos de
  `selectedFeatures`; valores no consumidos directamente quedan como
  `deferredFields`.
- CTA primaria valida destino y preserva el tipo cuando el host lo soporta.
- Acciones secundarias con URL HTTPS se preservan como `content.links`; las
  restantes no se convierten en URLs inventadas.
- `commercial`, `experienceHint`, densidad, etiquetas y extensiones quedan
  explícitamente diferidos cuando el host no tiene un campo equivalente.
- Referencias de avatar/banner solo pasan si son durables (`https://` o ruta
  relativa segura); nunca se suben archivos.

El wrapper solo devuelve resultados en memoria (`editorConfig`, envelope
preview y metadata del Engine). No ejecuta RPC, `fetch` contra Supabase,
escrituras, publicación ni mutación de perfiles.

## QA y regresiones

- Pruebas adapter + wrapper + Fase 1: **32/32 PASS**.
- Fase 2: **6/6 PASS** dentro del total anterior.
- Smoke del wrapper con actividad compatible: **PASS**, `BioTemplateConfig`
  validado con el validator existente.
- Engine V2 existente: **40/41**; un test preexistente de Pexels esperaba
  `MISSING_API_KEY` y recibió `EMPTY_RESULTS`.
- Power Editor unit tests: **126/126 PASS**. El archivo `h2-audit.spec.ts`
  requiere Playwright y no debe ejecutarse con Vitest.
- ESLint: **PASS** en el alcance onboarding V2.
- Prettier: **PASS**.
- Build Vite/Nitro: **PASS**.
- TypeScript: sin diagnósticos del alcance onboarding V2; el repositorio
  conserva errores globales preexistentes fuera de este alcance.

## Archivos creados o modificados

- `src/lib/onboarding-v2/engine-v2-adapter.ts` — creado.
- `src/lib/onboarding-v2/engine-v2-generation.ts` — creado.
- `src/lib/onboarding-v2/__tests__/engine-v2-adapter.test.ts` — creado.
- `src/lib/onboarding-v2/index.ts` — export del adaptador.
- `src/components/onboarding-v2/state.ts` — aislamiento de imports para no
  cargar Engine en el shell cliente.

No se modificaron `src/lib/parametric-engine-v2/**`,
`src/premium-template-studio/**`, Basic Editor, rutas públicas, migraciones ni
Supabase.

## Decisión de fase

`PHASE_3_STATUS: BLOCKED`

Para continuar con generación real hace falta una fase autorizada que resuelva
la frontera del host (`business_other` para actividades específicas y, por
separado, una política para acciones no representables como `buy`). Esa fase
debe decidir si amplía el contrato del host o modifica la lógica Engine V2.
Fase 3 no realiza ninguno de esos cambios.
