# Backlog Futuro - Diseño Avanzado y Expansión del Editor

> [!IMPORTANT]
> ESTE DOCUMENTO NO AUTORIZA IMPLEMENTACIÓN.
> Estas funciones están expresamente fuera del alcance actual.
> Solo deben retomarse mediante una fase futura explícitamente aprobada.

Estado: **NO IMPLEMENTAR AHORA - BACKLOG FUTURO**

## PROPÓSITO

Este documento conserva, de forma oficial dentro del repositorio, las funcionalidades avanzadas que fueron evaluadas y postergadas deliberadamente.

El producto actual es una aplicación para crear una página pública de enlaces asociada a un código QR permanente. La prioridad del MVP es que una persona pueda crear una página presentable, publicarla y descargar su QR en aproximadamente 1-2 minutos.

Estas ideas no son tareas activas. Son hipótesis futuras que solo deben retomarse si existen usuarios reales, demanda comprobada o una estrategia premium que justifique su desarrollo.

## DECISIÓN 80/20

La estrategia actual sigue una regla 80/20: el 80% de los usuarios debe conseguir un resultado bonito usando solo una fracción pequeña y clara de las capacidades posibles del editor.

Agregar herramientas creativas avanzadas demasiado pronto puede aumentar complejidad, bugs, fricción y carga cognitiva sin evidencia de que la mayoría de usuarios las necesite.

## FOCO ACTUAL DEL PRODUCTO

El foco actual es:

- Simplicidad.
- Velocidad.
- Baja fricción.
- Usuario no diseñador.
- Resultado bonito sin esfuerzo.
- QR funcional.
- Página premium pero sencilla.

Flujo core actual:

- Agregar entre 3 y 8 enlaces.
- Elegir una apariencia sencilla.
- Configurar colores.
- Elegir tipografía o preset.
- Publicar página.
- Obtener enlace público.
- Descargar QR.
- Compartir.

## QUÉ NO IMPLEMENTAR AHORA

No implementar en el MVP actual:

- Editor libre tipo Canva.
- Manipulación manual de elementos.
- Formas decorativas libres.
- Capas editables.
- Librerías gráficas pesadas.
- Editor avanzado de neón.
- Gradientes complejos.
- Tipografía granular por elemento.
- Layout libre.
- Marketplace de templates.
- Monetización o features premium.

Estas capacidades pueden ser valiosas, pero ahora son explícitamente fuera de alcance.

## EDITOR LIBRE FUTURO

Estado: **FUTURO**

Descripción: editor libre donde el usuario pueda manipular elementos directamente sobre la página.

Capacidades posibles:

- Arrastrar elementos.
- Mover libremente.
- Rotar.
- Redimensionar.
- Escalar.
- Cambiar posición.
- Ordenar capas.
- Alinear objetos.
- Duplicar objetos.
- Bloquear objetos.

Condición de activación: implementar únicamente si usuarios reales solicitan control de composición libre o si existe evidencia clara de que esta capacidad mejora conversión o retención.

## FORMAS Y ELEMENTOS

Estado: **FUTURO**

Elementos posibles:

- Círculos.
- Cuadrados.
- Rectángulos.
- Triángulos.
- Estrellas.
- Líneas.
- Líneas punteadas.
- Ondas.
- Arcos.
- Blobs.
- Halos.
- Sparkles.
- Puntos decorativos.
- Patrones.
- Marcos.
- Fondos gráficos.

Personalización futura posible:

- Color.
- Opacidad.
- Tamaño.
- Posición.
- Rotación.
- Borde.
- Sombra.

Decisión actual: no implementar elementos libres ahora. Si se agregan posteriormente, comenzar primero con presets controlados antes de construir manipulación libre.

## RINGS Y AURAS

Estado: **FUTURO / POSIBLE PREMIUM**

Presets futuros básicos:

- Dorado.
- Plata.
- Negro.
- Blanco.
- Azul.
- Rosa.
- Morado.
- Verde.
- Beige.
- Aura multicolor.

Controles avanzados posibles:

- Color personalizado.
- Grosor.
- Intensidad.
- Glow.
- Velocidad.
- Animación.
- Gradiente del ring.
- Múltiples colores.

Decisión actual: puede existir un ring simple o preset en el producto actual si no complica la experiencia. La personalización exhaustiva debe esperar.

## NEÓN

Estado: **FUTURO**

Features posibles:

- Glow configurable.
- Intensidad.
- Spread.
- Sombras multicolor.
- Texto neón.
- Elementos neón.
- Botones neón.
- Animaciones pulsantes.

