# CRIPQER STANDALONE PREMIUM CATALOG EDITOR PROTOTYPE V1

## 1. Arquitectura del Prototipo

Se ha implementado una arquitectura de **página web premium independiente** (Standalone Page Editor). En lugar de tratar el catálogo como un lienzo embebido y rodeado de paneles forzosos, se ha levantado el prototipo como una experiencia inmersiva.

- **Aislamiento:** Todo el código reside en `src/features/experimental-premium-editor/`, totalmente desacoplado del actual `PowerEditorHost` de Cripqer.
- **Enrutamiento:** Se expuso una ruta de prueba en `/pages/$pageId/edit-prototype` para no interferir con la edición productiva en `/edit` que está trabajando Codex.
- **Estado:** Usa un `EditorContext` local y datos mockeados para probar la interacción (Tocar -> Editar -> Ver cambio) sin mutar la base de datos de producción real.

## 2. Archivos Creados

- `src/routes/pages.$pageId.edit-prototype.tsx` (Shell experimental de TanStack Router)
- `src/features/experimental-premium-editor/*` (Directorio íntegro conteniendo el clon exacto del entorno React de Magic Patterns).
- Adaptación de `index.css` local utilizando la directiva `@theme inline` de Tailwind v4 para inyectar los tokens de diseño (colores, sombras, tipografías) sin afectar la configuración global del proyecto Cripqer.

## 3. Componentes Portados Fielmente

Todo el sistema de `Magic Patterns` fue trasladado con fidelidad:

- `Workspace.tsx` y `TopBar.tsx` (Estructura base)
- `ProductCard.tsx`, `CardImage.tsx`, `InlineText.tsx` (Componentes visuales de producto premium con relación 4:3 y espaciados generosos)
- `DesktopToolbar.tsx`, `MobileSheet.tsx`, `SideInspector.tsx` (Controles contextuales anclados a la selección)
- `DetailModal.tsx`, `ChangeImageModal.tsx`, `ConfirmDelete.tsx`, `PublishWarningModal.tsx` (Capas de flotación e interceptación de acciones críticas).

## 4. Desviaciones de Magic Patterns

- **Virtualmente Ninguna:** El código se extrajo directamente del prototipo aprobado por el Product Owner.
- **Ajuste Técnico Menor:** Refactorización de camelCase en tokens Tailwind CSS v4 (ej. de `--color-brandSoft` y `--color-selSoft`) para ajustarse al motor de Vite en Cripqer, y se importó dinámicamente `framer-motion` para mantener la fluidez y las animaciones exactas.

## 5. Evidencia Desktop

El lienzo principal muestra el Grid de 3 columnas (aprox. 1240px de ancho) con una experiencia libre de distracciones. Al hacer click sobre cualquier elemento (imagen, título, precio, CTA), aparece una única barra flotante (`DesktopToolbar`) directamente encima o debajo del elemento sin empujar la maquetación.

## 6. Evidencia Mobile

En resoluciones de 360px a 430px, el layout colapsa elegantemente de 3 columnas a 1-2. La barra flotante desaparece y las herramientas contextuales se delegan a un `MobileSheet` nativo anclado en la parte inferior, con áreas táctiles generosas y animaciones expansibles, sin perder de vista el componente que se está editando.

## 7. Comportamiento de Duplicación (Core Product Model)

Implementado el paradigma de la "Master Card". No existen estados vacíos o "fantasmas".
Al utilizar el botón `AddProductTile` (con su intención clara) o el botón duplicar en la barra de un producto existente, se genera una copia exacta (estilos, textos, imágenes, proporciones) preservando la armonía del diseño original, y enfocando automáticamente al nuevo clon listo para ser sobreescrito.

## 8. Complejidad Técnica

- **Del Prototipo (Baja):** Portar y aislar la carpeta fue relativamente directo utilizando un puente en la capa de Router de TanStack.
- **Del Backend Real (Media/Alta):** El editor de Magic Patterns usa un esquema de datos plano altamente optimizado para interacciones locales. Reconciliar esto con la arquitectura subyacente de Supabase en Cripqer requerirá sincronizar este estado local contra los `Blocks` del motor.

## 9. Complejidad de Integración Estimada

**ALTA.** Aunque la UX es muy superior visualmente, la integración con el esquema real requerirá:

1. Crear adaptadores (Mappers) bi-direccionales de `ProductCardBlock` a `ProductState` (y viceversa).
2. Manejar de forma robusta los guardados en segundo plano (debounce saves) que en el Power Editor actual ya están centralizados pero aquí deben instanciarse a nivel de la tarjeta interactiva.

## 10. Riesgos

- **Cisma Arquitectónico:** Mantener dos editores en paralelo podría confundir al usuario si navegan entre "páginas clásicas" y "páginas premium".
- **Pérdida de Compatibilidad:** Los bloques clásicos tienen campos que no están presentes en el prototipo Magic (ni viceversa).
- **Teclado en Móviles:** Hay riesgo de colisión de UX en iOS/Android cuando el `MobileSheet` y el teclado nativo se abren simultáneamente al editar un texto inline.

## 11. Reusabilidad para Menú / Portfolio / Servicios

El sistema principal (`DesktopToolbar`, `MobileSheet`, lógica de Focus y `ChangeImageModal` con el Guardial visual de Stock de referencia) está lo suficientemente modularizado como para abstraerse en un paquete `ContextualEditorUI`.
Se podría aplicar el exacto mismo paradigma de clonación (Master Clone) a Platos de Menú, Fotografías de Portafolio y Tarjetas de Precios de Servicios, acelerando dramáticamente la creación de páginas en estos sectores sin modificar la base arquitectónica desarrollada aquí.
