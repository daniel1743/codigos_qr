# 07C: ZOOM Y ALERTA DE CONTRASTE DE ENLACES

## OBJETIVO
Brindar una experiencia superior en el editor implementando:
1. Controles de Zoom (`-`, `+`, `Ajustar`) para visualizar la composición completa del perfil en un solo pantallazo (sin cortar la longitud real del mockup de teléfono).
2. Un sistema algorítmico (basado en WCAG) para advertir inteligentemente sobre un bajo contraste en los botones.
3. Consolidar miniaturas estáticas y neutrales en el selector de estilos, garantizando que jamás se vuelvan ilegibles al cambiar los colores del perfil activo.

## ALGORITMO Y CONTRASTE
Se incorporó el helper `src/lib/color-utils.ts` para desplazar las reglas visuales simples por cálculos matemáticos estrictos y certeros (Luminancia Relativa y Ratio WCAG):
- `evaluateContrast(foreground, background)` clasifica el par resultante en `PASS`, `WARNING`, `POOR`.
- Se introdujo `mixColorsAlpha` para predecir con exactitud la percepción de color en botones con transparencias.

### CONTRASTE POR BUTTON_STYLE
En `DesignSection.tsx` se agregó una evaluación sensible al estilo seleccionado.
- **Solid / Pill:** Evalúa `button_text_color` vs `button_color`. (Propone corrección en text_color).
- **Soft:** Evalúa `button_color` vs Superficie Simulada (`button_color` @ 8% opacity sobre el `background_color`). (Propone corrección en button_color).
- **Card:** Evalúa `button_color` vs `white` (o la mezcla de `white` 90% sobre el fondo). (Propone corrección en button_color).
- **Line / Minimal / Outline:** Evalúan `button_color` contra el fondo sólido o dominante. (Propone corrección en button_color).

### SOFT/ALPHA
La propiedad Soft ahora cuenta con el mix alfa en JS puro: Se extrae el HEX base y se mezcla al 8% sobre el fondo, logrando evaluar contra el color *renderizado final*, impidiendo alertas falsas y garantizando warnings precisos.

### GRADIENTES
Se implementó `extractSolidHex`, un extractor mediante expresiones regulares. Al lidiar con gradientes (`linear-gradient(...)`), extrae el primer color absoluto del CSS para tomar decisiones preventivas y razonables sin romper las composiciones.

## BUG PREVIEW & ZOOM
El preview anterior limitaba caprichosamente la altura a un `90vh`, lo cual recortaba enlaces si la lista era larga, dando la impresión de que el perfil terminaba abruptamente.
- Eliminamos la constricción destructiva `max-h-[90vh]`.
- Se introdujeron controles flotantes para Desktop (`hidden md:flex`) debajo del preview.
- **Zoom:** Funciona modificando la propiedad CSS `transform: scale(N)` a niveles discretos (50% a 125%).
- **Ajustar:** Lee el `clientHeight` disponible del espacio en blanco y escala matemáticamente el mockup para mostrarse 100% íntegro dentro de la visual sin hacer clipping de enlaces, priorizando ver toda la altura del dispositivo (o scroll si el usuario agrega demasiados).

## WARNING INLINE Y COLOR RECOMENDADO
- Aparece debajo de las paletas en la sección de diseño cuando el algoritmo lanza una advertencia.
- Interfaz no bloqueante.
- Consta de ícono contextual (`AlertTriangle`), una leyenda (naranja/ámbar para WARNING, y rojo para POOR) con el ratio matemático exacto, y el botón **"Usar color recomendado"**.
- El fix automático invoca `getRecommendedTextColor(background)` que inyecta Blanco puro (`#FFFFFF`) o Negro puro (`#111111`) favoreciendo el que tenga el ratio WCAG más alto contra el respectivo fondo.

## MINIATURAS DE ESTILOS
- Antes: Empleaban iterativamente el color elegido de fondo y botón. Ciertos colores elegidos por el usuario borraban completamente los estilos de Card, Minimal, o Soft.
- Ahora: Utilizan una paleta neutral (`demoBtn: "#111827"`, `demoText: "#FFFFFF"`, `demoBorder: "#CBD5E1"`) garantizando una fidelidad anatómica de cada botón de muestra, separando exitosamente la demostración estructural del estilo elegido.

## ACCESSIBILITY
- Zoom operables y semánticos, usando `<Button aria-label="...">` y un indicador `aria-label="Nivel de zoom actual"` inyectado para VoiceOver y lectores.
- Todos los controles, incluído el "Ajustar", soportan teclado de forma nativa al heredarlo del sistema `Button` y lucen bordes visibles bajo focus.

## ARCHIVOS MODIFICADOS
- `src/lib/color-utils.ts` [NEW]
- `src/routes/editor.tsx` [MODIFIED]
- `src/components/editor/DesignSection.tsx` [MODIFIED]
- `src/lib/design/template-presets.ts` [MODIFIED] (Se corrigieron 3 presets base que generaban WARNING con el nuevo motor: *Beauty*, *Warm* y *Sunset* ajustando sutilmente su color de texto asignado por defecto para superar WCAG).

## TESTS
- **Zoom Desktop:** Funciona en ambas direcciones sin exceder topes.
- **AutoAjuste (Fit):** Logra un ratio perfecto en ventanas pequeñas (ej. ~65%).
- **Mobile:** Los controles flotantes están elegantemente ocultos; el preview es fluido natural al 100%.
- **Validación de Contrastes:** `Soft` con color suave sobre fondo suave dispara Warning. Blanco sobre #111111 en Card dispara PASS.
- **Auto-Fix:** "Usar color recomendado" reacciona al instante insertando el tono ganador.

## STATUS
- LINT: PASS (0 exit)
- BUILD: PASS (0 exit)
- TSC: PASS (0 exit)

## VEREDICTO
La interfaz del editor ha ascendido significativamente a nivel corporativo y pro-user.
El usuario es advertido elegantemente para salvarlo de micrositios ilegibles pero cuenta con total libertad de acción. Los fallos del layout del mockup quedaron resueltos.
No se introdujeron nuevas funcionalidades que perjudicaran los planes de UI/UX futuros o la integridad de Base de datos / RLS.

**QR-UI-07C FINALIZADO EXITOSAMENTE.**
