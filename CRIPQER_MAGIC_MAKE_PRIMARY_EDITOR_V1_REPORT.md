# CRIPQER_MAGIC_MAKE_PRIMARY_EDITOR_V1

Fecha: 2026-09-23  
Resultado: PASS (cutover de routing) / PARTIAL (smoke runtime no ejecutado)

## Archivos cambiados

- `src/routes/pages.$pageId.edit.tsx`
- `CRIPQER_MAGIC_MAKE_PRIMARY_EDITOR_V1_REPORT.md`

No se modificaron Magic Production Editor, documento Magic V1, persistencia,
publicación ni renderer público.

## Routing antes/después

- Antes: `/pages/{pageId}/edit` montaba `PowerEditorHost`.
- Antes: `/pages/{pageId}/edit?magicProduction=1` montaba `MagicProductionEditorHost`.
- Después: `/pages/{pageId}/edit` monta `MagicProductionEditorHost` por defecto.
- Compatibilidad: `?magicProduction=1` continúa resolviendo al mismo Magic host.
- Rollback interno: `?legacyEditor=1` monta explícitamente el `PowerEditorHost` anterior.

La rama `legacyEditor=1` no se expone en la UI. La rama histórica explícita
`directEditor=magic` se conserva sin convertirla en fallback automático.

## Evidencia automatizada

- Test relevante: `npx vitest run src/routes/__tests__/pages.routing.test.ts` — PASS, 1 archivo, 5 tests.
- Build: `npm run build` — PASS; cliente, SSR y Nitro/Vercel generados correctamente.
- `git diff --check` global: reporta whitespace preexistente en
  `src/features/experimental-premium-editor/components/CardImage.tsx` y
  `ProductDetailView.tsx`, fuera de este cambio.
- `git diff --check -- src/routes/pages.$pageId.edit.tsx` — PASS.

## Smoke runtime

No se ejecutó el smoke autenticado contra Supabase ni publicación pública en
este turno. Por tanto, no se afirma evidencia nueva sobre autosave, publish,
URLs públicas o móvil. El cambio conserva el mismo `pageId` y el mismo
`MagicProductionEditorHost`, por lo que no introduce una ruta de persistencia
alternativa.

## Success gate

`CRIPQER_MAGIC_PRIMARY_EDITOR_PASS`: PARTIAL — routing y build PASS; queda
pendiente la verificación runtime autenticada de la matriz QA indicada en la
tarea.
