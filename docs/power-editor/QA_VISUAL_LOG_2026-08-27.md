# QA visual — Power Editor V6

## Alcance de la sesión

La revisión se realiza exclusivamente contra `http://localhost:4174/power-editor-preview`, una ruta temporal aislada del worktree autorizado. No se consulta, escribe ni publica en Supabase; no se modifica `/editor`, `/admin/template-studio`, QR ni rutas públicas.

| Captura | Estado verificado | Resultado |
|---|---|---|
| `localhost_2026-08-27_19-48-49_5814.webp` | Preview de escritorio, botón **Layout** y panel de composición abiertos desde el canvas. | PASS: el canvas sigue escalando por separado de rail/inspector; se muestran los cinco presets V6 y el flujo V5 original permanece visible. |
| `localhost_2026-08-27_19-49-08_4037.webp` | Preset **Hero overlay** de escritorio. | PASS: el perfil se ancla al borde inferior del banner dentro de un `overlay`; el resto de bloques permanece editable. |
| `localhost_2026-08-27_19-50-16_8448.webp` | Preset **Media + copy** de escritorio, tras el ajuste localizado de avatar. | PASS: se materializan las columnas `split-media` y `split-copy`; el perfil ya no recibe el margen negativo exclusivo del flujo legacy. |
| `localhost_2026-08-27_19-53-59_5879.webp` | Preset **Catálogo grid** de escritorio. | PASS: se conservan los nodos `catalog-intro`, `catalog-grid` y `catalog-footer`, incluidos los placements que colapsan a una y dos columnas en móvil y tablet. |
| `localhost_2026-08-27_19-54-15_8711.webp` | Preset **CTA fijo** de escritorio. | PASS: las acciones se renderizan en `fixed-cta` con reserva inferior, safe-area y sin modificar el flujo de publicación. |
| `localhost_2026-08-27_19-54-26_5422.webp` | Ruta temporal móvil con composición CTA fijo almacenada localmente para QA. | PASS: el canvas, la barra contextual y la hoja móvil siguen separados; el CTA se mantiene al final del canvas. |

## Hallazgo de entorno de QA

El preview móvil temporal conserva el ancho deliberadamente estrecho del candidato dentro de un navegador de escritorio; por eso la captura muestra espacio exterior blanco. No corresponde a una ruta pública, no implica una regresión de la página pública y no se cambió para respetar el congelamiento del layout ajeno. La validación con un viewport físico móvil queda pendiente de revisión externa o de una futura QA E2E, no de conexión Supabase.

> Esta bitácora se ampliará con las composiciones distintas y la revisión móvil. Las rutas de las capturas reproducibles se entregarán fuera del árbol desplegable del proyecto.
