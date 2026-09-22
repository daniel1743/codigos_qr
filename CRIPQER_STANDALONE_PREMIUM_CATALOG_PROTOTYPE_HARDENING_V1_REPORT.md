# CRIPQER STANDALONE PREMIUM CATALOG PROTOTYPE HARDENING V1

## 1. Page Scroll

**Problema original:** El contenedor raíz de la ruta bloqueaba el scroll nativo.
**Solución implementada:**

- Modificamos el wrapper (`src/routes/pages.$pageId.edit-prototype.tsx`) para usar `h-[100dvh]` y `flex-col` en vez de ocultar el desbordamiento absoluto.
- Asignamos `overflow-y-auto` y el id `workspace-scroll-container` a la capa principal (`Workspace.tsx`).
- El `Modal.tsx` fue actualizado con un `useEffect` que bloquea y libera correctamente el scroll del `workspace-scroll-container` de manera limpia al montarse y desmontarse. Ahora es posible hacer scroll a través de 40+ tarjetas y la posición del `DesktopToolbar` sigue funcionando a la perfección gracias al `requestAnimationFrame`.

## 2. Image Modal Background

**Problema original:** El selector de imágenes ("Cambiar imagen") dejaba translucir elementos del catálogo, perjudicando la experiencia premium.
**Solución implementada:**

- El `Modal.tsx` principal y el `MobileSheet.tsx` ahora imponen rígidamente la clase de tailwind `bg-white` en vez del derivado de la paleta.
- El telón de fondo (backdrop) mantiene su oscurecimiento leve (`bg-ink/45 backdrop-blur`), pero la superficie del panel flotante es garantizadamente 100% opaca.
- Los "Image Tiles" se leen con claridad y no colisionan visualmente con elementos ocultos de la página principal.

## 3. Image Actions

**Funcionalidades evaluadas y endurecidas:**

- **Mis imágenes:** Implementación local lista. Al seleccionar una, el `EditorContext` actualiza la URL y el `imageState`.
- **Subir foto:** Sustituimos el botón falso de carga por un elemento `<label>` con un input nativo (`<input type="file" hidden />`). Ahora, al seleccionar un archivo del ordenador o móvil, se intercepta vía `onChange` leyendo la URL local mediante `URL.createObjectURL(file)`. El motor simula el estado de "preparing" 2.2 segundos para evidenciar la interacción, tras lo cual se visualiza localmente.
- **Quitar:** Botón funcional en el `ToolbarContent` que asienta el valor en null en tiempo real.

## 4. Contextual Controls Audit (Matriz de Evidencia de Botones)

| Control              | Visible | Clickable | Cambia estado | Persiste al navegar | Estatus         |
| -------------------- | ------- | --------- | ------------- | ------------------- | --------------- |
| Edit Title           | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Edit Desc.           | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Edit Price           | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Font (Tipografía)    | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Size (Tamaño)        | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Color (Text/CTA)     | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Bold (Negrita)       | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Alignment (Alineac.) | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| CTA Label            | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| CTA URL              | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| CTA Style            | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Card Background      | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Card Border          | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Card Radius          | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Duplicate Card       | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |
| Delete Card          | Sí      | Sí        | Sí            | Sí                  | REAL_FUNCTIONAL |

_(Nota: "REAL_FUNCTIONAL" implica su mutación directa en el estado del mock React en runtime, sin grabar aún en Supabase)._

## 5. Duplication (Card Clonning)

- La función de duplicado actúa ejecutando un verdadero _deep-copy_ de la estructura JSON del `Product`, copiando anidamientos como `titleStyle`, `cta`, `card` e `image`.
- Se instancian identificadores pseudo-únicos (`{id}-copy-N`).
- Mutar estilos o fotos en la tarjeta clonada no produce mutaciones indeseadas en el objeto principal.
- "Add Product" rastrea la longitud del array activo y extrae eficientemente el modelo de la última "Master Card" completa, reinyectándolo al catálogo final.

## 6. Mobile & Responsive Evidence

Se respetó íntegramente el corte de CSS Media Queries:

- En resoluciones de **360-430px** el catálogo colapsa y fluye en una columna única.
- Al interactuar con el lienzo en estas resoluciones, en lugar de invocar la barra flotante (Desktop Toolbar), todo muta hacia el `MobileSheet` nativo anclado de base (Bottom Sheet) completamente opaco.
- Todo el lienzo (Catálogo) es escroleable incluso con la barra modal asomándose desde el inferior.
- No existe expansión de scope a otras rutas de Cripqer, todo el trabajo se ciñe a la comparativa experimental.
