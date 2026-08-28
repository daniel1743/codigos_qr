# Plan de implementación del Power Editor basado en benchmark

**Repositorio:** `daniel1743/codigos_qr`
**Worktree:** `/home/ubuntu/codigos_qr-power-editor-isolated`
**Rama:** `chore/power-editor-isolated-copy`
**Estado:** plan de ejecución autónoma; no autoriza Supabase, push, merge ni despliegue.

## Objetivo práctico

Convertir el Power Editor de una composición predominantemente vertical a un editor de páginas basado en **secciones, contenedores, stacks, filas, grids, overlays y CTA fijos**, sin duplicar contenido de bloques, sin romper configuraciones V5 y sin tocar las rutas o el editor heredado congelados.

La meta no es replicar productos completos como Canva, Webflow o Framer. Es adoptar los mecanismos de mayor impacto para Cripqer: jerarquía semántica, layouts por breakpoint, presets de composición, separación de contenido/estructura y validación segura.

## Benchmark: decisiones transferibles

| Referente | Patrón observado | Decisión para Power Editor |
|---|---|---|
| Webflow | Jerarquía de cajas anidadas y flujo responsive. [1] | Árbol de composición que referencia `PageBlock.id` una vez, sin duplicar props. |
| Framer | Grillas configurables por breakpoint. [2] | Overrides profundos por breakpoint para grid, split y posición. |
| Wix Studio | Celdas de sección, grid y límites explícitos. [3] | Presets de sección/grilla acotados y validables antes de exponer configuración libre. |
| WordPress Site Editor | Plantilla base y copia editable con estados separados. [4] | Mantener template maestro separado del borrador de usuario; nunca editar el master desde el editor personal. |
| Landingi | Secciones horizontales y layouts de una a cuatro columnas. [5] | Secciones y contenedores como unidad principal de variedad perceptual. |
| Unbounce | Grilla visual, snap y configuración distinta por desktop/móvil. [6] | Guías y reglas de grid futuras; fallback móvil seguro primero. |
| Elementor | Contenedores flex/grid anidables. [7] | `stack`, `row`, `column` y `grid` con profundidad limitada. |
| Squarespace Fluid Engine | Posicionamiento de bloques y grilla móvil específica. [8] | Overlay/posición libre sólo bajo un padre overlay y con límites recuperables. |
| Canva | Lienzo, capas y reordenamiento de formatos. [9] | Capas conservadas para hojas; composición estructural separada de edición de contenido. |
| Picsart | Lienzo/capas y variantes derivadas de datos. [10] | Generador de recetas debe usar huellas estructurales y datos de variante, no sólo cambios cosméticos. |

## Alcance técnico de ejecución

### Incremento A — modelo y validación

Se crearán `compositionModel.ts` y `compositionFixtures.ts` junto a la ampliación mínima de `editorCandidateModel.ts`. El modelo incluirá tipos discriminados V5/V6, hidratación que no muta el input, el adaptador lineal V5 → V6, límites, validación, operaciones puras y flatten de contingencia. Ningún JSON existente se guardará como V6 durante lectura.

### Incremento B — renderer jerárquico

Se creará `CompositionRenderer.tsx`, que renderizará nodos estructurales y delegará los nodos hoja a los renderers de bloque existentes. `EditorCandidate.tsx` recibirá un único punto de delegación, conservando `CanvasBlock` para todo contenido actual. El banner y el perfil se normalizarán mediante el adaptador de compatibilidad; no se reescribirán sus props o su renderer interno.

### Incremento C — authoring acotado

Se añadirá una superficie de composición dentro del Power Editor para elegir presets de sección, envolver hermanos, convertir a row/grid, deshacer wrapper, insertar una columna y editar las propiedades estructurales seguras. No se implementará layout arbitrario sin límites, ni persistencia automática, ni arrastre libre global. Las acciones usarán el mismo historial inmutable que PageConfig; cada mutación tendrá Undo/Redo.

### Incremento D — recetas y diversidad

El generador offline incorporará `composition` a recetas nuevas sólo después de que el renderer pase pruebas. Las recetas usarán al menos seis macrofamilias: hero editorial, split media/copy, grid de servicios, overlay de perfil, catálogo modular y CTA fijo. La aceptación exigirá distancia macroestructural, de bloques, de medios y visual; cambios de color o avatar no podrán aprobar una receta como distinta.

### Incremento E — borradores, no publicación

El modo de borrador continuará guardando exclusivamente `page_config` y sólo bajo la ruta interna aislada. La integración será V6-capable una vez cubiertas las fixtures V5/V6, pero no cambiará `owner_user_id`, `profile_id`, `template_id`, `status`, `published_page_config` o `published_at`. Publicar, templates maestros y rutas públicas se mantienen fuera del alcance.

