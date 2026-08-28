# QA de correcciones reportadas por el usuario

## Alcance

Este registro cubre exclusivamente el preview aislado `power-editor-preview`. No se modificaron `/editor`, rutas públicas, QR, navegación productiva, publicación ni producción.

| Hallazgo reportado | Corrección aplicada | Evidencia local |
|---|---|---|
| Bloque superior `CRIPQER` sobre banner | El logo textual por defecto se eliminó y la hidratación neutraliza el valor heredado `CRIPQER` cuando no existe `logoUrl`. | Canvas recargado: queda avatar `AM` sin caja ni marca textual superior. |
| No había color individual para botones | Seleccionar un enlace abre `Color`; el panel contiene fondo, texto, borde, variante, radio y sombra. Soporta estilos globales o individuales. | El canvas de enlace abrió el inspector `Color` con los seis controles visibles. |
| No había tipografía para botones | El panel `Color` ahora contiene `Tipografía del botón`: familia, tamaño, peso, espaciado, itálica, contorno, sombra y sus colores. | Se eligió `Poppins` en el enlace seleccionado y el canvas mostró el cambio. |
| Borde sin control explícito y variantes confusas | El panel contiene `Borde del botón` con interruptor `Mostrar borde`, medidor de `Grosor de borde` de 0–8 px y texto fijo de orientación. El botón de ayuda produce toast contextual. | Se activó el borde a 1 px y el toast confirmó que `Sólido` mantiene fielmente el color seleccionado. |

La comprobación adicional con la variante `Premium` mostró el aviso contextual: “Premium interpreta o mezcla el color elegido; usa Sólido para fidelidad total.” El mismo aviso permanece visible en texto junto al selector para que la explicación no dependa exclusivamente de un toast pasajero.

| Fallo reportado posterior | Causa comprobada | Corrección | Evidencia |
|---|---|---|---|
| El color del texto y el grosor del borde no se veían en el botón. | El renderer escribía `border-width`, pero una regla heredada mantenía `border-style: none`; al no existir un color explícito de borde, el fallback era transparente. Las variantes heredadas también podían ganar la precedencia de color. | El renderer define `borderStyle`, `borderWidth`, `borderColor` y variables CSS explícitas. El CSS de fixes restituye la precedencia de color y borde sobre las variantes; al activar borde sin elegir color se usa `page.theme.buttonColor`. | DOM computado: texto `rgb(242, 247, 255)` y borde `rgb(255, 62, 201)`, sólido, de 1 px, tras interactuar con los controles reales. |

| Paleta solicitada bajo grosor de borde | Se incorporó una paleta rápida en el mismo grupo `Borde del botón`, debajo del medidor. | Ocho colores: Dorado, Platino, Cobre, Blanco, Grafito, Azul neón, Fucsia y Verde jade. Elegir uno activa el borde si estaba apagado y actualiza el color exacto. | Se seleccionó `Platino`; el selector exacto de borde pasó a `#d9dde6` y el borde visible del enlace se actualizó. |

| Inspector de título y texto incompleto | `Texto` para bloques `heading` y `text` reúne contenido, fuente, tamaño, peso, botón Negrita, cursiva, mayúsculas, subrayado, color, paleta, contorno, sombra, interletrado, interlineado y ancho. | El contorno usa `WebkitTextStroke` en el renderer para que el grosor y el color se reflejen en el canvas. | La respuesta SSR del preview contiene las secciones `Color y contorno` y `Ancho del texto`; las tres pruebas del modelo de estilo pasaron. Pendiente de confirmación visual del propietario en el enlace temporal. |
| `Salir de vista previa` no respondía | El gesto de pan deja explícitamente fuera al botón y el botón tiene prioridad de puntero. | Entrada a preview y retorno a canvas verificados en la misma sesión. |
| Panel Efectos pobre | Se añadieron acabado, borde, glow, glass, gradiente, filtros, movimiento y biblioteca de marco/partículas/anillo/forma/ornamento. | Inspector `Efectos` expuso sus cuatro grupos y sus controles. |
| Partículas dispersas | La biblioteca de Efectos inserta la capa y la selección resultante queda dentro de Efectos, con parámetros de tipo, color, cantidad, tamaño y velocidad. | Tras insertar partículas, el inspector mostró `Partículas seleccionadas` dentro de `Efectos`. |
| Finalizar no hacía nada comprobable | `Finalizar` exporta un JSON de PageConfig y muestra que compartir/publicar requiere una URL pública real. | Toast: `Configuración exportada. Compartir requiere una URL pública real.` |

## Validación automatizada

La suite completa terminó en PASS: **48 pruebas en 6 archivos**. Incluye una nueva prueba de hidratación que retira el fallback de marca y una prueba inmutable del estilo de enlace.

La construcción Vite completó su parte de frontend (`✓ built in 606ms`). Nitro inició el empaquetado posterior pero el proceso recibió terminación por presión de memoria mientras el servidor de preview permanecía activo; ese resultado se registra como **no concluyente para el empaquetado Nitro**, no como aprobación del build completo. No se reintentará mientras el enlace temporal esté activo para el usuario.

## Limitación deliberada

`Guardar` usa almacenamiento local únicamente dentro de esta ruta de preview, ya que no hay `projectId` ni sesión autenticada conectada ahí. La ruta interna de borrador sigue siendo la única que puede usar el servicio remoto y debe probarse con credenciales de entorno seguras y un proyecto propio. `Compartir` y publicación no se simulan: requieren la futura ruta pública autorizada y permanecen fuera de este alcance.
