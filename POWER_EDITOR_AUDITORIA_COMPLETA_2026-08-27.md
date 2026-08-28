# Cripqer Power Editor — Auditoría Completa de Producto, Arquitectura y Diversidad

**Fecha:** 27 de agosto de 2026
**Método:** auditoría de solo lectura sobre el worktree local aislado de `daniel1743/codigos_qr`.
**Estado:** documento de decisión; no se modificó código, CSS, modelo, renderer, rutas, recipes, artefactos, Supabase, GitHub ni despliegue durante esta auditoría.

> **Corrección metodológica:** el artefacto previo prueba que las doce recetas son JSON distintos y que cubren 25 tipos de bloque. No prueba que sean doce arquitecturas perceptualmente distintas. Todas parten de una gramática vertical muy parecida, por lo que el valor `7/10` anterior no debe interpretarse como una certificación de diversidad visual.

## 1. Conclusión ejecutiva

El Power Editor dispone de una superficie de estilo amplia —materiales, fondos, media, botones, tarjetas, vídeo, galerías, decoraciones, partículas, tipografía, filtros y motion— y sí puede producir configuraciones de calidad premium. Sin embargo, su composición raíz sigue siendo una lista plana y ordenada de bloques. Esa decisión técnica hace que la mayoría de las recetas, incluso cuando usan paletas, imágenes o bloques distintos, se perciban como variaciones de una misma silueta móvil.

La siguiente tabla separa lo que el producto puede hacer hoy de lo que no debe prometer todavía.

| Afirmación | Estado auditado | Implicación |
|---|---|---|
| Los bloques pueden ordenarse, activarse, ocultarse y estilizarse. | Confirmado. | Permite variedad de contenido dentro de una página vertical. |
| Hay una grilla interna para enlaces, tarjetas, galería, servicios y productos. | Confirmado, con límites por bloque. | Permite 1–2 columnas y algunos valores declarados hasta 3; no es una grilla de página genérica. |
| Cada receta puede tener identidad, media y material distintos. | Confirmado en el pack. | La diversidad cosmética y de bloques está disponible. |
| El editor soporta contenedores, secciones anidadas, filas libres o split-screen. | No. | Es la causa principal de la macroestructura repetitiva. |
| El catálogo de 12 recetas es visualmente diverso en runtime. | No certificado. | Requiere contact sheet y revisión humana; no se generó ni modificó ningún render en esta auditoría. |
| Se puede publicar o sincronizar automáticamente un catálogo. | No validado y fuera de alcance. | No se debe activar publicación ni sincronización a partir de esta auditoría. |

## 2. Mapa completo de `PageConfig`

El contrato canónico se concentra en `src/power-editor/client/src/lib/editorCandidateModel.ts`. Es serializable en JSON y no contiene componentes React ni comportamiento ejecutable.

| Área | Campos principales | Finalidad | Observación de auditoría |
|---|---|---|---|
| Versionado | `version` | Hidratar configuraciones históricas. | `hydratePageConfig()` normaliza a v5. |
| Perfil/capacidades | `profile`, `capabilities` | Activa o limita bloques y acabados. | `premium` habilita los 25 bloques y todas las capacidades declaradas. |
| Branding | `branding.showCripqerWatermark` | Controla la marca en footer. | Sólo puede ocultarse si la capacidad premium lo permite. |
| Tema | fuente, color/tamaño/peso de título, color/radio/gap/alto/padding de botón, sombra de título. | Define sistema tipográfico y CTA global. | Parte de los tamaños/padding globales no se consume de forma uniforme por todos los bloques. |
| Fondo | base, gradiente, ángulo, patrón, color/opacidad de patrón, textura y luz. | Materialidad de página. | Se renderiza como variables/classes CSS de la plantilla raíz. |
| Bloques | `blocks: PageBlock[]` | Orden, tipo, visibilidad, bloqueo y props libres. | Lista plana; no hay árbol de secciones o contenedores. |
| Presets | `presets: StylePreset[]` | Copiar/aplicar estilos parciales. | Persisten dentro del PageConfig; no son biblioteca remota. |
| Estilo por bloque | composición, borde, sombra, glow, glass, gradiente, filtros, efecto, mezcla, máscara, motion, responsive. | Estética y parte de la composición. | Algunas propiedades declaradas no tienen control o efecto completo. |
| Responsive | `mobile`, `tablet`, `desktop` por bloque. | Ocultar y alterar parte del estilo. | No cambia el orden de bloques y no dispone de reglas de secciones. |

