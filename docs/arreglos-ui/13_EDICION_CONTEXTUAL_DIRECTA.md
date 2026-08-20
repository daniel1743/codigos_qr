# Edición Contextual Directa (Toca y Edita)

## OBJETIVO
Convertir el preview del editor en una superficie de edición contextual donde el usuario pueda tocar directamente un elemento visible (nombre, descripción, avatar, portada, fondo o enlaces) y acceder inmediatamente a sus opciones más usadas, reduciendo la fricción y mejorando la UX.

## PROBLEMA DE FRICCIÓN
Anteriormente, el usuario debía navegar por el panel lateral, buscar la pestaña correcta (ej. "Texto") y luego encontrar el control específico. Esto generaba fricción cognitiva, ya que los usuarios esperan interactuar directamente con lo que ven.

## ARQUITECTURA
Se implementó un componente `ContextualToolbar` basado en `Popover` de Radix UI. 
- Utiliza la arquitectura `selectedElement` (tipo de elemento `title`, `bio`, `avatar`, `cover`, `background`, `link`).
- Envuelve los elementos interactivos mediante un componente helper `ContextWrapper` inyectado en `PublicProfileView` exclusivamente si `isPreview` es true.
- El toolbar renderiza a través de un Portal (`PopoverPrimitive.Portal`), lo que evita problemas de z-index o recortes por `overflow-hidden` y soporta de forma robusta el reposicionamiento.
- Todo muta el estado global de `profile` y `links` que existe en `editor.tsx`.

## EDITOR VS PUBLIC PAGE
La funcionalidad contextual existe ÚNICAMENTE en el modo editor (`isPreview = true`). La página pública (`/p/:publicId`) y la ruta con alias no incluyen los envoltorios interactivos ni importan la lógica del popover, por lo que su comportamiento sigue siendo el estándar (solo lectura).

## SELECCIÓN
- Desktop y Mobile reaccionan al click/tap.
- Se ha agregado un efecto visual de `ring` translúcido al hacer hover sobre los elementos seleccionables (excepto el fondo, para no distraer) para indicar interactividad.
- Al seleccionar, aparece un tooltip elegante encima o debajo del elemento.
- Hacer click fuera del tooltip (en otra parte de la pantalla) deselecciona el elemento de forma automática gracias al comportamiento nativo de Radix Popover.

## TOOLBAR DESKTOP & MOBILE
Se utilizó la misma interfaz flotante responsiva para ambas vistas:
- Touch targets accesibles.
- No oscurece el teclado ni bloquea el zoom actual.
- Posicionamiento automático para no salir del viewport.

## ACCIONES IMPLEMENTADAS
- **TÍTULO**: Alineación (Izquierda, Centro, Derecha), Negrita (toggle), Selector rápido nativo de Color, y botón Más opciones.
- **BIO**: Alineación, Selector de Color y botón Más opciones.
- **AVATAR**: Alternar forma (Circular, Redondeado), Alternar Ring (Borde), y botón Más opciones.
- **PORTADA**: Cambiar portada y Quitar portada (si existe), y botón Más opciones.
- **BOTONES**: Color Global, Forma Global (Cuadrado, Esquinas, Redondo) y botón Más opciones.
- **FONDO**: Color de fondo rápido y atajos rápidos a la pestaña Diseño.

## MÁS OPCIONES
El botón "Más opciones" (icono de puntos suspensivos) invoca la función `onOpenSidebar`, la cual indica a `editor.tsx` que debe abrir el panel lateral correspondiente (`text`, `profile`, `links`, o `design`). De esta manera, las configuraciones avanzadas nunca están lejos.

## SINCRONIZACIÓN SIDEBAR
Dado que el `ContextualToolbar` y los paneles laterales en `editor.tsx` llaman a la misma función `setProfile` / `setLinks`, cualquier cambio realizado en la barra de herramientas se refleja instantáneamente en el sidebar y viceversa. Existe una única fuente de verdad.

