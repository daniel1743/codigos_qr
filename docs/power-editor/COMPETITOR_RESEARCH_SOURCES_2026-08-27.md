# Fuentes de investigación de editores profesionales

**Propósito:** trazabilidad de fuentes para el plan del Power Editor.
**Estado:** investigación; no implica adopción de características externas ni cambios de código.

| Producto / fuente | Hallazgo verificable | Implicación para Cripqer |
|---|---|---|
| [Webflow — Box model](https://help.webflow.com/hc/en-us/articles/33961333856787-Intro-to-the-box-model) | La web se organiza en cajas que pueden apilarse, alinearse horizontalmente o anidarse; el flujo del contenido es responsive y no equivale a un lienzo de diapositivas. | Justifica un árbol de nodos con contenedores y layout declarativo, no sólo una lista plana de bloques. |
| [Framer — Layout grids](https://www.framer.com/help/articles/layout-grids/) | Una grilla se configura por breakpoint, con columnas o filas, gap, márgenes y anchura independientes. | Apoya overrides por breakpoint para layout, limitados a valores explícitamente autorizados. |
| [Landingi — Sections](https://landingi.com/help/sections-lp-foundation/) | Las secciones funcionan como contenedores horizontales; admite secciones de una a cuatro columnas, orden, duplicado, borrado, background, borde, altura y visibilidad por vista. | Confirma que secciones y contenedores son la mejora de mayor palanca para diversidad de macroestructura. |
| [Wix Studio — Section Grid](https://support.wix.com/en/article/studio-editor-customizing-a-section-grid) | Sus secciones incluyen una grilla con celdas que pueden dividirse, fusionarse, intercambiarse y configurarse; la grilla avanzada permite filas/columnas responsive. | Recomienda comenzar con presets de grid limitados y una profundidad máxima, antes de exponer layout arbitrario. |
| [WordPress — Site Editing Templates](https://developer.wordpress.org/block-editor/explanations/architecture/full-site-editing-templates/) | WordPress mantiene template base y una copia sincronizada editable con estado de borrador/publicación. | Refuerza separar templates maestros de copias de usuario y no mutar el origen desde el editor personal. |
| [Unbounce — Section Grids](https://documentation.unbounce.com/hc/en-us/articles/36828041441940-Using-Section-Grids-and-the-Snap-To-Grid-Function) | Configura por sección columnas, altura de fila, gaps, padding y snap-to-grid; sus valores pueden variar por desktop/móvil. | Apoya presets de 12/24 columnas en escritorio y una grilla móvil reducida con reglas de caída seguras. |

Las fuentes restantes de la matriz comparativa están consolidadas en `/home/ubuntu/professional_editor_competitor_research.json` y se citarán en el informe final con sus URLs oficiales.
