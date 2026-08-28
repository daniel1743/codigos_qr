# QA — Paletas Premium

## Alcance comprobado

| Escenario | Resultado |
|---|---|
| Herramienta lateral | `Paletas Premium` está visible en el rail contextual del editor de escritorio. |
| Catálogo | El inspector muestra las 24 paletas distribuidas en cinco categorías, con miniatura y swatches. |
| Contraste | La suite verifica que las 24 cumplen contraste mínimo de 4.5:1 para texto principal y texto de botón. Cuatro pares se ajustaron durante la comprobación para alcanzar el umbral: Rose Champagne, Bordeaux Luxe, Terracotta Modern y Forest Luxe. |
| Vista previa reversible | Elegir `Platino` cambió el canvas a `VISTA PREVIA DE PALETA` sin establecer una paleta activa en PageConfig. |
| Aplicar | `Aplicar a la plantilla` activó Platino y lo guardó dentro de `page.palette.selectedId` y `page.palette.appliedScopes`. |
| Undo | `Deshacer` restauró la configuración previa; el inspector volvió a indicar `Sin paleta aplicada`. |
| Aplicación parcial | El código admite fondos, tipografía, acentos, bordes/contornos o selección manual de ámbitos. La prueba unitaria confirma que el modo bordes no altera fondo ni tema. |

## Límites deliberados

La herramienta sólo transforma roles del `PageConfig` del Power Editor aislado. No crea templates maestros, no sincroniza Supabase, no toca rutas públicas ni publica contenido. La persistencia remota seguirá ocurriendo exclusivamente a través de la ruta interna de borrador cuando haya sesión y configuración de entorno reales.
