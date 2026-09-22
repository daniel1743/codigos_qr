# Cripqer — Menu Default Approved Reference V1

**Modo:** `EXACT_REFERENCE_CAPTURE_AND_STARTER_FREEZE`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_FREEZE_APPROVED_MENU_REFERENCE_AS_DEFAULT_STARTER_V1`

## Approved reference capture

Lectura solo lectura de `public.pages`:

| Campo | Valor |
|---|---|
| Page ID | `33b083d9-7387-44cc-ac78-889a91bf0a1a` |
| Title | `DONDE MI NEGRO` |
| Page type | `menu` |
| Template config | presente y parseable |
| Persisted template identifier | `creator-premium-001` |
| Metadata name | `Creator Premium` |
| Theme | `aurora` / `Aurora` |
| Layout | `centered` / header `overlap` |
| Avatar | `showAvatar=false`, asset presente |
| Cover | `full-bleed`, banner habilitado |

La referencia no fue editada, guardada, publicada, normalizada ni usada como
fixture descartable.

## Reference fingerprint

```text
block_count: 4
block_signature: buttonGroup -> heading -> productGrid -> contact
block_ids:
  block_b66d11b7 -> block_cc4983c7 -> block_dc4480cd -> block_f90723e5
template_source_identifier: creator-premium-001
starter_identifier: menu-default-v1
theme_identifier: aurora
layout_identifier: centered
```

La configuración conserva composición, orden, IDs, copia de menú, productos,
CTAs, portada, ubicación, tema, espaciado y configuración visual capturados de
la referencia. No se reconstruyó desde el nombre de la biblioteca.

## Starter congelado en código

Se agregó `menu-default-v1` a `recipeRegistry.ts` como configuración propia del
repositorio. No consulta la fila de Supabase en runtime y queda seleccionado
por `createPageStarterConfig` para `pageType=menu`.

La identidad estática `DONDE MI NEGRO` es solo fuente de construcción. El título
introducido por el usuario reemplaza `metadata.name` y `profile.name`; la copia
`Nuestro menú` permanece intacta. El starter inicia con `showAvatar=false`.

El panel de plantillas no fue alterado: es el starter inicial, no una plantilla
bloqueada.

## Archivos modificados

- `src/premium-template-studio/templates/recipeRegistry.ts`
- `src/components/power-editor/pageStarterConfig.ts`
- `src/components/power-editor/__tests__/pageStarterConfig.test.ts`
- `src/premium-template-studio/__tests__/menuDefaultV1.test.ts`

No se modificaron Publish, routing, QR, Bio, RPC ni páginas existentes.

## Verificación

`7 test files passed; 39 tests passed`  
`eslint: PASS para los archivos específicos del cambio`  
`git diff --check: PASS`

Las pruebas comprueban la huella, el mapeo `menu-default-v1`, la propagación
de `QA Menu Reference Clone`, la persistencia de `Nuestro menú` y la ausencia
de la identidad estática en `profile.name`.

## Runtime

No se ejecutó todavía `/pages/new` con `Restaurante Aurora`, hard reload y
cambio posterior desde Templates. El canal de automatización del editor ya
estaba bloqueado en ejecuciones anteriores; no se afirma PASS runtime.

## Resultado

`APPROVED_REFERENCE_CAPTURE_PASS`  
`MENU_DEFAULT_STARTER_FINGERPRINT_PASS`  
`MENU_DEFAULT_STARTER_CONSTRUCTION_PASS`  
`MENU_USER_TITLE_PROPAGATION_PASS`  
`EXISTING_PAGES_UNCHANGED`

Estado global: `MENU_DEFAULT_CODE_PASS_RUNTIME_CERTIFICATION_PENDING`

No se emite todavía `CRIPQER_MENU_DEFAULT_V1_APPROVED_REFERENCE_FROZEN`.

**STOP_AFTER:** `true`