Decisión actual: mantener únicamente presets neón simples si ya entran dentro de personalización básica. No crear un editor avanzado de neón.

## GRADIENTES AVANZADOS

Estado: **FUTURO**

Permitido ahora, si aplica dentro de controles simples:

- 2 colores.
- Linear.
- Radial.
- Presets simples.

Capacidades futuras:

- 3 o más colores.
- Stops personalizados.
- Conic gradients.
- Posiciones personalizadas.
- Ángulos complejos.
- Gradientes animados.

## TIPOGRAFÍA AVANZADA

Estado: **FUTURO**

Permitido actualmente:

- Selección curada.
- Fontsource.
- Búsqueda simple.
- Categorías.

Features futuras:

- Cientos de fuentes.
- Favoritos.
- Fuentes recientes.
- Subida de fuentes propias.
- Ejes de variable fonts.
- Letter spacing avanzado.
- Line-height avanzado.
- Weight personalizado.
- Texto por elemento.

## LAYOUT AVANZADO

Estado: **FUTURO**

Features posibles:

- Mover avatar libremente.
- Mover título.
- Mover descripción.
- Layouts alternativos.
- Botones en grid.
- Botones horizontales.
- Múltiples columnas.
- Secciones personalizadas.
- Espaciado manual.
- Z-index editable.

Decisión actual: el layout debe permanecer estructurado para evitar que usuarios normales creen páginas inconsistentes o difíciles de leer.

## TEMPLATES

Estado: **FUTURO**

Potencial:

- Plantillas profesionales.
- Plantillas por industria.
- Restaurantes.
- Artistas.
- Influencers.
- Negocios.
- Servicios.
- Eventos.
- Portafolio.

Modelo comercial posible:

- Templates gratis.
- Templates premium.
- Packs de templates.

## POSIBLES FEATURES PREMIUM

Estado: **BACKLOG COMERCIAL**

Posibilidades:

- Editor avanzado.
- SVG QR.
- Descargas especiales.
- Más fuentes.
- Más presets.
- Rings premium.
- Elementos.
- Animaciones.
- Remover branding.
- Dominios personalizados.
- Analytics.
- Múltiples perfiles.
- Campañas QR.
- Programación de enlaces.

No implementar monetización todavía. Mantener estas ideas solo como hipótesis comercial.

## LIBRERÍAS A EVALUAR

Estado: **EVALUAR EN EL FUTURO**

Opciones:

- Konva / react-konva.
- Fabric.js.

Solo considerar una librería gráfica completa si el usuario realmente necesita drag, resize, rotate y posicionamiento libre.

Decisión actual: no instalar Konva ni Fabric en el MVP actual.

## CRITERIOS DE ACTIVACIÓN

Implementar una feature de este backlog solo si se cumple una o más condiciones:

- Usuarios reales la solicitan repetidamente.
- Soporte recibe preguntas frecuentes sobre esa capacidad.
- Datos de uso muestran necesidad.
- Ayuda a convertir usuarios free a premium.
- Reduce churn.
- Competidores relevantes demuestran demanda.
- Existe caso de negocio claro.
- No deteriora el flujo de creación rápida.

No implementar si:

- Solo parece visualmente interesante.
- Solo porque Canva lo tiene.
- Solo porque técnicamente es posible.
- Aumenta complejidad sin evidencia.
- Hace que usuarios normales necesiten aprender diseño.

## RIESGO DE SOBREINGENIERÍA

El riesgo principal es convertir una herramienta rápida de QR y enlaces en un editor complejo antes de validar demanda.

Una implementación prematura puede producir:

- Más bugs.
- Más deuda técnica.
- Más tiempo de desarrollo.
- Más dificultad para publicar rápido.
- Peor experiencia para usuarios no diseñadores.
- Menor claridad del producto.

Este backlog existe precisamente para proteger el MVP de decisiones impulsivas.

## NORTH STAR DEL PRODUCTO

North Star actual:

> El usuario debe pasar desde "quiero un QR" hasta "tengo mi QR descargado y mi página publicada" con la menor cantidad posible de fricción.

Experiencia objetivo:

- Tiempo ideal de creación: 1-2 minutos.

Pregunta central para cualquier feature nueva:

> ¿Esta nueva feature ayuda a crear y publicar más rápido o únicamente agrega posibilidades creativas?

Regla:

Si una feature solo agrega complejidad creativa, normalmente pertenece al backlog futuro.

## FECHA / ESTADO

Fecha: 2026-08-17

Estado: **NO IMPLEMENTAR AHORA - BACKLOG FUTURO**

Veredicto: **DOCUMENTADO - BACKLOG FUTURO**