### 2.1 Gramática de composición real

```text
PageConfig
└── blocks[]  (lista plana ordenada por `order`)
    ├── banner (se renderiza primero si está habilitado)
    └── resto de bloques (se renderiza secuencialmente dentro de un único contenido)
```

La inserción añade contenido después de la selección o antes del footer. `reorderBlock()` modifica el mismo orden global para todos los breakpoints. Esta gramática explica por qué la entrada predominante termina siendo **identidad → titular → enlaces → extras → redes → footer**, aunque los extras cambien.

## 3. Catálogo auditado de los 25 bloques

| # | Bloque | Propiedades principales auditadas | Panel/editor | Renderer interno | Responsive | Evidencia de uso en pack |
|---:|---|---|---|---|---|---|
| 1 | `banner` | URL, altura, fit, posición, overlay, blend, fusión, radio. | Imagen + Fusión. | Fondo hero con máscara/fusión. | Ocultable; no hay hero por breakpoint. | Sí. |
| 2 | `profile` | avatar/logo, forma, tamaño, borde, sombra, alineación, región vertical, overlap. | Imagen + Avatar avanzado. | Logo y avatar, con solapamiento discreto. | Ocultable; sin reubicación completa por breakpoint. | Sí. |
| 3 | `heading` | texto, tipografía, peso, color, transform, shadow, interlineado. | Texto/Fuente/Color/Formato. | Título. | Ocultar, font-size y align. | Sí. |
| 4 | `text` | texto, tipografía, color, formato. | Texto/Fuente/Color/Formato. | Subtítulo/copia. | Ocultar, font-size y align. | Sí. |
| 5 | `links` | items, variante, layout, estilo individual, icono. | Botón. | Rejilla de CTA. | Ocultar, 1–2 columnas efectivas. | Sí. |
| 6 | `socials` | red, URL, alineación, gap, tamaño, color, pills. | Redes. | Iconos sociales. | Ocultar y gap; sin reordenamiento de redes por breakpoint. | Sí. |
| 7 | `image` | URL, alt, altura, fit, posición, radio, filtros. | Imagen. | Tarjeta de imagen. | Ocultable; filtros no varían por breakpoint. | Sí. |
| 8 | `video` | items URL/título, full/two-column, aspect ratio, superficie. | Vídeo. | Tarjeta que abre URL en preview. | Ocultar; dos columnas propias del bloque. | Sí. |
| 9 | `cards` | items, imagen, título, copy, CTA, layout, superficie. | Tarjetas. | Cards internas. | Ocultar; columnas declaradas. | Sí. |
| 10 | `separator` | estilo, color, ancho. | Decoración. | Separador. | Ocultable. | Sí. |
| 11 | `spacer` | altura. | Contenido. | Espacio vertical. | Ocultable; altura no tiene override específico. | Sí. |
| 12 | `gallery` | items URL, layout, gap, radio, aspect ratio. | Contenido. | Galería interna. | Ocultar; columnas/gap declarados. | Sí. |
| 13 | `services` | items, icono, copy, CTA, URL, imagen, layout. | Contenido. | Grilla de servicios. | Ocultar; columnas declaradas. | Sí. |
| 14 | `reviews` | items, avatar, rating, featured, layout. | Contenido. | Reseñas o placeholder honesto vacío. | Ocultable. | Sí, vacío. |
| 15 | `products` | items, precio, CTA, imagen, layout. | Contenido. | Grilla de producto. | Ocultar; columnas declaradas. | Sí. |
| 16 | `booking` | título, descripción, CTA, URL. | Contenido. | Tarjeta de reserva. | Ocultable. | Sí. |
| 17 | `faq` | preguntas/respuestas, layout. | Contenido. | Cards FAQ. | Ocultar; columnas declaradas. | Sí. |
| 18 | `contact` | título, descripción, email/teléfono/URL, CTA. | Contenido. | Tarjeta de contacto. | Ocultable. | Sí. |
| 19 | `map` | título, dirección, URL. | Contenido. | Tarjeta enlazada a Maps. | Ocultable. | Sí. |
| 20 | `shape` | forma, color, stroke, tamaño, rotación, posición. | Decoración. | Decoración absoluta discreta. | Ocultable. | Sí. |
| 21 | `ring` | color, grosor, tamaño, parcial, posición. | Decoración. | Anillo decorativo. | Ocultable. | Sí. |
| 22 | `ornament` | preset, posición, inset, tamaño, grosor, color. | Decoración. | Ornamento. | Ocultable. | Sí. |
| 23 | `frame` | preset, inset, grosor, color, opacidad, radio. | Decoración. | Marco. | Ocultable. | Sí. |
| 24 | `particles` | preset, cantidad, tamaño, opacidad, velocidad, dirección, color. | Decoración. | Partículas CSS. | Ocultable; sin densidad por breakpoint. | Sí. |
| 25 | `footer` | textos, alineación, preset, fuente, color, opacidad, divisor. | Footer. | Cierre y branding. | Ocultable. | Sí. |

