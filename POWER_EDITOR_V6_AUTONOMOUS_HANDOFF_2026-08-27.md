# Handoff autónomo — Cripqer Power Editor V6

**Fecha:** 27 de agosto de 2026
**Autor:** Manus AI
**Worktree autorizado:** `/home/ubuntu/codigos_qr-power-editor-isolated`
**Rama aislada:** `chore/power-editor-isolated-copy`
**Estado de GitHub:** los cambios de este informe permanecen **locales, sin commit, sin push, sin merge y sin despliegue**.

## 1. Resumen ejecutivo

Se completó la investigación comparativa de diez editores profesionales y se implementó, exclusivamente en el worktree autorizado, una evolución V6 del Power Editor. La mejora resuelve la limitación central identificada: el modelo anterior era una lista plana de bloques, por lo que recetas técnicamente diferentes continuaban reproduciendo una estructura perceptual casi idéntica.

La V6 introduce un árbol de composición validado, renderizado jerárquico, cinco presets seguros de layout, compatibilidad de hidratación con configuraciones V5, auditoría de diversidad perceptual y persistencia de V6 dentro del JSONB ya existente de `page_config`. **No se escribió en Supabase, no se sincronizaron templates reales y no se conectó Publicar.**

| Dimensión | Resultado actual | Alcance de la evidencia |
|---|---|---|
| Modelo V6 | Árbol de secciones, stacks, rows, grids, overlays, fixed y referencias a bloques. | 14 pruebas unitarias del modelo. |
| Compatibilidad V5 | Una `PageConfig` V5 se hidrata a V6 sin mutar el input y conserva bloques, props y orden. | Prueba unitaria y renderer legacy. |
| Editor | Renderer jerárquico y panel Layout con cinco presets. | Build correcto y QA local con cuatro capturas. |
| Diversidad de recetas | 12 macroestructuras V6, 25/25 tipos de bloque cubiertos, sin espinazo vertical común. | Pack temporal en `/tmp`; artefacto versionado existente no se sobrescribió. |
| Borradores | El bridge, hook y servicio existentes preservan V6 dentro de `page_config` y el servicio actualiza sólo ese campo. | 4 pruebas del servicio; no validado contra Supabase real. |
| Seguridad y publicación | Sin cambios a Publicar, maestros, QR, `public_id`, slug, rutas públicas ni editor heredado. | Revisión del alcance y pruebas de payload. |

> **Veredicto honesto:** la base V6 ya elimina el límite arquitectónico que forzaba las doce recetas a una página vertical casi igual. Está validada localmente y aislada; todavía no está integrada en producción ni validada con una sesión real de Supabase.

## 2. Congelamientos respetados

El trabajo de producto se limitó al paquete Power Editor, sus scripts locales, ruta interna de borrador ya existente y documentación. No se editó `/editor`, `/admin/template-studio`, el editor administrativo heredado, QR, navegación pública, `public_id`, slug, páginas públicas, ni templates maestros reales. No se aplicó migración, SQL, seed, publicación, sincronización real, commit, push, merge, rebase, amend ni deploy.

| Área | Estado |
|---|---|
| Worktree `codigos_qr-power-editor-isolated` | Único lugar que recibió cambios de producto. |
| `cripqer-landing` | No recibió cambios de producto en este tramo. |
| GitHub remoto | Conserva sólo los commits históricos `45ac187` y `be1c43a`; esta V6 no está publicada. |
| Supabase real | V4 y V5 ya estaban aplicadas manualmente; V6 de política y auditoría de generador siguen pendientes. |
| Sincronizador | Se ejecutó exclusivamente en `dry-run`; no recibió credenciales ni abrió una conexión remota. |

## 3. Benchmark de diez competidores

La investigación se basó en fuentes oficiales. La conclusión no es copiar interfaces de terceros, sino adoptar patrones estructurales comprobados: jerarquía de contenedores, grillas responsive, capas controladas, presets seguros y separación entre template maestro y borrador de usuario.

