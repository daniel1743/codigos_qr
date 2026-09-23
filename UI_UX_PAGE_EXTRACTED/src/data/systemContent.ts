import type { ElementKind } from '../types/editor';

export const editingContract: {kind: ElementKind;element: string;tap: string;actions: string[];mobileExtra?: string;}[] = [
{ kind: 'text', element: 'Texto', tap: 'Se escribe en el sitio', actions: ['Tamaño', 'Negrita', 'Color', 'Alinear', 'Más'], mobileExtra: 'Escribir (abre teclado)' },
{ kind: 'image', element: 'Imagen', tap: 'Imagen seleccionada', actions: ['Reemplazar', 'Recortar', 'Posición', 'Quitar', 'Más'] },
{ kind: 'cta', element: 'Botón / CTA', tap: 'Botón seleccionado', actions: ['Texto', 'Enlace', 'Estilo', 'Más'] },
{ kind: 'avatar', element: 'Avatar', tap: 'Avatar seleccionado', actions: ['Reemplazar', 'Forma', 'Borde', 'Tamaño', 'Más'] },
{ kind: 'hero', element: 'Portada', tap: 'Portada seleccionada', actions: ['Imagen', 'Variante', 'Forma', 'Fondo', 'Más'] },
{ kind: 'social', element: 'Icono social', tap: 'Icono seleccionado', actions: ['Red', 'Destino', 'Estilo', 'Quitar'] },
{ kind: 'card', element: 'Card de colección', tap: 'Card seleccionada', actions: ['Editar texto', 'Imagen', 'Enlace', 'Quitar', 'Más'] },
{ kind: 'gallery', element: 'Galería', tap: 'Conjunto seleccionado', actions: ['Fotos', 'Diseño', 'Más'] },
{ kind: 'section', element: 'Bloque / sección', tap: 'Barra estructural', actions: ['Fondo', 'Subir', 'Bajar', 'Duplicar', 'Ocultar', 'Eliminar', 'Más'], mobileExtra: 'Añadir debajo' },
{ kind: 'page', element: 'Fondo de página', tap: 'Controles de página', actions: ['Fondo', 'Tipografía', 'Ajustes'] }];


export const collectionVariants: {id: string;label: string;use: string;}[] = [
{ id: 'cards', label: 'Cards', use: 'Imagen + título + enlace. Usado en Bio («Lo último»).' },
{ id: 'products', label: 'Productos', use: 'Imagen, precio y botón de compra.' },
{ id: 'services', label: 'Servicios', use: 'CTA largo con imagen. Usado en Negocio.' },
{ id: 'menu', label: 'Menú / carta', use: 'Filas de nombre, descripción y precio.' },
{ id: 'portfolio', label: 'Portfolio', use: 'Índice editorial de proyectos. Usado en Portfolio.' },
{ id: 'testimonials', label: 'Testimonios', use: 'Cita, nombre y foto de quien opina.' }];


export const editorParts: {name: string;spec: string;}[] = [
{ name: 'Contorno de hover', spec: 'Solo escritorio. 1,5 px discontinuo. Dice «esto se puede tocar» sin ensuciar la página.' },
{ name: 'Anillo de selección', spec: '2 px #2F6BFF, sigue el radio del objeto. Se dibuja encima: nunca mueve el layout.' },
{ name: 'Barra flotante', spec: '44 px. Etiqueta del objeto, 3–5 acciones directas, Más y cerrar. Se ancla sobre el objeto.' },
{ name: 'Panel de acción', spec: 'Popover de 340 px bajo la barra. Solo uno abierto a la vez.' },
{ name: 'Más', spec: 'Opciones avanzadas del objeto + estructura de su bloque. Mismo sitio en todos los elementos.' },
{ name: 'Seleccionar padre', spec: 'Sube de texto → card → bloque con un toque, sin buscar en capas.' },
{ name: 'Bottom sheet compacto', spec: '≈200 px. Tiles de 68 px desplazables en horizontal.' },
{ name: 'Bottom sheet expandido', spec: '74 % de alto. Muestra el panel de una acción o Más.' },
{ name: 'Barra de formato + teclado', spec: 'Se acopla sobre el teclado con «Listo». El texto sube por encima.' },
{ name: 'Añadir bloque', spec: 'En el borde del bloque seleccionado y al final de la página.' },
{ name: 'Selector de bloques', spec: 'Block Kit V1. Los bloques nuevos heredan el estilo de la plantilla.' },
{ name: 'Barra superior', spec: 'Deshacer, rehacer, estado de guardado, ajustes, vista previa y publicar.' }];


export const consistencyRules: {title: string;body: string;}[] = [
{
  title: 'Un contrato por tipo de elemento, no por plantilla',
  body: 'Un texto siempre ofrece Tamaño · Negrita · Color · Alinear. Un botón siempre Texto · Enlace · Estilo. Da igual si vive en una bio crema o en un portfolio negro.'
},
{
  title: 'Una sola lista de acciones alimenta las dos superficies',
  body: 'La barra flotante de escritorio y el bottom sheet de móvil leen la misma definición. Cambia la ergonomía (tamaño, posición), nunca el vocabulario ni el orden.'
},
{
  title: 'Las plantillas solo aportan la piel',
  body: 'Color, tipografía, radios y composición. Ninguna plantilla define controles propios, así que no existe «el editor de la plantilla X».'
},
{
  title: 'Selección única y jerárquica',
  body: 'Tocar selecciona lo más concreto bajo el dedo. «Seleccionar padre» sube de nivel. Nunca hay dos objetos activos.'
},
{
  title: 'Lo avanzado siempre está en «Más»',
  body: 'Accesibilidad, comportamiento, espaciado y estructura del bloque viven en el mismo lugar para todos los elementos. La barra se mantiene corta.'
},
{
  title: 'Lo nuevo hereda el estilo',
  body: 'Un bloque añadido desde el Block Kit se dibuja con los tokens de la página. El usuario elige qué añadir, nunca cómo debe verse.'
}];


export const mobileRules: string[] = [
'Probado a 360, 390 y 430 px desde el propio editor.',
'Objetivos táctiles de 44 px o más (tiles de 68 px).',
'El objeto seleccionado se desplaza por encima del sheet.',
'Teclado: barra de formato acoplada y botón «Listo».',
'Subir / Bajar en lugar de arrastrar con precisión.',
'Deslizar el sheet: arriba expande, abajo contrae o cierra.'];