**Resultado de cobertura:** el pack declara los 25 tipos al menos una vez. Esta cobertura mide repertorio, no equivalencia de arquitectura.

## 4. Matriz modelo → editor → renderer → responsive → receta

La matriz completa y exportable está en `POWER_EDITOR_CAPABILITY_MATRIX_2026-08-27.csv`. Sus conclusiones son las siguientes:

| Relación | Confirmación | Límite |
|---|---|---|
| Bloque → editor | Los 25 tipos son seleccionables o insertables, salvo `banner`, `profile` y `footer`, que son estructurales del template base. | El editor no ofrece un constructor de secciones. |
| Bloque → renderer | Los 25 tipos tienen rama de `CanvasBlock`. | Que se renderice no implica que todas sus props se rendericen. |
| Bloque → responsive | Todos pueden ocultarse mediante `ResponsiveOverride.hidden`. | El orden es global; sólo algunos bloques consumen columns/font/align de forma visible. |
| Receta → bloque | El pack cubre todas las familias. | La mayoría de recetas empieza por banner/perfil/título/enlaces. |
| Modelo → controles | Avanzado expone composición, borde, sombra, glow, glass, gradiente, máscara, motion y parte del responsive. | Varios campos son parciales o no están expuestos. |

## 5. Brechas entre modelo, editor y renderer

### 5.1 Propiedades que existen en el modelo pero no se materializan completamente

| Propiedad declarada | Estado visible | Motivo verificable |
|---|---|---|
| `composition.snap` | No renderizada ni editable. | No participa en el estilo ni en drag/reorder. |
| `glass.borderOpacity` | No renderizada ni editable. | El renderer aplica tint/transparencia/blur, pero no borde específico de glass. |
| `glass.highlight` | No renderizada ni editable. | No se transforma en CSS del bloque. |
| `gradient.position` | No renderizada ni editable. | El renderer usa tipo, colores y ángulo; no usa posición radial declarada. |
| `ResponsiveOverride.padding` | Declarada, pero no resuelta en `visualStyleFor`. | Se mantienen `composition.padding` globales. |
| `ResponsiveOverride.marginTop` / `marginBottom` | Declaradas, pero no resueltas en `visualStyleFor`. | Se mantienen márgenes globales. |
| `particles.randomness` | No aplicada por el renderer. | La posición se deriva determinísticamente del índice. |
| `particles.blur` | No aplicada como propiedad individual. | Algunos presets tienen blur CSS fijo, no el valor del modelo. |

### 5.2 Propiedades renderizadas pero no editables de forma completa

| Propiedad visible | Disponibilidad de edición | Observación |
|---|---|---|
| `filters.grayscale` y `filters.blur` | Editables en `MediaPanel` para imagen; no en el panel avanzado general. | Un bloque vídeo/tarjeta puede llevar el dato, pero el usuario no tiene control equivalente consistente. |
| `motion.intensity` | El renderer la consume para `float`; no hay control dedicado. | Otros presets de motion no escalan sistemáticamente con ella. |
| `LinkItem.style.textColor`, `borderColor`, `radius`, `shadow` | Declarables e hidratables, pero el inspector sólo expone variante/color y estilos globales. | La personalización de CTA no es completa por enlace. |
| `profile.logoFit`, `logoRadius` | Editables y visibles. | Son una excepción: el perfil tiene mejor cobertura que otros bloques. |
| `reviews.featuredId` | Declarado, pero el renderer privilegia `item.featured`. | Riesgo de dos fuentes de verdad para destacadas. |
| `shape.stroke` y `shape.rotation` | Se renderizan; el panel de decoración debe verificarse por control concreto. | No hay un sistema de coordenadas libre asociado. |

