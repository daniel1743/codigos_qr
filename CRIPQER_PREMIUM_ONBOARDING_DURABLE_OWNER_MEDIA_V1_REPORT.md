# CRIPQER PREMIUM ONBOARDING — DURABLE OWNER MEDIA V1

**Task ID:** `CRIPQER_PREMIUM_ONBOARDING_DURABLE_OWNER_MEDIA_V1`  
**Type:** `CONTROLLED_MEDIA_PRODUCT_INTEGRATION`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Agent:** CODEX

## Verdict

`IMPLEMENTED_WITH_LIVE_FILE_UPLOAD_UNVERIFIED`

Premium onboarding ya no conserva únicamente el nombre de un archivo. La UI
usa el almacenamiento Supabase existente y, después de una subida exitosa,
guarda una `OwnerMediaReference` durable en el intake compartido. El contrato,
la validación, el flujo de estados y la propagación hacia OwnerContent,
Smart Pages, Engine V2 y el documento canónico quedaron verificados por código,
pruebas y build.

El smoke de archivo real contra la sesión Chrome/Supabase no pudo completarse:
la API de automatización expuso `filechooser`, pero rechazó
`fileChooser.setFiles(...)` con `Not allowed`, antes de que la aplicación
recibiera el archivo. No se simuló éxito, no se creó una URL falsa y no se
creó otra página QA.

## Phase 0 — existing authority audit

Se confirmó una autoridad segura ya disponible:

- bucket `avatars`, usado por el editor para avatar y media de tarjetas;
- bucket `banners`, usado por el editor para portada/banner;
- políticas de Storage con el primer segmento de la ruta igual a
  `auth.uid()`;
- MIME existentes: `image/jpeg`, `image/png`, `image/webp`;
- límite existente de avatar/media: 3 MB;
- límite existente de banner: 4 MB;
- cliente browser: `createBrowserClient` con la sesión normal del usuario;
- contrato reutilizado: `OwnerMediaReference`, basado en `MediaAssetV1`.

No se creó bucket, migración, service-role shortcut, uploader paralelo ni
nuevo contrato de contenido.

## Implementation

### Durable upload adapter

`src/lib/onboarding-v2/owner-media-upload.ts` es un adaptador delgado sobre
los buckets existentes. Sus reglas son:

- `avatar` → `avatars`, máximo 3 MB;
- `cover` → `banners`, máximo 4 MB;
- `item` → `avatars`, máximo 3 MB.

La sesión autenticada determina el `userId`; la UI no puede elegirlo. La ruta
usa el patrón existente `userId/power-editor/...`, `upsert: false` y conserva
el MIME original. La referencia retornada contiene `id`, URL pública durable,
`kind: "image"` y alt text.

Se rechazan antes de subir:

- MIME que no sean JPG, PNG o WebP;
- archivos sobre el límite del slot;
- ausencia de sesión;
- errores de Storage;
- URLs `blob:` o `data:` como resultado.

La eliminación solo acepta referencias cuyo `id` está bajo la carpeta del
usuario autenticado. Una referencia de otro usuario nunca se elimina.

### PremiumOnboardingFlow

`PremiumOnboardingFlow` ahora conecta `OwnerMediaIntakeState` con el adaptador
durable para:

- portada y avatar globales;
- imagen por producto;
- imagen por proyecto de portafolio;
- reemplazar, quitar, reintentar y mostrar errores;
- estados `idle`, `uploading`, `uploaded` y `failed`;
- bloqueo de generación mientras existe una subida en curso.

Los productos siempre muestran el campo de destino, aunque esté vacío. Las
imágenes de producto y portafolio se escriben en sus respectivos elementos del
intake, no en un DTO paralelo. El export normal continúa eliminando metadata
transitoria y solo entrega `OwnerContentInput`.

La preferencia de media pasa a `own_media` únicamente después de una subida
exitosa. Una selección fallida no crea referencia ni pasa readiness.

## Propagation contract

```text
authenticated browser upload
  → existing avatars/banners Storage authority
  → OwnerMediaReference
  → OwnerContentIntakeState
  → OwnerContentInput
  → Smart Pages 5 adapter
  → PageGenerationRequest / host map
  → Engine V2
  → BioTemplateConfig
  → validateTemplate()
  → existing persistence and editor handoff
```

No se modificaron Engine V2, Smart Pages core/retail, `BioTemplateConfig`,
renderer, persistencia, esquema o migraciones. Readiness sigue siendo la
autoridad existente: catálogo requiere media de producto; portafolio requiere
media, destino y cover cuando lo exige el host actual.

## Tests and build

- uploader durable y seguridad: **5/5 passed**;
- Premium UI + state machine + destino de producto: **8/8 passed**;
- owner-content/intake/Smart Pages/host mapping: **43/43 passed**;
- ESLint focalizado: **passed**;
- `npm run build` client, SSR y Nitro: **passed**;
- `git diff --check`: **passed**; solo warnings existentes de CRLF/LF.