## Archivos previstos, por incremento

| Incremento | Crear | Modificar | Prohibido tocar |
|---|---|---|---|
| A | `src/power-editor/client/src/lib/compositionModel.ts`; `compositionFixtures.ts`; `compositionModel.test.ts` | `editorCandidateModel.ts` | Rutas, CSS, Supabase, editor heredado. |
| B | `src/power-editor/client/src/components/CompositionRenderer.tsx`; `composition-renderer.css` | `EditorCandidate.tsx` con una delegación de renderer | `/editor`, `/admin/template-studio`, renderer público heredado. |
| C | `CompositionPanel.tsx`; `CompositionInspector.tsx` | `EditorCandidate.tsx`; CSS encapsulado del Power Editor | Navegación global, rutas públicas, PageConfig de bloques. |
| D | `composition-presets.ts`; fixtures de receta | `scripts/power-editor-template-factory.mjs`; auditorías/tests existentes de scripts | Artefactos existentes hasta pasar QA. |
| E | Pruebas V6 de servicio/hook si hacen falta | `usePowerEditorDraft.ts`, servicio de borrador sólo para serializar V6 validado | SQL aplicado, publicación y credenciales reales. |

## Criterios de seguridad y calidad

1. Un bloque de contenido conserva un único `PageBlock.id`; el árbol sólo almacena referencias.
2. La hidratación V5 → V6 conserva blocks, props, order, enabled, locked y estilos literalmente.
3. Grid se limita a 1–6 columnas, 1–12 filas y placements dentro de tracks efectivos.
4. Split requiere exactamente dos tracks entre 25/75 que sumen 100 y colapsa a stack en móvil por defecto.
5. Posición libre sólo puede existir dentro de overlay, con offsets/z-index acotados y acción de restablecimiento.
6. Fixed CTA reserva espacio y nunca cubre footer o controles de editor de forma irrecuperable.
7. Undo/Redo recibe una copia inmutable de la composición completa; guardar no reinicializa historial.
8. El generador sólo puede aceptar recetas con firma macroestructural distinta y prueba de render en desktop/móvil.

## QA previsto

| Nivel | Pruebas |
|---|---|
| Unitarias | Hidratación V5/V6, validación, ciclos, duplicados, grid/split inválidos, responsive merge, flatten seguro e inmutabilidad. |
| Integración | Render V5 compatible, wrapper/unwrap, selección de nodo, undo/redo, guardado `page_config` únicamente y recuperación tras recarga. |
| Visual | Hero, grid, split, overlay y CTA fijo en móvil, tablet y desktop; 3–4 capturas de escenarios no equivalentes. |
| Generador | Cobertura de bloques, distancia por pares, unicidad de media, ingredientes de material, validación JSON y dry-run. |
| Regresión | `/editor`, `/admin/template-studio`, QR, rutas públicas, navegación, renderer heredado y publicación sin cambios. |

## Dependencias externas y fronteras

No se necesita migración de Supabase para representar `composition` dentro del JSONB existente. Las futuras tablas de auditoría siguen pendientes de revisión/aplicación manual. El sincronizador no se conecta a Supabase sin variables de servidor ni dry-run aprobado. Ningún cambio será subido a GitHub o desplegado en esta fase.

## Referencias

[1]: https://help.webflow.com/hc/en-us/articles/33961333856787-Intro-to-the-box-model "Webflow — Intro to the box model"
[2]: https://www.framer.com/help/articles/layout-grids/ "Framer — Adding a layout grid"
[3]: https://support.wix.com/en/article/studio-editor-customizing-a-section-grid "Wix Studio — Customizing a Section Grid"
[4]: https://developer.wordpress.org/block-editor/explanations/architecture/full-site-editing-templates/ "WordPress — Site Editing Templates"
[5]: https://landingi.com/help/sections-lp-foundation/ "Landingi — Making sections in the editor"
[6]: https://documentation.unbounce.com/hc/en-us/articles/36828041441940-Using-Section-Grids-and-the-Snap-To-Grid-Function "Unbounce — Section Grids and Snap-To-Grid"
[7]: https://elementor.com/help/container-element/ "Elementor — Container element"
[8]: https://support.squarespace.com/hc/en-us/articles/6421525446541-Edit-your-site-with-Fluid-Engine "Squarespace — Fluid Engine"
[9]: https://www.canva.com/features/ "Canva — Features"
[10]: https://docs.picsart.io/docs/how-to-design-templates-for-photo-video-editor "Picsart — Design templates for Photo and Video Editor"