| Competidor | Patrón observado | Decisión aplicada o diferida en Cripqer |
|---|---|---|
| Canva | Canvas creativo, capas y secciones para websites. [1] | Se conserva el canvas visual; la V6 añade estructura declarativa bajo el canvas en lugar de posicionamiento libre global. |
| Webflow | Box model, jerarquía padre-hijo y layout responsive. [2] | Se implementó árbol de nodos con contenedores y `base → mobile → tablet → desktop`. |
| Framer | Stacks, grids y mezcla limitada de auto-layout con posiciones creativas. [3] | Se incorporaron `stack`, `row`, `grid`, `overlay`, `anchored` y `free` sólo bajo overlay. |
| Wix Studio | Section Grid con celdas y composición responsive. [4] | Se incorporó grid con 1–6 columnas, placement y validación de caída responsive. |
| WordPress Site Editor | Templates y copias editables separadas con estados de borrador/publicación. [5] | Se preserva la separación de `power_editor_templates` y `power_editor_projects`; el editor no muta masters. |
| Elementor | Contenedores Flexbox/Grid y edición responsive por dispositivo. [6] | El panel Layout se limita inicialmente a presets y controles seguros, no a anidamiento arbitrario. |
| Squarespace Fluid Engine | Grilla y superposición por capas con cuidado por contenido fluido. [7] | `overlay` y límites de z-index; no se habilita posicionamiento absoluto sin restricciones. |
| Landingi | Secciones horizontales, columnas y vistas Desktop/Mobile. [8] | Secciones y composiciones con `split` y presets adaptables; no se copia su canvas pixel-perfect. |
| Unbounce | Sections/Boxes y Section Grids con snap. [9] | Los presets V6 usan grids y márgenes controlados; futuras versiones podrían sumar snapping visual. |
| Picsart | Capas, edición de media y plantillas con datos variables. [10] | La edición de media permanece por bloque; el mapeo de datos para generación masiva se deja fuera de esta entrega. |

La mayor lección común es que las herramientas maduras separan **contenido** de **estructura**. La V6 aplica esa separación: los bloques existentes mantienen sus propiedades y renderers, mientras que la composición sólo referencia sus IDs únicos. Así se evita duplicar contenido para crear una página con otra arquitectura.

## 4. Implementación realizada

### 4.1 Motor de composición V6

El modelo nuevo vive en `src/power-editor/client/src/lib/compositionModel.ts`. Aporta los nodos `root`, `section`, `container`, `stack`, `row`, `grid`, `column`, `overlay`, `fixed` y `block`. Sólo `block` porta un `blockId`; los bloques originales siguen siendo la fuente de contenido.

Los límites explícitos son profundidad máxima 6, máximo 96 nodos, grids entre 1 y 6 columnas / 1 y 12 filas, splits entre 25/75 y 75/25 que suman 100, y z-index de 0 a 20. El posicionamiento libre está permitido exclusivamente bajo `overlay`; un CTA fijo exige una acción admisible, safe-area y reserva de espacio. La validación aplica la precedencia responsive base → mobile → tablet → desktop, incluido el `placement` de grilla.

| Archivo | Función |
|---|---|
| `src/power-editor/client/src/lib/compositionModel.ts` | Tipos V6, upgrade V5→V6, hidratación, validación, operaciones inmutables, reconciliación de refs y merge responsive. |
| `src/power-editor/client/src/lib/compositionFixtures.ts` | Fixtures V5, V6 legacy y cobertura de los 25 bloques. |
| `src/power-editor/client/src/lib/compositionModel.test.ts` | 14 pruebas de seguridad, límites, responsive, operaciones, flatten y los cinco presets. |

### 4.2 Renderer y controles del editor