### 5.3 Capacidades disponibles sin evidencia de uso intencional suficiente en las 12 recetas

No hay un vacío de *tipo de bloque*: los 25 están cubiertos. Sí hay capacidades que no tienen cobertura demostrada como decisión de composición:

| Capacidad | Cobertura auditada | Limitación de interpretación |
|---|---|---|
| Ocultamiento por breakpoint | Disponible. | No se documenta una receta cuyo diseño cambie narrativamente entre móvil/tablet/desktop. |
| Overrides de padding/márgenes | Declarados. | No se aplican por renderer, por tanto no deben contar como diversidad real. |
| Tres columnas en composición | Declaradas en avanzado. | La aceptación visual debe comprobarse por bloque; varias ramas sólo distinguen explícitamente una/dos columnas. |
| Layout de perfil sin identidad | Posible ocultando el bloque. | No existe una arquitectura de primera clase “sin perfil”; sería una lista vertical con un bloque deshabilitado. |
| Motion con intensidad controlada | La variable existe. | No hay control de intensidad ni demostración uniforme por preset. |
| Estilos por CTA individuales completos | Parcial. | Existen en datos, pero no se editan de forma integral. |

## 6. Respuesta explícita sobre arquitecturas de layout

| Capacidad solicitada | ¿Existe hoy? | Evidencia/alcance |
|---|---:|---|
| Contenedores genéricos | No. | Sólo existe la plantilla raíz y bloques planos. |
| Filas genéricas | No. | Hay listados y grids internos; no una fila que agrupe bloques. |
| Columnas genéricas | No. | Sólo `links`, `cards`, `gallery`, `services`, `products`, `video` y algunos bloques admiten columnas internas. |
| Grids reales | Parcial. | Rejillas internas de bloque, no grilla de página editable. |
| Superposición | Parcial. | Avatar sobre banner y decoraciones con posiciones discretas; no hay capas libres por bloque. |
| Posicionamiento libre | No. | Hay `translateX/Y` y presets top/bottom/left/right; no sistema de coordenadas/layout absoluto editable. |
| Orden por breakpoint | No. | `order` es global. |
| Ocultamiento por breakpoint | Sí. | `ResponsiveOverride.hidden` se resuelve antes de renderizar. |
| CTA fijo/sticky | No. | No existe propiedad, rama de renderer ni CSS de CTA fixed. |
| Hero full-screen | No. | Banner tiene altura configurable acotada; no ocupa el viewport. |
| Layout sin perfil | Parcial. | El bloque profile puede ocultarse, pero no hay plantilla estructural alternativa. |
| Layout split-screen | No. | Requeriría contenedores/filas de nivel página y renderer asociado. |

## 7. Por qué se conserva la estructura vertical

La plantilla renderiza el banner fuera del contenido y todos los demás bloques en una única secuencia. Esto aporta simplicidad, reordenamiento táctil claro, accesibilidad lineal y un canvas predecible; al mismo tiempo impide que una receta sea un dossier de dos columnas, una portada split-screen, un hero de viewport completo o una landing con CTA fijo.

No es un defecto cosmético que se corrija con paletas, partículas o fotos nuevas. La repetición perceptual sólo se reduce parcialmente con recetas; para eliminarla de raíz hace falta evolucionar el modelo de composición.

## 8. Diversity Score corregido

El score previo era insuficiente porque premiaba huellas técnicas diferentes. El método futuro debe separar cuatro dimensiones y no aceptar un score global sin sus componentes.

