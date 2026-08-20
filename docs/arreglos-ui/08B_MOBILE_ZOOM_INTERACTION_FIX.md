## CORRECCIÓN DE INTERACCIÓN: ZOOM MÓVIL (08B)

### Causa Raíz

El control de zoom y el scroll del preview no respondían en móvil debido a un problema de pointer-events en el componente del "Backdrop" (el fondo semitransparente del bottom sheet).
La capa Backdrop tenía la clase pointer-events-auto definida de manera incondicional. Esto causaba que, incluso cuando el panel estaba cerrado (panelOpen === false) y el fondo tenía opacity-0 (haciéndolo completamente invisible), la capa siguiera interceptando absolutamente todos los toques y clicks a nivel de pantalla completa (al estar en un contenedor z-20). Por esta razón, el tap no llegaba a los controles de zoom (z-40, pero ordenados de forma distinta por el stacking context del root) ni al canvas del preview.

### Archivos Corregidos

- src/routes/editor.tsx

### Resultados de la Corrección

- **Pointer-events:** SÍ, era la causa raíz. El backdrop ahora alterna correctamente pointer-events-auto cuando está abierto, y pointer-events-none cuando el panel está cerrado.
- **Z-index / Desktop Restricción:** NO, los eventos estaban siendo engullidos por la capa transparente del backdrop. El z-index de los controles de zoom era suficiente para pintar pero la capa superior los cubría al cerrar el sheet.
- **Botón +:** Responde al instante, aumentando la escala y actualizando el porcentaje visible.
- **Botón -:** Responde al instante, reduciendo la escala y el porcentaje.
- **Botón Ajustar:** Calcula el tamaño de la ventana y lo encaja perfectamente (Math.min(scaleH, scaleW) calculando contra el ancho de un móvil).
- **Build Gate:** lint, uild y sc superados sin errores. (Exit code 0).

**Veredicto:** El usuario ahora puede hacer pan/zoom en la tarjeta generada libremente desde la vista móvil sin colisión de eventos con la navegación.