`CompositionRenderer.tsx` consume un árbol V6 y delega cada leaf al renderer `CanvasBlock` existente. La composición legacy se detecta y mantiene el render anterior `banner → ep-template-content`, de manera que una configuración V5 adaptada no altera su presentación por la sola migración. Las composiciones nuevas se renderizan con CSS encapsulado en `composition-renderer.css`.

El botón **Layout** abre un panel acotado con cinco presets: Flujo clásico, Hero overlay, Media + copy, Catálogo grid y CTA fijo. El panel ofrece selección de nodo, padding, gap, columnas por breakpoint, proporción de split y restauración de flujo/posición. Cada cambio se envía a la función `commit` ya ligada al historial, por lo que conserva Undo/Redo sin mutar el estado previo.

| Archivo | Función |
|---|---|
| `src/power-editor/client/src/components/CompositionRenderer.tsx` | Renderer V6 jerárquico, soporte overlay/grid/split/fixed y compatibilidad visual legacy. |
| `src/power-editor/client/src/components/composition-renderer.css` | CSS encapsulado para nodes V6 y neutralización de margen legacy del avatar sólo fuera del flujo antiguo. |
| `src/power-editor/client/src/components/CompositionPanel.tsx` | Constructor puro de presets y panel de controles estructurales. |
| `src/power-editor/client/src/pages/EditorCandidate.tsx` | Delegación mínima al renderer/panel V6 y adaptación de historial/hidratación. |

### 4.3 Generador y auditoría de diversidad

El generador sigue siendo offline y determinista. Ahora produce `schema: cripqer.power-editor-template-pack.v2`, `version: 6` en `page_config` y una composición por macrofamilia: hero overlay, editorial cover, cinematic split, concierge fixed CTA, commerce grid, ceremony overlay, maker split, portfolio mosaic, market fixed CTA, salon journey, stream grid y journal columns.

La auditoría deja de aceptar diferencias de paleta, avatar o banner como prueba suficiente. Reporta diversidad cosmética, de bloques, de media, macroestructura, pares de similitud y una penalización explícita al espinazo `profile → heading → text → links` compartido por todas las recetas.

| Métrica del pack temporal V6 | Resultado |
|---|---:|
| Templates | 12 |
| Tipos de bloque cubiertos | 25 / 25 |
| Fingerprints completos distintos | 12 / 12 |
| Macroestructuras distintas | 12 / 12 |
| Distancia mínima de features | 10 |
| Máxima similitud perceptual por pares | 0.273 |
| Templates con espinazo vertical común | 0 |
| Estado de auditoría | PASS |

El pack temporal de QA se creó en `/tmp/power-editor-template-pack-v6-candidate.json`. **El artefacto versionado `artifacts/power-editor-template-pack.json` no fue regenerado ni sobrescrito.**

### 4.4 Borradores remotos V6

No se creó una tabla adicional para V6: `page_config` es JSONB y conserva el árbol `composition` completo. El servicio existente clona el objeto y ejecuta una única actualización `{ page_config }`, filtrada por `id`, `owner_user_id` y `status IN ('draft','published')`. No escribe `template_id`, `profile_id`, `owner_user_id`, `status`, `published_page_config` ni `published_at`.

El hook existente controla carga, deduplicación de save, auth, offline, sesión expirada, borrador ajeno/no existente y archived. El editor ahora hidrata las entradas del bridge con `hydrateCompositionPageConfig`, por lo que recibe V5 o V6 sin mutación del input y conserva el historial. Esta conexión permanece bajo `/internal/power-editor-draft/$projectId`; no reemplaza `/editor` ni se verificó con una sesión remota real.

## 5. Evidencia de QA

Se ejecutaron 25 pruebas focalizadas, el `dry-run` del sincronizador y un build Vite correcto. La inspección de `tsc --noEmit` encontró **cero errores en los archivos V6 nuevos**. El chequeo global aún reporta 354 errores históricos repartidos por módulos ajenos, `editorCandidateModel.ts`, `EditorCandidate.tsx` heredado y pruebas preexistentes; por ello no se declara typecheck global limpio.

