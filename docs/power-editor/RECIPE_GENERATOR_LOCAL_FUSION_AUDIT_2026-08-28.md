# Auditoría de fusión local del generador de recetas V6

**Fecha:** 2026-08-28
**Ámbito:** worktree aislado `codigos_qr-power-editor-isolated`
**Exclusiones:** no se modifican `/editor`, editor administrativo, QR, rutas públicas, publicación, producción ni datos de Supabase.

## Resultado ejecutivo

El generador actual ya produce, en memoria, doce `PageConfig` V6 con composiciones diferenciadas. No obstante, el Power Editor cliente no consume directamente esa salida: el artefacto versionado `artifacts/power-editor-template-pack.json` es una instantánea heredada V5 y no debe actuar como fuente canónica de una interfaz nueva. La fusión segura debe conectar el **generador V6 actual** con un catálogo local de sólo lectura que el editor pueda aplicar a su estado, dejando el sincronizador remoto fuera del flujo.

## Componentes comprobados

| Componente | Comportamiento comprobado | Riesgo o límite |
|---|---|---|
| `scripts/power-editor-template-factory.mjs` | Construye doce recetas, genera `page_config.version = 6`, composición raíz y auditoría de diversidad. | Es Node-only; no puede ser importado directamente por el navegador debido a sus dependencias de escritura de archivos. |
| `scripts/power-editor-template-factory.test.mjs` | Exige doce fingerprints distintos, doce macroestructuras, cobertura de 25 bloques, medios no repetidos y reseñas vacías. | Debe mantenerse como puerta de calidad antes de regenerar el catálogo cliente. |
| `scripts/sync-power-editor-template-pack.mjs` | En `dry-run` generó doce blueprints y doce hashes únicos sin escritura remota. | `--apply` usa credenciales administrativas y escribe Supabase; queda expresamente fuera de esta fase. |
| `artifacts/power-editor-template-pack.json` | Contiene una instantánea anterior con esquema `v1` y configuraciones V5. | Está desfasado frente al factory V6; no se usará como fuente de UI. |
| `EditorCandidate.tsx` | Acepta `PageConfig` externo mediante `draftBridge.initialPageConfig` e hidrata/migra con `hydrateCompositionPageConfig`. | Aún no posee un selector de recetas generado localmente. |

## Diversidad actual del generador

Las doce recetas cubren las macrofamilias `hero-overlay`, `editorial-cover`, `cinematic-split`, `concierge-fixed-cta`, `commerce-grid`, `ceremony-overlay`, `maker-split`, `portfolio-mosaic`, `market-fixed-cta`, `salon-journey`, `stream-grid` y `journal-columns`. El contrato automatizado exige que no exista una macroestructura repetida, que el puntaje máximo de similitud perceptual sea inferior a `0.72` y que ninguna receta invente testimonios o valoraciones.

El plan de simulación local confirmó doce identificadores estables, desde `power-golden-atelier` hasta `power-emerald-journal`, con fingerprints SHA-256 distintos. La simulación no solicitó credenciales ni modificó ninguna tabla.

## Diseño de conexión recomendado

La siguiente implementación debe mantener la separación entre creación y sincronización:

1. Se añadirá un adaptador de generación para convertir el resultado actual del factory en un módulo estático y sólo lectura apto para el cliente.
2. El catálogo cliente conservará `id`, nombre, categoría, macrofamilia y `pageConfig` V6; no contendrá datos de usuarios, proyectos, tokens ni URLs de publicación.
3. El Power Editor aplicará una receta mediante su mecanismo existente de hidratación, reiniciando exclusivamente el historial local de Undo/Redo para que el nuevo documento sea una unidad coherente.
4. Aplicar una receta no guardará, publicará ni sincronizará. Si el editor se abrió con un puente de borrador, el usuario continuará usando el botón **Guardar** existente para decidir la persistencia de `page_config`.
5. El script `sync-power-editor-template-pack.mjs` seguirá sin ejecutarse con `--apply`; no formará parte de la interfaz cliente ni recibirá `service_role`.

## Criterios de aceptación del próximo incremento

| Criterio | Evidencia esperada |
|---|---|
| Catálogo local | Doce recetas V6 disponibles sin petición de red. |
| Integridad | El catálogo se genera desde `createTemplatePack`, no desde el artefacto V5 heredado. |
| Aplicación | Seleccionar una receta reemplaza sólo el estado editable del canvas y conserva la compatibilidad con `hydrateCompositionPageConfig`. |
| Seguridad | No hay acceso a Supabase, `service_role`, publicación ni actualización automática. |
| Calidad | `./node_modules/.bin/vitest run` sigue correcto y el contrato del generador conserva sus pruebas de diversidad. |

## Decisión pendiente de autenticación

La ruta privada de borrador ya muestra el componente de autenticación existente al no encontrar sesión. La prueba con una sesión real sigue pendiente de una autenticación del propietario; esta auditoría del generador no depende de ella.
