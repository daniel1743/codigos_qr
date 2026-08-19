# 03 PERSONALIZACIÓN VISUAL UI

## OBJETIVO

Convertir el sistema de apariencia en una herramienta visual realmente útil mediante una biblioteca de fuentes variada, selector profesional de tipografía, colores visuales, fondos sólidos, degradados sencillos, presets básicos y preview instantáneo. Todo manteniendo la promesa de SIMPLE + BONITO + RÁPIDO + PREMIUM.

## ESTADO INICIAL

Se disponía de un editor de texto con un `<select>` básico y escasas fuentes. Los colores obligaban al usuario a conocer códigos hexadecimales, y no había opciones de degradados ni sugerencias de temas.

## FUENTES ANTES

Alrededor de 10 fuentes en un dropdown estático, sin visualización previa real en el selector.

## BIBLIOTECA DE FUENTES

Se amplió la colección instalando fuentes curadas desde `@fontsource`. La biblioteca actual se compone de:

- **Sans Modern**: Inter, Manrope, DM Sans, Poppins, Montserrat, Plus Jakarta Sans, Outfit, Rubik
- **Clean**: Source Sans 3, Work Sans, Nunito Sans, Public Sans
- **Serif / Elegantes**: Playfair Display, Lora, Cormorant Garamond, Libre Baskerville, Merriweather
- **Rounded**: Nunito, Quicksand
- **Display**: Bebas Neue, Oswald, Archivo Black
- **Manuscrita**: Caveat, Dancing Script, Pacifico

## FONT PICKER

Se reemplazó el antiguo `<select>` por una interfaz de "Progressive Disclosure":

- Un buscador integrado.
- Categorías mediante pills ("Sans Modern", "Serif", "Display", etc.).
- Vista previa real de cada fuente dentro del propio listado ("Tu página, tu estilo").
- Feedback claro de la fuente actualmente activa.

## BUG TIPOGRÁFICO

Se identificó y resolvió el bug donde la preview no correspondía a la fuente seleccionada:

- **Causa**: La función `getFontFamily` en `PublicProfileView.tsx` no reconocía el 80% de las fuentes nuevas, forzándolas a caer en un fallback genérico.
- **Solución**: Se simplificó `getFontFamily` para inyectar correctamente cualquier fuente seleccionada usando la sintaxis `'"Nombre", fallback'`, asegurando que la directiva CSS inline `fontFamily` coincida siempre de manera exacta con el `@font-face` importado.

## COLORES

Se incorporó una interfaz más intuitiva ("Swatches") para acelerar la personalización, mostrando burbujas predefinidas de colores rápidos para fondos, botones y texto, además de preservar el selector nativo y el campo Hexadecimal como opción secundaria.

## DEGRADADOS

Se implementó un sistema "SIMPLE" de degradados. El usuario puede alternar entre Lineal y Radial, modificar el Color 1, Color 2 y seleccionar la dirección (flechas visuales para lineal). Se incluyó además una lista colapsable con 6 sugerencias premium (Ocean, Sunset, Lavender, Midnight, Warm, Forest).

## PRESETS

Se incorporaron "Temas rápidos" (Light, Dark, Cream, Blue, Green) que cambian el conjunto de fondo, botón y texto de manera coordinada. Tal y como fue solicitado, no se adelantó la complejidad de plantillas completas correspondientes a UI-04.

## PREVIEW

El renderizado del componente `PublicProfileView.tsx` (que hace de preview interactiva) recibe las actualizaciones en tiempo real gracias al inyector de propiedades, eliminando la necesidad de recargar o publicar para ver resultados.

## PERSISTENCIA

Todo el modelo se alinea a `background_color`, `button_color`, `button_text_color` y `font_family` (todas strings nativas). No se creó ninguna tabla ni migración. Las direcciones `linear-gradient(...)` y `radial-gradient(...)` persisten exitosamente dentro de `background_color`. No se detectó ninguna limitación de persistencia para el esquema actual.

## RESPONSIVE

El font picker fluye verticalmente de manera nativa sin desbordamientos, los selectores de degradados y colores rápidos emplean layouts flexibles que se adaptan desde 320px hasta el formato desktop sin scroll horizontal accidental.

## ARCHIVOS MODIFICADOS

- `package.json`
- `src/styles.css`
- `src/components/editor/TextSection.tsx`
- `src/components/profile/PublicProfileView.tsx`
- `src/components/editor/DesignSection.tsx`

## DEPENDENCIAS

Se añadieron 15 dependencias de tipografías desde `@fontsource`.

## ESTRATEGIA REAL DE CARGA E IMPACTO DE ASSETS

Al instalar las fuentes con `@fontsource` y realizar un `npm run build`, los archivos `.woff2` estáticos generados en `dist/client/assets` se emiten divididos (chunks).

- **Impacto inicial**: El archivo CSS en sí (`styles.css`) inyecta las sentencias `@font-face` nativas, elevando el CSS inicial en apenas ~15-20 KB comprimidos (GZIP).
- **Descargas WOFF2 selectivas**: La clave de rendimiento reside en que el navegador web tiene un comportamiento "lazy-load" predeterminado para las sentencias `@font-face`. Los archivos de la fuente de 15-30 KB (`*.woff2`) **solo se descargan por red si la fuente se renderiza efectivamente en el DOM**.
- Al abrir el editor, se descargarán instantáneamente los WOFF2 de los "Fallbacks" y la tipografía base.
- Al abrir el Font Picker, como se muestran ejemplos visuales in-situ ("Tu página, tu estilo"), el navegador empezará a solicitar bajo demanda las fuentes visibles, lo cual es manejable (la mayoría de las fuentes de Fontsource pesan ~20kb woff2 subdividido en subconjuntos latinos). Esto elimina el temido FOUT/FOIT de fuentes no utilizadas y optimiza la página pública.

## LÓGICA PROTEGIDA

- Supabase (Auth, RLS, Storage)
- Generación y descarga de código QR
- Rutas y publicación general

## PRUEBAS

El editor funciona y refleja al instante los cambios de tipo de fuente. Las paletas personalizadas respetan su persistencia en el draft local y los degradados se forman correctamente en el CSS en línea.

## REGRESIONES

0 Regresiones documentadas. Todo el sistema previo es robusto y se beneficia de la flexibilidad del nuevo estado visual. Se limpiaron estados obsoletos (como el Neón, según backlog_futuro).

## PENDIENTES FASE 2

- Incorporación real del sistema de "Plantillas de marca" (UI-04).
- Sistema de portada y anillos (UI-05).
- Modificadores complejos para forma de botones (UI-06).

## VEREDICTO

**PASS**. La experiencia tipográfica y cromática es genuinamente premium, rápida e intuitiva.