Warnings no bloqueantes existentes:

- recomendación de `vite-tsconfig-paths`;
- test de rutas sin export `Route` omitido del route tree;
- warning de chunk grande del build.

## Live runtime status

La sesión Chrome existente seguía autenticada y `/onboarding-test` mostró los
controles de portada/avatar durable. La carga no pudo cruzar el control de
archivo de la automatización:

```text
filechooser exposed
fileChooser.setFiles(...)
→ Not allowed
```

Por ese motivo quedan sin afirmar en este task:

- upload real a Supabase desde Chrome;
- URL pública de Storage observada en el navegador;
- casos live A/B/C con media subida;
- generación/persistencia/editor reload con media real;
- capturas PNG de esos casos.

El flujo anterior sin media ya tenía smoke real de generación, persistencia,
READY y handoff a `/pages/{pageId}/edit`; no se reutiliza esa evidencia como
prueba de subida durable.

## Architecture gates

- `EXISTING_STORAGE_AUTHORITY_REUSED = YES`
- `SECOND_STORAGE_SYSTEM = NO`
- `NEW_BUCKET = NO`
- `MIGRATION_CREATED = NO`
- `SERVICE_ROLE_USED = NO`
- `CLIENT_TRUSTED_USER_ID = NO`
- `FOREIGN_MEDIA_DELETE_ALLOWED = NO`
- `BLOB_OR_DATA_CANONICAL_REF = NO`
- `OWNER_MEDIA_REFERENCE_REUSED = YES`
- `OWNER_CONTENT_INTAKE_REUSED = YES`
- `PRODUCT_DESTINATION_VISIBLE_WHEN_EMPTY = YES`
- `PENDING_UPLOAD_BLOCKS_GENERATION = YES`
- `FAILED_UPLOAD_CREATES_NO_REFERENCE = YES`
- `ENGINE_V2_CHANGED = NO`
- `SMART_PAGES_CHANGED = NO`
- `CANONICAL_SCHEMA_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `DB_SCHEMA_CHANGED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Files changed by this task

- `src/lib/onboarding-v2/owner-media-upload.ts`;
- `src/lib/onboarding-v2/index.ts`;
- `src/components/onboarding-v2/premium/PremiumOnboardingFlow.tsx`;
- `src/components/onboarding-v2/premium/premium-onboarding.css`;
- `src/components/onboarding-v2/__tests__/premium-onboarding.test.tsx`;
- `src/lib/onboarding-v2/__tests__/owner-media-upload.test.ts`;
- `src/lib/onboarding-v2/__tests__/owner-media-to-config.test.ts`;
- este informe.

Los cambios previos del working tree fueron preservados. No se ejecutó
`git add`, commit, push, reset, restore, clean, checkout, stash, merge ni
rebase.

## Follow-up verification (this session)

The implementation was already present and green. This session added the
remaining compile-level and evidence gaps:

### Type-correctness fixes

`PremiumOnboardingFlow.tsx` had six `tsc --noEmit` errors that `npm run build`
(vite/esbuild) does not surface. All were fixed without behavior change:

- typed the `getSession()` destructure (removed an implicit-`any`);
- typed the persistence result as `PersistPremiumOnboardingGeneratedPageResult`
  (removed an implicit-`any`);
- `mediaUploads.cover` / `mediaUploads.avatar` → bracket access;
- `OfferCard` media props made `| undefined`-aware (exactOptionalPropertyTypes).

`tsc --noEmit` now reports **0 errors** in the media-flow files
(`owner-media-upload`, `owner-content`, `smart-pages-adapter`,
`PremiumOnboardingFlow`). Remaining `tsc` errors are pre-existing in unrelated
`components/**` / `routes/**` code.

### End-to-end evidence (media → canonical config)

New regression test `owner-media-to-config.test.ts` proves, through the real
`generateSmartPageFromOnboarding` path, that:

- retail cover → `profile.banner.imageUrl`, product media → `productGrid`
  `products[].imageUrl`;
- portfolio media → `portfolio` `items[].imageUrl`, cover → hero banner;
- `validateTemplate` PASS in both cases.

### Regression run

- `src/lib/onboarding-v2` + `src/lib/page-generator` +
  `src/components/onboarding-v2`: **157 passed, 1 skipped, 0 failed**.
- New `owner-media-to-config.test.ts`: **2/2 passed**.
- `premium-onboarding.test.tsx` (media UI + product destination): **6/6 passed**.

## Success gate

`CRIPQER_PREMIUM_ONBOARDING_DURABLE_OWNER_MEDIA_IMPLEMENTED_LIVE_UPLOAD_UNVERIFIED`

El gate de runtime completo
`CRIPQER_PREMIUM_ONBOARDING_DURABLE_OWNER_MEDIA_RUNTIME_VERIFIED` queda
pendiente de repetir el smoke con un mecanismo de navegador que permita
seleccionar el fixture real sin saltarse la autoridad de Storage.
