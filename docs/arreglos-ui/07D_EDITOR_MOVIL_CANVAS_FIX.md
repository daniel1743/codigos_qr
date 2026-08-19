# 07D: CORRECCIÓN DE LAYOUT Y RESPONSIVE EN EDITOR MÓVIL

## OBJETIVO RECIBIDO

1. Eliminar el fallo en móvil por el que hacer scroll provocaba que el Bottom Navigation subiera y dejara espacio blanco.
2. Transformar el preview en móvil, que ocupaba "pantalla completa" al estilo página pública, para que se vea como un verdadero canvas/workspace con la tarjeta del landing escalada y centrada, similar al flujo de desktop.

## CAUSA RAÍZ

1. **Espacio en blanco inferior y scroll de menú:** En iOS y Android, un diseño con `100dvh` y `flex-col` puede experimentar desincronizaciones ("bounce effect") si el contenido interior (`PublicProfileView`) genera un encadenamiento de scroll ("scroll chaining") que termine intentando hacer scroll del `<body>`. Al hacerlo, las barras de dirección de los navegadores cambian dinámicamente la altura del viewport (`100dvh`), contrayendo el layout de React y elevando el menú `nav`, exponiendo fondo neutro inferior.
2. **Preview a Pantalla Completa:** En dispositivos móviles, la estructura del contenedor limitaba el tamaño fijo de `375px` y bordes redondeados _únicamente para resoluciones de escritorio_ (a través de la clase `md:w-[375px]`). Al quitar `md`, tomaba el 100% de alto y ancho de la ventana, sin usar escalado (`scale`) porque la lógica de Zoom estaba bloqueada a `window.innerWidth >= 768`.

## ARCHIVOS MODIFICADOS

- `src/routes/editor.tsx`
- `src/components/profile/PublicProfileView.tsx`

## QUÉ SE CORRIGIÓ EN MÓVIL (Y CÓMO QUEDÓ)

### 1. El Bottom Navigation y el Scroll

- Se añadió la propiedad `relative` y la regla estricta `overscroll-none` al div raíz de la página del Editor. Esto bloquea al navegador (Safari/Chrome) e impide el clásico "bounce effect" que desplaza todo el DOM en los ejes Y.
- Se agregó `overscroll-contain` al contenedor de scroll de `PublicProfileView`. Esto asegura que el scroll termine de forma segura donde pertenece (en los enlaces de la microsite) y jamás propague eventos de wheel/touch-drag a su padre. El bottom-nav ahora está fundido y fijo, de manera imperturbable, al suelo del dispositivo.

### 2. El Canvas/Preview

- Se removieron los prefijos `md:` que bloqueaban los bordes redondeados y el ancho rígido del mock del teléfono. Ahora, la microsite asume su rol físico inmutable de `w-[375px] h-[750px]` sin importar la resolución.
- El algoritmo `handleFit` fue liberado de sus validaciones Desktop-only. Ahora, tras el montaje del componente, toma el tamaño matemático de las pantallas móviles (ej. un iPhone 12 Pro con ancho de ~390px, restando paddings) y aplica la transformación dinámica `scale()`.
- **Resultado:** En móvil se aprecia una pantalla con sombra suave, esquinas visibles, aire alrededor (canvas), separándolo explícitamente de la experiencia del producto final publicado.

### 3. Ajustes de Controles de Zoom

- Los botones manuales de Zoom y AutoAjuste están ahora disponibles transversalmente (para móvil y desktop).
- El logaritmo de escalado ya no depende de indexaciones exactas sobre los peldaños configurados (`[0.5, 0.6...]`), sino que sube/baja de forma porcentual flexible encontrando el escalón más certero o fijándose a un cálculo infinito, permitiendo escalas perfectas (`ej. 0.869`) en pantallas de múltiples tamaños sin quebrar los controles de `+` y `-`.

## VALIDACIONES

- **Build / Lint / Typecheck:** Ejecución de CI/CD local (`npm run lint`, `npx tsc --noEmit`, `npm run build`) terminando con Exit Code 0 (PASS).
- **Regresiones:** Desktop conserva su sidebar izquierda y la misma experiencia ya que las matemáticas empleadas para escalar se acoplan independientemente del factor de forma de la pantalla. No se tocaron lógicas del QR, RLS, auth, ni BD (Supabase).

## VEREDICTO FINAL

La percepción y UX del software de edición en el navegador móvil ha dado el salto para sentirse como una PWA nativa tipo 'workspace'. El problema de encuadre en el DOM fue exitosamente interceptado mediante CSS moderno y matemáticas de transformación.
**[TAREA QR-UI-07D FINALIZADA CORRECTAMENTE]**