| Dimensión | Peso propuesto | Pregunta | Penalización necesaria |
|---|---:|---|---|
| Macroestructura | 55% | ¿Cambia el orden y rol narrativo de las zonas principales? | Penaliza inicio repetido `perfil/título/enlaces`, misma ubicación de CTA y ausencia de secciones. |
| Diversidad de bloques | 25% | ¿Cambia el bloque eje, cantidad y secuencia de familias? | Penaliza el mismo multiset/orden de extras. |
| Media/identidad | 15% | ¿Cambia el tipo, posición y relación entre banner/avatar/media? | Penaliza foto distinta con misma composición. |
| Cosmética | 5% | ¿Cambian material, fuente, fondo, efectos y color? | Nunca puede elevar por sí sola una receta a nivel alto. |

### 8.1 Cálculo recomendado

1. Convertir cada receta en un vector de gramática: `hero`, `identidad`, `bloque-eje`, `CTA`, `información`, `cierre`.
2. Medir distancia de edición ponderada de la secuencia, dando mayor coste a cambiar/insertar/retirar un rol macro que a cambiar color o fuente.
3. Calcular similitud por pares con la siguiente prioridad: macroestructura 0.55, bloques 0.25, media 0.15, cosmética 0.05.
4. Reportar por receta: media de similitud perceptual contra las otras once, par más parecido, componentes de score y justificación textual.
5. Rechazar una receta si comparte los tres primeros roles macro y el mismo patrón de CTA con otra, aunque cambie paleta, avatar o media.

**Lectura retrospectiva del pack actual:** las doce recetas tienen diversidad cosmética y de bloques alta; la macroestructura es baja/media, porque comparten una entrada de identidad y acciones antes de contenido diferencial. Por ello, el anterior `7/10` debe retirarse y sustituirse por un desglose; no se asigna una nueva nota numérica hasta contar con renders comparables.

## 9. Evaluación individual de las 20 propuestas existentes

**Escala 1–5:** nivel de diferenciación arquitectónica alcanzable **con el editor actual**; 5 requiere una macroestructura perceptiblemente distinta y se marca como condicionado cuando el producto no la soporta todavía.

| # | Propuesta | Nivel | Evaluación individual |
|---:|---|---:|---|
| 1 | Maison Aurea | 3 | Producto y CTA pueden diferenciarse; mantiene columna de identidad. |
| 2 | Atelier Platino | 3 | Dossier de galería es viable, pero la “galería 2×3” vive dentro de un bloque. |
| 3 | Obsidian Sessions | 3 | Vídeo protagonista y agenda cambian el eje, no la raíz vertical. |
| 4 | Esmeralda Privada | 2 | Servicios/FAQ/reserva es una secuencia cercana a concierge actual. |
| 5 | Cobalto Lab | 3 | Cards + vídeo técnico dan una narrativa distinta, dentro de la misma columna. |
| 6 | Rosa Nupcial | 2 | Banner/perfil/reserva/galería repite una macroestructura frecuente. |
| 7 | Terra Obra | 3 | Imagen vertical/productos/mapa crea un recorrido maker distinto. |
| 8 | Ivory Notes | 3 | La ausencia intencional de media y el texto editorial dan contraste perceptual. |
| 9 | Gold After Dark | 3 | Reserva/productos/mapa orienta a local y conversión. |
| 10 | Platinum Aesthetics | 2 | Muy próximo a la receta Platinum Salon; no debe entrar sin cambio de gramática. |
| 11 | Cobalt Broadcast | 3 | Vídeo/capítulos/plataformas aporta eje audiovisual claro. |
| 12 | Emerald Journal II | 2 | Cercano a Emerald Journal existente. |
| 13 | Noir Portfolio | 4 | Imagen hero interior + galería prioritaria reduce la lectura de bio-link convencional. |
| 14 | Lumen Hotel | 3 | Servicios/galería/reserva/mapa tiene flujo hospitality coherente. |
| 15 | Velvet Club | 3 | CTA/video/FAQ sin perfil puede diferenciarse si se oculta identidad. |
| 16 | Sandstone Advisory | 3 | Copy/servicios/casos/contacto es viable y sobrio. |
| 17 | Ocean Reserve | 3 | Galería/reserva/mapa cambia el bloque eje. |
| 18 | Scarlet Table | 3 | Menú/productos/vídeo/reserva crea recorrido gastronómico. |
| 19 | Violet Archive | 4 | Cards cronológicas/galería/mapa sin avatar sería de las siluetas más distintas viables. |
| 20 | Silver Frame | 3 | Vídeo/portfolio/contacto funciona, pero conserva identidad/acciones tempranas. |

