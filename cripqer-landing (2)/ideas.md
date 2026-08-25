# Dirección de diseño — Cripqer

## Tres posibles enfoques

### 1. Graphite Atelier

**Muy breve introducción:** Un sistema editorial oscuro, preciso y escultórico donde el producto se percibe como un objeto digital de alto valor. La composición combina grafito, metal cálido y una interfaz tangible con control visual.

**Probabilidad:** 0.07

### 2. Archivo Modernista

**Muy breve introducción:** Una experiencia clara inspirada en señalética institucional y papelería contemporánea, con fondos marfil, líneas de referencia y bloques tipográficos sobrios. Comunica fiabilidad mediante orden y economía visual.

**Probabilidad:** 0.04

### 3. Estudio Prisma

**Muy breve introducción:** Una dirección brillante de laboratorio creativo, con superficies suaves, capas translúcidas y color editorial dosificado. Prioriza la sensación de descubrimiento sin caer en un lenguaje neón.

**Probabilidad:** 0.09

---

## Dirección seleccionada: Graphite Atelier

### Movimiento de diseño

**Minimalismo tecnológico editorial**. La página debe sentirse como una publicación de diseño para un producto de software sofisticado: jerarquía tipográfica expresiva, composición asimétrica, bordes meticulosos y objetos de interfaz casi táctiles. Evita los clichés de las landing SaaS: no hay tarjetas repetidas flotando sin intención, gradientes invasivos ni hero centrado convencional.

### Principios centrales

1. **El producto es la imagen:** los mockups de QR, perfil, plantilla y documento seguro son el lenguaje visual principal, no adornos genéricos.
2. **Jerarquía por escala y contraste:** titulares grandes con cortes de línea intencionados; información técnica en tipografía monoespaciada pequeña y contenido de apoyo compacto.
3. **Precisión material:** bordes de una línea, gráficos cuadriculados extremadamente sutiles, vidrio oscuro restringido y sombras largas, blandas y oscuras.
4. **Ritmo editorial:** secciones que alternan un bloque de información lateral con escenarios del producto, evitando una retícula repetitiva o excesivamente centrada.

### Filosofía del color

El grafito casi negro establece una sensación de producto maduro, concentración y discreción. El texto cálido evita la dureza clínica del blanco puro. El color propietario será **Cobre Sutil (#C49A68)**: no funciona como fondo decorativo ni como degradado, sino como señal de activación, selección y valor premium. Azules de nube muy atenuados se reservan para estados informativos dentro de los mockups; nunca compiten con el cobre.

### Paradigma de layout

Una **composición en rieles editoriales**: el hero se divide entre un bloque textual desplazado a la izquierda y una constelación de objetos de producto anclados a la derecha. A lo largo de la página, cada capítulo abre con una banda estrecha de número/etiqueta y se extiende hacia una escena visual dominante. La grilla se usa como estructura invisible, no como una colección de columnas idénticas.

### Elementos distintivos

1. **Código de registro:** etiquetas monoespaciadas en mayúsculas con punto indicador y numeración secuencial, repetidas en secciones clave.
2. **Marco de inspección:** un borde fino color cobre que indica un elemento seleccionado dentro de mockups y comunica edición en vivo.
3. **Trama técnica fantasma:** líneas de cuadrícula y puntos casi imperceptibles que dan profundidad al fondo sin convertirlo en ruido.

### Filosofía de interacción

La interfaz reacciona como una herramienta profesional: botones con presión mínima, tarjetas que revelan su profundidad al pasar el cursor y muestras de producto que cambian su estado visual de forma explícita. Los enlaces de navegación deben desplazarse a la sección correspondiente. Los CTA de demostración mostrarán una notificación honesta de que son una vista conceptual; no se simularán flujos o datos inexistentes.

### Animación

Las entradas de secciones ocurren una sola vez, entre 180 ms y 350 ms, mediante opacidad y desplazamiento vertical de pocos píxeles. Los grupos se escalonan en 50 ms. Los objetos flotantes del hero se mueven con una deriva mínima y muy lenta; se desactivan para personas que prefieran reducir el movimiento. Hovers y pulsaciones usan transiciones de 160–220 ms y curvas de salida marcadas. Nunca se animan propiedades que obliguen a recalcular el layout.

### Sistema tipográfico

**Manrope** es la voz de interfaz y cuerpo: compacta, técnica y legible. **DM Mono** sirve para etiquetas, métricas y microcopy. Los titulares usan Manrope con peso 700–800, tracking negativo y líneas compactas; el cuerpo se mantiene en 15–17 px con interlineado generoso; las etiquetas se presentan en 10–11 px, con mayúsculas y espaciado perceptible.

### Esencia de marca

**Cripqer es la plataforma para profesionales y equipos que convierten un QR en una presencia digital coherente, editable y segura.**

Personalidad: **precisa, refinada, confiable**.

### Voz de marca

Los titulares son declarativos y seguros, sin hipérbole. Las llamadas a la acción describen la acción real de manera directa. Las frases cortas y específicas sustituyen fórmulas genéricas.

> «Un QR no debería terminar en un enlace cualquiera.»

> «Diseña una presencia que sigue trabajando cuando tú no estás.»

### Logotipo y símbolo

La marca se representa por un **módulo QR abierto**, formado por tres esquinas cuadradas y un punto central de cobre; su geometría evoca conexión, control y una identidad que permanece abierta. El wordmark combina letras espaciadas con una “q” personalizada de cola angular, evitando una fuente por defecto como marca.

### Color distintivo de marca

**Cobre Sutil — #C49A68**

## Decisiones de estilo

- Se mantendrá el fondo Graphite Premium especificado: #08090B, #101216 y #15181D.
- El Cobre Sutil tendrá uso moderado y semántico: activación, selección, foco y detalles de marca.
- Los mockups serán construidos con HTML/CSS y SVG inline para mostrar software real sin depender de imágenes stock ni servicios externos.
- La navegación se adaptará a móvil con un menú compacto, manteniendo los enlaces de sección y las acciones accesibles.

### Ampliaciones de revisión visual

- El módulo QR abierto con centro de Cobre Sutil debe funcionar como dispositivo reconocible en navegación, hero, CTA final y pie de página.
- Cada capítulo principal incluirá un código de registro, una marca de inspección, un borde de selección o una cuadrícula técnica para mantener una secuencia editorial continua.
- Cobre Sutil es el único acento expresivo de marca. Los colores de plantillas son estados contenidos del producto y no sustituyen la jerarquía del cobre.
