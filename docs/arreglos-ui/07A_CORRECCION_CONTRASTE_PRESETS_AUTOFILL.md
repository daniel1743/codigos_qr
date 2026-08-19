# 07A CORRECCIÓN VISUAL DE PRESETS Y AUTOFILL DE ENLACES

## PROBLEMAS DETECTADOS
Durante la revisión visual del editor, se encontraron los siguientes problemas críticos que afectaban la experiencia de uso:
1. **Contraste de Presets:** Configuraciones de color como `Beauty` presentaban bajísima legibilidad entre botones blancos sobre fondo beige claro. Lo mismo ocurría con `Photography`, `Warm`, `Editorial` y `Dark`.
2. **Estado Seleccionado Recortado:** En el selector de plantillas (`TemplatePicker.tsx`), al hacer clic en un preset, el borde azul que denotaba selección quedaba recortado por el contenedor y se sobreponía de manera tosca.
3. **Fricción al Crear Enlaces:** Al seleccionar una nueva plataforma en la sección de enlaces, el texto del botón no se autocompletaba, obligando al usuario a escribir "Instagram", "Facebook", etc. manualmente cada vez.

## SOLUCIONES APLICADAS

### 1. Corrección de Contraste en Presets
Se auditaron y corrigieron los 12 presets en `template-presets.ts` asegurando legibilidad sin perder la personalidad de cada tema:
- **Beauty:** De `button_color: #FFFFFF` a `#D9A897` con texto `#5C4138`. Ahora mantiene su tono suave pero los elementos son claramente distinguibles.
- **Editorial:** El `button_color` era `#F3EEE6` (igual al fondo). Se corrigió a `#181818` para que el estilo "line" funcione (línea y texto oscuros sobre fondo claro).
- **Photography:** Se corrigió a `#151515` (en el estilo minimalista, el color del botón define el color del texto).
- **Warm:** Se cambió el `button_color` de `#D9C9B4` a `#8B7355` para garantizar que no desaparezca en el fondo `#EFE5D6`.
- **Dark:** Se preservó su estructura `card` corrigiendo el botón a `#262626` para garantizar que el texto sobre la tarjeta blanca (backdrop) sea oscuro y legible.
- Además, las miniaturas en `TemplatePicker.tsx` ahora simulan visualmente las variantes `line`, `minimal`, `soft` y `card` para proveer un preview fidedigno.

### 2. Bug de Borde Seleccionado (Ring Recortado)
En `TemplatePicker.tsx` se reemplazó el uso conflictivo de `ring-2 ring-primary ring-offset-1` por un comportamiento más estable: `border-2 border-primary` vs `border-2 border-transparent` (estado inactivo). Esto elimina los cortes provocados por cajas con `overflow` o escaso margen de sangría.

### 3. Smart Autofill de Plataforma
En `LinksSection.tsx`, se integró una lógica robusta en el selector de red social (`Select` `onValueChange`):
- Cuando el usuario cambia la plataforma, el campo "Texto del botón" se actualiza automáticamente con el nombre de la red (Ej. "Instagram").
- **Protección de texto custom:** Si el usuario ya había escrito un texto personalizado (Ej. "Reserva tu cita"), el autofill se cancela y respeta la intención del usuario. Solo sobrescribe si el campo está vacío o si su valor coincide con la lista de etiquetas autogeneradas previas ("Mi enlace", "X", "TikTok", etc.).
- **URL protegida:** La URL del usuario jamás se ve afectada por el cambio de plataforma.

## BACKLOG (PALETA DE 4 COLORES)
El concepto "Define tu paleta" (Background, Surface, Accent, Text) queda formalmente documentado para el futuro como *DEFERRED*. Actualmente el sistema UI-07 + UI-07A cubre eficientemente las necesidades MVP mediante legibilidad automática (YIQ) y presets pulidos.

## VERIFICACIONES TÉCNICAS
- **Pruebas de Autofill:** Cambio `Instagram -> WhatsApp` autocompleta con éxito. Cambio teniendo label `"Mi portafolio" -> LinkedIn` no modifica la etiqueta, respetando al usuario.
- **Lint / Build / TypeCheck (TSC):** `PASS`.

## VEREDICTO
Fase QR-UI-07A aprobada y cerrada. El constructor visual ahora posee una alta fidelidad en los presets y la fluidez requerida en la creación de enlaces, removiendo la fricción de escritura manual.