## 10. Treinta recetas adicionales propuestas, sin generar

Estas son blueprints de auditoría; no se crearon configs, archivos ni artefactos.

| # | Blueprint | Bloque eje | Razón de diversidad |
|---:|---|---|---|
| 1 | Archive Noir | Cards cronológicas | Secuencia manifiesto → archivo → galería → mapa. |
| 2 | Casa de Plata | Galería | Dossier visual sin banner ni CTA inicial. |
| 3 | Frame Atelier | Imagen editorial | Hero interior seguido de casos, no bio-link. |
| 4 | Lumen Notes | Texto/manifiesto | Espacio negativo, una sola acción tardía. |
| 5 | Cobalt Signal | Vídeo | Vídeo como primer bloque visible tras título técnico. |
| 6 | Gold Reserve | Productos | Catálogo producto antes de cualquier enlace. |
| 7 | Terra Process | Servicios + vídeo | Proceso maker antes de contacto. |
| 8 | Emerald Retreat | Reserva | Calendario/servicios primero, identidad secundaria. |
| 9 | Rose Vows | Galería + FAQ | Narrativa de ceremonia, acciones al final. |
| 10 | Obsidian Radio | Vídeo + cards | Episodios y plataformas, sin banner. |
| 11 | Platinum Brief | Texto + cards | Caso editorial/consultoría con marco. |
| 12 | Ivory Index | FAQ | Índice de conocimiento sin avatar. |
| 13 | Copper Table | Productos + mapa | Restaurante con menú y ubicación. |
| 14 | Jade Ritual | Reserva + texto | Ritual/wellness con separadores. |
| 15 | Moonlit Studio | Galería | Portfolio nocturno con partículas discretas. |
| 16 | Sandstone Ledger | Cards | Credenciales y casos, CTA tardía. |
| 17 | Velvet Cinema | Vídeo | Teaser en primer tercio, CTA glass secundaria. |
| 18 | Ocean Journal | Texto + galería | Diario de viaje sin botones iniciales. |
| 19 | Scarlet Kitchen | Vídeo + reserva | Receta audiovisual y booking. |
| 20 | Neon Catalog | Productos | Productos visuales con máscara y grid interno. |
| 21 | Linen Residence | Cards + imagen | Interiorismo con bloques de proyecto. |
| 22 | Night Market | Productos + socials | Descubrimiento comercial de alta densidad. |
| 23 | Legal Goldline | FAQ + contacto | Autoridad sobria sin motion ni banner. |
| 24 | Violet Museum | Cards + mapa | Colección/visita/ubicación sin perfil. |
| 25 | Indigo Academy | Vídeo + FAQ | Módulos y preguntas, CTA doble tardía. |
| 26 | Aster Concierge | Servicios + booking | Flujo de agenda primero. |
| 27 | Monogram House | Heading + links | Monograma y pocas acciones, sin media. |
| 28 | Mercury Records | Cards + vídeo | Discografía/estrenos/plataformas. |
| 29 | Saffron Stories | Galería + texto | Editorial gastronómico no comercial. |
| 30 | Quartz Studio | Imagen + contact | Art direction con bloque visual dominante. |

## 11. Top 20 final de oportunidad

| Rango | Receta/propuesta | Motivo |
|---:|---|---|
| 1 | Noir Portfolio | Máxima diferenciación viable sin cambiar modelo. |
| 2 | Violet Archive | Arquitectura informativa distinta y sin avatar. |
| 3 | Frame Atelier | Imagen hero interior/casos altera la lectura inicial. |
| 4 | Cobalt Broadcast | Vídeo/capítulos crea eje claro. |
| 5 | Archive Noir | Archivo antes de CTA; buen antídoto de repetición. |
| 6 | Platinum Brief | Caso editorial sobrio, cards antes de contacto. |
| 7 | Casa de Plata | Galería-dossier sin banner. |
| 8 | Scarlet Table | Flujo gastronómico completo. |
| 9 | Gold Reserve | Producto como protagonista. |
| 10 | Terra Process | Proceso maker audiovisual. |
| 11 | Ivory Notes | No-media editorial, contraste de densidad. |
| 12 | Indigo Academy | Formación con vídeo/FAQ. |
| 13 | Copper Table | Conversión local mapa/productos. |
| 14 | Lumen Hotel | Hospitality coherente. |
| 15 | Sandstone Ledger | Consultoría con casos. |
| 16 | Ocean Reserve | Viajes con recorrido visual. |
| 17 | Velvet Cinema | Creación audiovisual de tono premium. |
| 18 | Legal Goldline | Autoridad sin artificio. |
| 19 | Neon Catalog | Comercio visual contemporáneo. |
| 20 | Monogram House | Minimalismo real con poca densidad. |