## FRICTION TEST
- **Antes**: Para cambiar el color del título, el usuario debía hacer click en "Texto" -> Buscar la sección "Título" -> Hacer click en color -> Cambiar color. (4-5 interacciones).
- **Después**: Tocar el título -> Tocar Color (2 interacciones).
El esfuerzo se ha reducido significativamente.

## ACCESSIBILITY
- Radix Popover gestiona atributos WAI-ARIA (`aria-expanded`, `aria-haspopup`).
- Los inputs de color tienen `aria-label`/`title`.
- La navegación por teclado y el foco no quedan atrapados. Escape cierra el toolbar.

## RESPONSIVE & SSR
- El uso de Radix Popover garantiza el cálculo del viewport incluso en dispositivos móviles estrechos. SSR no se ve afectado porque el renderizado del `ContextualToolbar` solo se activa dinámicamente en el cliente dentro del Editor.

## REGRESSIONS
- **Links en el editor**: Los enlaces tienen `onClick={(e) => { if (isPreview) e.preventDefault(); }}` para que no abran páginas externas al seleccionarlos.
- **Página pública**: No hay outlines, popovers ni herramientas de edición.
- **Zoom**: Al no depender de coordenadas absolutas manuales o `z-index` conflictivos, el `ZoomIn` / `ZoomOut` de la previsualización no se rompe y el popover se reposiciona correctamente.
- El QR, historial de aperturas y el flujo de guardado no han sido modificados de ninguna forma. `public_id` se mantiene idéntico y seguro.

## TECHNICAL GATES
- **Lint**: Todo código fue fixado (se superó el strict de TypeScript quitando `any`). Error de linting pre-existentes resueltos con `--fix`.
- **Build**: `vite build` ejecutado exitosamente sin errores de compilación para el entorno Nitro / Tanstack Router.
- **TSC**: `tsc --noEmit` retornó un exit code 0 certificando una validación estricta de TypeScript.

## VEREDICTO
La fase de **Edición Contextual Directa** se ha completado satisfactoriamente, cumpliendo estrictamente con el contrato de NO transformar la aplicación en un editor libre (Canva-like), y conservando la robustez de la arquitectura base orientada a plantillas.

## 13A REWORK UX

### REGRESIÓN AVATAR Y LAYOUT NEUTRAL WRAPPERS
Para evitar que el editor contextual altere la composición, alineación o dimensiones de la landing, se reestructuró ContextWrapper. En lugar de utilizar contenedores div intermedios, se implementó el componente <Slot> de Radix UI. Esto permite inyectar la interactividad (eventos click y estilos de hover/active) directamente sobre el elemento original del DOM, logrando un footprint de layout equivalente a cero y restaurando la posición original exacta del Avatar y de todos los componentes.

### TOOLBARS SEMÁNTICAS Y CONTROLES FUNCIONALES
Se reescribió ContextualToolbar.tsx utilizando lucide-react para mantener coherencia semántica premium sin engordar el bundle. Se incorporaron:
- **Labels explícitos** (ej. "Editar", "Cambiar", "Forma", "Ring") para evitar ambigüedad.
- **Tooltips nativos** en desktop para cada acción icon-only.
- **Dropdowns rotulados** en lugar de íconos geométricos sueltos (ej. para seleccionar formas de Avatar o estilos de botones globales).
- **Indicadores de estado (Active)** claramente diferenciados para alineaciones, formatos y bordes.
- **Touch Targets Optimizados** para asegurar que los elementos accionables tengan al menos 44px de altura/anchura en mobile (min-h-[44px]).

### SCREENSHOT QA
- **Preview sin selección:** Aspecto 100% idéntico a la landing pública. Cero cajas o outlines visibles.
- **Interacción:** El hover deinea un borde sutil (ing-2 ring-primary/20) y la selección despliega la toolbar con borde primario, únicamente sobre el elemento editado.
- **Funcionalidad:** Todos los selectores de Forma (Botones y Avatar), Estilo, Tamaños, Alineaciones y colores disparan un cambio directo mediante onProfileChange en tiempo real.