| Validación | Resultado |
|---|---|
| `vitest` focalizado | PASS — 25 pruebas: modelo (14), servicio (4), generador (6), sync (1). |
| Modelo V5/V6 | PASS — no mutación, referencias únicas, límites, grid/split/overlay/fixed, responsive y presets. |
| Servicio de borrador | PASS — prueba que un árbol V6 se guarda en `page_config` y no publica ni toca campos protegidos. |
| Generador V6 | PASS — 12 macrofamilias, cobertura 25/25, similitud máxima 0.273. |
| `templates:power:sync` dry-run | PASS — 12 blueprints únicos; sin conexión ni escritura remota. |
| `vite build` | PASS — advertencia no bloqueante de chunks mayores a 500 kB. |
| `tsc --noEmit` focalizado | PASS — 0 diagnósticos en `compositionModel`, fixtures, panel y renderer V6. |

Las cuatro capturas conservadas fuera del árbol desplegable están disponibles en `/home/ubuntu/power-editor-qa/` y se adjuntan con este handoff. La bitácora versionada está en `docs/power-editor/QA_VISUAL_LOG_2026-08-27.md`.

| Archivo adjunto | Escenario |
|---|---|
| `01-hero-overlay-desktop.webp` | Perfil anclado al banner dentro de overlay. |
| `02-media-copy-desktop.webp` | Composición split de media y texto. |
| `03-catalog-grid-desktop.webp` | Grid modular con nodes estructurales visibles. |
| `04-fixed-cta-mobile.webp` | Vista móvil temporal con CTA fijo y barra contextual separada del canvas. |

## 6. Limitaciones reales y pendientes

La V6 es un avance estructural, no una réplica completa de Canva, Webflow o Framer. El editor actual no incluye creación libre de nodos por drag-and-drop, rejilla visual de 12/24 columnas, edición profunda de árboles, biblioteca real de medios por usuario, colaboración, IA de reflow, autosave remoto comprobado o publicación conectada. Estas capacidades se dejaron fuera para proteger el código funcional y respetar los congelamientos.

El preview usado para QA fue local. El preview móvil temporal muestra un canvas angosto dentro de una ventana de navegador de escritorio, lo que deja espacio exterior blanco en la captura; no es una ruta pública ni se modificó para no tocar layouts ajenos. La persistencia remota no se reclamará como validada hasta que el propietario aplique los SQL pendientes, configure un entorno de servidor permitido y pruebe el borrador con sesión real.

## 7. SQL manual pendiente — no aplicado

V4 y V5 ya fueron aplicadas y verificadas manualmente. V6 no requiere nueva columna porque la composición vive en JSONB `page_config`. Quedan dos piezas manuales: endurecer la política UPDATE de proyectos archived y crear las tablas de auditoría de generador requeridas por el sincronizador protegido.

### 7.1 Preflight obligatorio

Primero ejecutar estas consultas de sólo lectura. No aplicar ningún SQL si el resultado difiere de lo esperado.

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname = 'owners update their own power editor drafts'
  AND cmd = 'UPDATE';
```

Debe devolver una fila de la política V5 sin exclusión explícita de `archived` en `qual`.

```sql
SELECT
  object_name,
  CASE WHEN to_regclass('public.' || object_name) IS NULL THEN 'absent' ELSE 'present' END AS state
FROM (VALUES
  ('power_editor_template_blueprints'),
  ('power_editor_template_generation_runs')
) AS expected(object_name);
```

Debe devolver las dos filas como `absent`. Si alguna ya existe, detenerse y revisar su estructura antes de seguir.

### 7.2 Aplicación V6 de política UPDATE

Este SQL modifica únicamente una política RLS de `public.power_editor_projects`. No modifica filas ni tablas; se ejecuta de forma atómica.

```sql
-- Cripqer Power Editor persistence V6.
-- REVIEW ONLY: apply manually after the V6 preflight succeeds.
-- This changes only the UPDATE policy on the V4/V5 projects table.