## 12. Top 5 para implementación futura inmediata

Estos cinco se eligieron porque se pueden construir con bloques actuales y maximizan diversidad sin tocar el modelo ni renderer base. Su implementación requiere autorización nueva.

| Top | Receta | Archivos que requeriría modificar en una fase autorizada | No requeriría tocar |
|---:|---|---|---|
| 1 | Noir Portfolio | `scripts/power-editor-template-factory.mjs`; `scripts/power-editor-template-factory.test.mjs`; `scripts/audit-power-editor-template-pack.mjs`; `artifacts/power-editor-template-pack.json` al generar. | `EditorCandidate.tsx`, modelo, CSS, rutas públicas. |
| 2 | Violet Archive | Los mismos cuatro archivos de generador/auditoría. | Renderer, Power Editor, Supabase. |
| 3 | Cobalt Broadcast | Los mismos cuatro archivos de generador/auditoría. | `/editor`, `/admin/template-studio`, navegación. |
| 4 | Frame Atelier | Los mismos cuatro archivos de generador/auditoría. | PageConfig canónico y bloques existentes. |
| 5 | Scarlet Table | Los mismos cuatro archivos de generador/auditoría. | QR, `public_id`, slug, publicación. |

## 13. Mejora mínima que desbloquearía más recetas

La mejora de mayor apalancamiento no es un efecto visual: es introducir un único **contenedor/sección de composición** en PageConfig que agrupe bloques hijos y soporte `layout: stack | grid | split`, columnas por breakpoint y orden/visibilidad por breakpoint.

Con esa sola primitiva podrían existir hero full-screen, split-screen, secciones de dos columnas reales, CTA fijo dentro de una sección y narrativas que no comiencen obligatoriamente con perfil/título/enlaces. Exigiría, en una fase separada y autorizada, cambios coordinados en el modelo, factory/hydration, renderer, panel de composición, CSS y auditoría. No se recomienda simularla con `translateX/Y` o decoraciones, porque dañaría responsive, selección y accesibilidad.

## 14. Riesgos y siguiente paso recomendado

| Riesgo | Severidad | Mitigación antes de implementar |
|---|---:|---|
| Confundir diversidad JSON con diversidad visual. | Alta | Contact sheet de renders reales y puntuación por pares. |
| Crear recetas que prometen split-screen/hero fijo sin soporte. | Alta | Clasificar como bloqueadas por arquitectura, no generarlas. |
| Reutilizar media sin semántica diferenciada. | Media | Curaduría de activos propios/licenciados y matriz media × receta. |
| Usar reseñas inventadas para llenar layouts. | Alta | Mantener `reviews.items` vacío hasta contar con reseñas reales. |
| Promover el editor aislado sin QA. | Alta | Mantener rutas actuales congeladas y usar sólo preview interno en fase posterior. |

**Siguiente paso recomendado:** autorizar primero un QA visual interno y de solo lectura de las 12 recetas actuales —contact sheet móvil y desktop— antes de aprobar la creación de cualquiera de las recetas Top 5. No se debe sincronizar ni publicar la biblioteca durante esa etapa.

## 15. Declaración de alcance

Este informe no crea recetas, no recalcula artefactos, no altera `PageConfig`, no toca `EditorCandidate.tsx`, CSS, renderers, routes, Supabase, QR, `public_id`, slug, editor administrativo, `/editor`, `/admin/template-studio`, GitHub o despliegue. Su función es documentar con precisión qué es posible hoy, qué es sólo una propuesta y qué requerirá una autorización de implementación posterior.
