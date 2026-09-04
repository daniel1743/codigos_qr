# Cripqer — Onboarding V2 Phase 3 Unblock Report

Date: 2026-09-04
Mode: `STRICT_MINIMAL_CONTRACT_FIX`
Status: **PHASE_3_STATUS: READY**

## Resultado ejecutivo

El bloqueo original fue confirmado y resuelto con el cambio mínimo permitido:
el host de Engine V2 ahora acepta un campo opcional `businessOther` para
transportar la actividad específica cuando `profession` no coincide con el
catálogo normalizado. El host lo convierte al campo existente
`business_other` del intent V1 antes de la validación.

La actividad específica se conserva en dos lugares semánticos:
`profession: "Jardinero"` y `businessOther: "Jardinero"`. No se degrada a
`local`, `professional`, `creator` ni a otra categoría genérica. Las
actividades reconocidas continúan sin un campo custom adicional.

No se modificaron scoring, candidatos, estrategia de generación, selección de
layout, media, renderer, editores, persistencia, Supabase, Commerce ni rutas
públicas.

| Verificación | Resultado |
| --- | --- |
| Original blocker confirmed | **YES** |
| Host input contract modified | **YES** |
| Field added/reused | `businessOther?: string \| null` — new optional host seam |
| Engine V2 business logic modified | **NO** |
| Engine V2 scoring modified | **NO** |
| Power Editor V2 modified | **NO** |
| Basic Editor modified | **NO** |
| Canonical persistence modified | **NO** |
| Supabase modified | **NO** |
| Public routes modified | **NO** |
| Commerce implemented | **NO** |

## Trace forense confirmado

- `src/lib/parametric-engine-v2/internal-entrypoint.ts` define
  `EngineV2HostGenerationInput` extendiendo `CripqerOnboardingIntentV1`.
- El mismo archivo convertía `profession` en `business_type` y fijaba
  `business_other: null`.
- `src/lib/parametric-engine-v2/normalize.ts` ejecuta
  `normalizeBusinessCategory(business_type)` y exige un `business_other` de al
  menos dos caracteres cuando el resultado es `other`.
- `Jardinero`, `Veterinaria` y `Fotógrafo` no pertenecen al catálogo actual,
  por lo que eran rechazados aunque fueran valores válidos de actividad libre.
- No existía otro campo semánticamente equivalente en el límite del host.

## Cambio aplicado

1. Se agregó `businessOther?: string | null` a
   `EngineV2HostGenerationInput`.
2. `toEngineIntent` propaga el valor trimmeado a `business_other`; los valores
   ausentes continúan produciendo `null`.
3. El adaptador V2 conserva `professionOrActivity` como `profession` y, solo
   cuando la actividad es custom, lo asigna también a `businessOther`.
4. La validación del host no se debilitó: un custom vacío sigue fallando con
   el issue `business_other` requerido.

## QA funcional

| Caso | Resultado |
| --- | --- |
| Jardinero mapping | **PASS** |
| Veterinaria mapping | **PASS** |
| Fotógrafo mapping | **PASS** |
| Specific profession preserved | **YES** |
| Generic degradation detected | **NO** |
| Simple gardener generation | **PASS** |
| Rich veterinarian generation | **PASS** |
| Portfolio/photographer generation | **PASS** |
| Future commerce semantic fixture | **Same prior status** — `buy` remains unsupported by the current host |
| Secondary actions preserved | **PASS** for HTTPS URLs as ordered content links; phone/handles remain explicitly deferred |
| Invalid destination behavior | **PASS** |
| Generated `BioTemplateConfig` valid | **YES** |
| Recognized activities unchanged | **PASS** — no `businessOther` is added for host-recognized values |
| Adapter deterministic and source intent immutable | **PASS** |

## Regression gates

- Onboarding V2 tests: **37/37 PASS** (includes the previous 32/32 suite).
- Engine V2 tests: **40/41 PASS** when run in isolation with the suite timeout
  extended for the existing candidate-count test.
- Pexels failure status: **PRE_EXISTING_UNRELATED**. The same test still
  expects `MISSING_API_KEY` but receives `EMPTY_RESULTS`; no Pexels/media code
  was changed.
- TypeScript: **SCOPED PASS** — no diagnostics in the changed host/adaptor
  scope. Full-repository `tsc --noEmit` remains non-zero because of existing
  unrelated diagnostics in admin, Basic Editor, routes and `vite.config.ts`.
- ESLint: **PASS** for the changed host, adapter and focused test.
- Prettier: **PASS**.
- Build: **PASS** (`npm run build`).

## Files inspected

- `src/lib/parametric-engine-v2/internal-entrypoint.ts`
- `src/lib/parametric-engine-v2/normalize.ts`
- `src/lib/parametric-engine-v2/types.ts`
- `src/lib/onboarding-v2/engine-v2-adapter.ts`
- `src/lib/onboarding-v2/engine-v2-generation.ts`
- `src/lib/onboarding-v2/__tests__/engine-v2-adapter.test.ts`
- `src/lib/onboarding-v2/fixtures.ts`
- `src/lib/onboarding-v2/types.ts`
- `src/lib/onboarding-v2/validation.ts`
- `CRIPQER_ONBOARDING_V2_PHASE3_REPORT.md`

## Files modified

- `src/lib/parametric-engine-v2/internal-entrypoint.ts`
- `src/lib/onboarding-v2/engine-v2-adapter.ts`
- `src/lib/onboarding-v2/__tests__/engine-v2-adapter.test.ts`
- `CRIPQER_ONBOARDING_V2_PHASE3_UNBLOCK_REPORT.md`

No unrelated pre-existing change was staged. The working-tree entry
`PROYECTO PARA INTEGRA A QR` remains untouched.

## Guardrails confirmed

- Onboarding V2 contract: **NOT modified**.
- Engine V2 business logic, scoring and candidate generation: **NOT modified**.
- Power Editor V2 and Basic Editor: **NOT modified**.
- `BioTemplateConfig` and canonical persistence: **NOT modified**.
- Supabase/schema/migrations: **NOT modified**.
- Public routes and Commerce: **NOT modified**.
- No profession enum or hard-coded profession catalogue was expanded.
- No validation failure was silenced and no assertion was weakened.

## Commit

Implementation commit hash: **PENDING — recorded immediately after commit**.

## Final status

`PHASE_3_STATUS: READY`
