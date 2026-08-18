# UI-03 Personalización Visual Avanzada

## OBJETIVO
Añadir personalización visual avanzada (fuentes, colores, degradados, presets, neón) mediante progressive disclosure, conservando la arquitectura de datos existente intacta.

## ESTADO HEREDADO UI-02
El editor cuenta con un panel contextual (360px), Sidebar en Desktop y Bottom Sheet en Mobile, lo cual da espacio limpio para herramientas avanzadas.

## PERSONALIZACIÓN ANTES
Solamente 3 inputs HTML color (`<input type="color">`) y 1 selector nativo con 5 fuentes, que en el render público fallaban porque las fuentes no estaban importadas.

## FUENTES
Se instalaron 10 familias tipográficas de Google Fonts usando los paquetes locales `@fontsource/*`. Esto previene la carga dinámica inyectada desde terceros y el parpadeo (FOIT/FOUT).
Se optimizó incluyendo los `@import` globalmente, por lo que Vite generará el bundle y el navegador únicamente descargará los `.woff2` que se utilicen en el DOM.

## FONT PICKER
Se reemplazó el Select simple por una UI rica y buscable en `TextSection.tsx`:
- Campo de búsqueda en tiempo real.
- Filtros por categoría (Sans, Serif, Manuscrita, etc.).
- Previsualización nativa inline ("Tu página, tu estilo") renderizando la fuente.
- Estado activo clarificado.

## COLORES Y DEGRADADOS
`DesignSection.tsx` fue ampliado:
- Se implementaron *tabs* para conmutar entre **Color Sólido** y **Degradado**.
- Los degradados se guardan directamente como CSS `linear-gradient` dentro de `background_color`.
- Al reabrir el editor, se parsea el valor guardado para restaurar los controles visuales (Color 1, Color 2).

## PRESETS Y NEÓN
- Se añadieron `THEME_PRESETS`, pre-configuraciones de color + texto.
- Se añadieron `GRADIENT_PRESETS`, degradados listos para aplicar con un solo clic.
- **NEON**: Para no romper la DB, usamos la propiedad de color de botón pero agregando un modificador de estado temporal (el string `_NEON` como sufijo). En el frontal, el cliente sabe que si encuentra este flag debe inyectar el resplandor (`box-shadow`) y no guardarlo literalmente en el DOM.

## CONTRASTE
Se implementó una alerta no-bloqueante al detectar bajo ratio de luminancia entre el color de botón y el color de texto (WCAG básico). 

## PROGRESSIVE DISCLOSURE
- Opciones como los Degradados Sugeridos o el Neón se encuentran ocultos bajo componentes `<Collapsible>`, previniendo abrumar al usuario novato.

## ARCHIVOS MODIFICADOS
- `src/styles.css` (Imports @fontsource).
- `src/components/profile/PublicProfileView.tsx` (Gestión de box-shadow, parsing de _NEON y tipografía por defecto).
- `src/components/editor/DesignSection.tsx` (Selector de colores avanzado).
- `src/components/editor/TextSection.tsx` (Font Picker avanzado).

## DEPENDENCIAS
- `@fontsource/inter`, `@fontsource/manrope`, etc.

## LÓGICA PROTEGIDA
- Supabase intacto.
- Auth intacto.
- Ningún modelo de base de datos alterado.
- Flujo QR y URL preservado.

## PRUEBAS
- `npm run build` corrió con Vite SSR sin errores fatales.
- Smoke Test manual en el editor.

## REGRESIONES
- Ninguna conocida. 

## PENDIENTES UI-04
- Efectos avanzados adicionales como "Aura" alrededor del Avatar, elementos decorativos vectoriales o rings SVG.

## VEREDICTO
**PASS**