BEGIN;

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
USING (
  owner_user_id = auth.uid()
  AND status IN ('draft', 'published')
)
WITH CHECK (
  owner_user_id = auth.uid()
  AND status IN ('draft', 'published')
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.user_id = auth.uid()
  )
);

COMMIT;
```

#### Rollback exacto de la política V6

Ejecutar sólo si se decide volver a la condición V5; no modifica filas.

```sql
BEGIN;

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
USING (owner_user_id = auth.uid())
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.user_id = auth.uid()
  )
);

COMMIT;
```

### 7.3 Aplicación de auditoría del generador

Este SQL crea dos tablas nuevas, sus índices, un trigger de `updated_at`, activa RLS y concede permisos únicamente al backend `service_role`. No inserta templates ni proyectos, no publica y no toca las tablas de QR, perfiles o páginas públicas. El único cambio sobre una tabla existente es el grant explícito de `service_role` sobre `power_editor_templates`, necesario para un sincronizador que ya está diseñado como proceso server-only.

```sql
-- Cripqer Power Editor generator audit V1.
-- REVIEW ONLY: apply manually after reviewing the preflight and rollback.
-- Creates only generator metadata/audit tables; no templates or projects are inserted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.power_editor_template_blueprints (
  blueprint_key TEXT PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.power_editor_templates(id) ON DELETE CASCADE,
  content_fingerprint TEXT NOT NULL CHECK (char_length(content_fingerprint) = 64),
  category TEXT NOT NULL,
  archetype TEXT NOT NULL,
  generator_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.power_editor_template_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_version TEXT NOT NULL,
  seed TEXT NOT NULL,
  template_count INTEGER NOT NULL CHECK (template_count > 0),
  audit JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_power_editor_template_blueprints_template_id
  ON public.power_editor_template_blueprints(template_id);
CREATE INDEX IF NOT EXISTS idx_power_editor_template_generation_runs_created_at
  ON public.power_editor_template_generation_runs(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.power_editor_template_blueprints'::regclass
      AND tgname = 'set_power_editor_template_blueprints_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_template_blueprints_updated_at
    BEFORE UPDATE ON public.power_editor_template_blueprints
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.power_editor_template_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_editor_template_generation_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.power_editor_template_blueprints FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.power_editor_template_generation_runs FROM PUBLIC, anon, authenticated;

-- The protected synchronizer is server-only and uses service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_editor_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_editor_template_blueprints TO service_role;
GRANT SELECT, INSERT ON TABLE public.power_editor_template_generation_runs TO service_role;

COMMIT;
```

#### Rollback exacto de tablas de auditoría

Este rollback **sí contiene `DROP TABLE`** porque está destinado a retirar exclusivamente las dos tablas nuevas si se decide abandonar el sincronizador antes de almacenar auditorías. No ejecutarlo como paso rutinario ni si ya existen auditorías que se deseen conservar.

```sql
BEGIN;
DROP TABLE IF EXISTS public.power_editor_template_generation_runs;
DROP TABLE IF EXISTS public.power_editor_template_blueprints;
COMMIT;
```

### 7.4 Verificación posterior y prueba RLS reversible

Después de aplicar, ejecutar las consultas siguientes. La primera debe mostrar `status IN ('draft', 'published')` tanto en `qual` como en `with_check`. La segunda debe mostrar dos tablas nuevas con RLS activo. La tercera no debe mostrar privilegios para `anon` ni `authenticated` en las tablas de auditoría.

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname = 'owners update their own power editor drafts'
  AND cmd = 'UPDATE';

SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'power_editor_template_blueprints',
    'power_editor_template_generation_runs'
  )
ORDER BY relname;

SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
    'power_editor_templates',
    'power_editor_template_blueprints',
    'power_editor_template_generation_runs'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
```

Para demostrar el bloqueo de escritura sobre un proyecto archived, reemplazar `<PROFILE_ID>` por un `profiles.id` que tenga un `user_id` correspondiente en `auth.users`. El resultado esperado es `rows_updated = 0`; `ROLLBACK` retira el proyecto temporal.

```sql
BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.profiles WHERE id = '<PROFILE_ID>'::uuid),
  true
);

SET LOCAL ROLE authenticated;

INSERT INTO public.power_editor_projects (owner_user_id, profile_id, name, page_config)
VALUES (
  auth.uid(),
  '<PROFILE_ID>'::uuid,
  '__v6_archived_guard_' || txid_current()::text,
  '{"v6_test": true}'::jsonb
);

RESET ROLE;

UPDATE public.power_editor_projects
SET status = 'archived'
WHERE profile_id = '<PROFILE_ID>'::uuid
  AND name = '__v6_archived_guard_' || txid_current()::text;

SET LOCAL ROLE authenticated;

WITH attempted_update AS (
  UPDATE public.power_editor_projects
  SET page_config = '{"v6_test": "must_not_write"}'::jsonb
  WHERE profile_id = '<PROFILE_ID>'::uuid
    AND name = '__v6_archived_guard_' || txid_current()::text
  RETURNING id
)
SELECT count(*) AS rows_updated FROM attempted_update;

ROLLBACK;
```

## 8. Secuencia de promoción posterior a tu revisión

Primero revisar este informe y el diff local. Si apruebas la persistencia, ejecutar manualmente el preflight y sólo las migraciones pendientes que pasen ese preflight. Luego volver a comprobar la política y las grants. Después configurar las tres variables exclusivamente en un entorno de servidor: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `POWER_EDITOR_TEMPLATE_OWNER_ID`.

Ejecutar primero el modo sin escrituras: `npm run templates:power:sync:dry-run`. Si su plan es correcto, cualquier escritura futura requiere tanto `--apply` como `POWER_EDITOR_TEMPLATE_SYNC_CONFIRM=I_UNDERSTAND`; el sincronizador crea masters en `draft` y omite un master `published` en vez de sobrescribirlo.

La integración de la UI de borrador debe probarse con una cuenta real en la ruta interna y con un proyecto propio. Sólo tras esa prueba corresponde decidir un commit local, revisión de PR y fusión. **Ninguna de esas acciones fue realizada en esta entrega.**

## 9. Referencias

[1]: https://www.canva.com/help/canva-websites/ "Canva Help — Canva Websites"
[2]: https://help.webflow.com/hc/en-us/articles/33961333856787-Intro-to-the-box-model "Webflow Help — Intro to the box model"
[3]: https://www.framer.com/help/articles/layout-grids/ "Framer Help — Layout grids"
[4]: https://support.wix.com/en/article/studio-editor-customizing-a-section-grid "Wix Studio Help — Customizing a section grid"
[5]: https://developer.wordpress.org/block-editor/explanations/architecture/full-site-editing-templates/ "WordPress Developer — Full Site Editing templates"
[6]: https://elementor.com/help/container-element/ "Elementor Help — Container element"
[7]: https://support.squarespace.com/hc/en-us/articles/6421525446541-Edit-your-site-with-Fluid-Engine "Squarespace Help — Fluid Engine"
[8]: https://landingi.com/help/sections-lp-foundation/ "Landingi Help — Sections"
[9]: https://documentation.unbounce.com/hc/en-us/articles/36828041441940-Using-Section-Grids-and-the-Snap-To-Grid-Function "Unbounce Documentation — Section Grids"
[10]: https://docs.picsart.io/docs/how-to-design-templates-for-photo-video-editor "Picsart Developer Docs — Design templates"
