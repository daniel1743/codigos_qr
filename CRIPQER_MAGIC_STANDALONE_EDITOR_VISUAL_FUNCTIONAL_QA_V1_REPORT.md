# CRIPQER Magic Standalone Editor — Visual / Functional QA

Fecha: 2026-09-22  
Ruta QA: `/labs/magic-editor`  
Estado formal: `PARTIAL`

## Evidencia visual

Las capturas reales quedaron persistidas en `qa/magic-standalone/`:

- Desktop: `desktop-1440-normal-viewport.png`, `desktop-1440-normal.png`.
- Desktop estados: `desktop-1440-text-selected.png`, `desktop-1440-avatar-selected.png`,
  `desktop-1440-hero-selected.png`, `desktop-1440-cta-selected.png`.
- Mobile: `mobile-360.png`, `mobile-390.png`, `mobile-430.png`.
- Mobile estado texto: `mobile-360-text-selected.png`, `mobile-390-text-selected.png`,
  `mobile-430-text-selected.png`.

La captura desktop confirma hero fotográfico grande, borde curvo, avatar superpuesto,
jerarquía de nombre, descriptor, bio, redes y CTA premium. La captura mobile de 390 px
confirma la composición responsive, el avatar superpuesto, las redes y el primer CTA sin
degradación visual evidente.

Fuente de referencia: ZIP canónico Magic entregado por el usuario. La referencia original
no estaba disponible como archivo PNG local para construir un composite side-by-side; por
eso las capturas del port se entregan como evidencia independiente y la comparación se
documenta aquí.

## Matriz desktop

| Viewport | Hero/assets | Composición Bio | Overflow visible | Estado |
|---|---:|---:|---:|---|
| 1366 | PASS por composición fuente | PASS | PASS visual | PASS |
| 1440 | PASS — assets locales cargados | PASS | PASS visual | PASS |

## Matriz mobile

| Viewport | Hero/avatar | Links táctiles | Cards legibles | Overflow visible | Estado |
|---|---:|---:|---:|---:|---|
| 360 | PASS | PASS | PASS | PASS | PASS visual |
| 390 | PASS | PASS | PASS | PASS | PASS visual |
| 430 | PASS | PASS | PASS | PASS | PASS visual |

El runner detectó inicialmente overflow de los botones internos del carrusel “Estados”,
pero el documento y el body permanecieron en el ancho del viewport. El boundary aislado
ahora usa `w-full`, `max-width: 100vw` y clipping horizontal para que el toolbar no
expanda la página.

## Matriz funcional

| Acción | Resultado QA automatizado |
|---|---|
| Selección visual por outline | Evidencia visual capturada |
| Inline text editing | No cerrado formalmente por hidratación del runner dev |
| Selección avatar / hero / CTA | No cerrado formalmente por hidratación del runner dev |
| Imagen/avatar local | Assets cargan correctamente |
| Undo/redo | Implementado en `EditorContext`, pendiente de confirmación UI |
| MobileSheet | Implementado en fuente portada, pendiente de confirmación UI |
| Add/move/duplicate/delete block | Implementado en estado local, pendiente de confirmación UI |

El problema observado en el runner es específico del cliente de desarrollo: la respuesta
SSR se renderiza correctamente, pero el módulo dinámico de TanStack Start no siempre
hidrata el documento durante la automatización headless. No se modificó la lógica Magic
para ocultar este resultado ni se marcó el gate funcional como PASS.

## Smoke templates

- Bio: evidencia visual completa, assets cargados.
- Business: fuente y renderer aislados presentes; smoke visual pendiente.
- Portfolio: fuente y renderer aislados presentes; smoke visual pendiente.

## Scope compliance

PASS: el árbol `src/isolated/magic-page-editor/` no importa Power Editor,
PremiumTemplateStudio, Direct Page Editor, Engine V2, PageDocumentV1 o Supabase.

PASS: no se conectaron Auth, Storage, pageService, pageCanonicalService, SQL, RLS,
QR, Analytics, Billing ni publicación real.

PASS: durante esta QA solo se modificaron assets locales del port, el boundary responsive,
los scripts de evidencia y este reporte. Los sistemas congelados permanecen fuera de scope.

## Gate final

- `MAGIC_STANDALONE_EDITOR_VISUAL_PARITY_PASS`: `PARTIAL` — evidencia visual creada;
  falta composite side-by-side con la referencia original como archivo local.
- `MAGIC_STANDALONE_EDITOR_FUNCTIONAL_PASS`: `PARTIAL` — interacción implementada por
  la fuente portada, pero no confirmada de extremo a extremo por el runner de hidratación.
- `MAGIC_STANDALONE_EDITOR_ISOLATION_PASS`: `PASS`.

No se inicia ninguna integración con Cripqer. Para cerrar en `PASS` falta únicamente
repetir la matriz funcional con un cliente hidratado y adjuntar la referencia original
como archivo de comparación.
