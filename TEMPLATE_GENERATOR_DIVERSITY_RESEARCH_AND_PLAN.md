# Investigación y estrategia de diversidad — Generador de templates del Power Editor

**Estado:** investigación y planificación; no se ha modificado código de generación, no se han creado tablas ni se han escrito templates en Supabase.
**Objetivo futuro:** producir un catálogo de templates básicos y premium que sea profesionalmente diverso de forma **estructural**, no sólo por color, tipografía o fotografía.

## 1. Diagnóstico confirmado

La auditoría recibida identifica correctamente el síntoma: el catálogo visible contiene variaciones cosméticas que conservan una silueta muy parecida. La muestra referida documenta 215 duplicados estructurales sobre 235 elementos (91,5 %), aun sin duplicados exactos de hash. Esto sucede cuando el generador altera decoraciones superficiales sin controlar la distancia entre las arquitecturas visuales.

La revisión directa del worktree agrega un hallazgo operativo determinante: el archivo existente `generate_templates.cjs` **no es** un generador de templates de Power Editor ni un proceso que escriba en Supabase. Sólo sobrescribe el archivo estático `src/lib/design/template-presets.ts` con presets del editor heredado basado en `Profile`. Los módulos citados en la auditoría (`src/lib/template-factory/generator.ts`, `industries.ts`, `recipes.ts`, `qa.ts` y `diversity_audit.ts`) no están presentes ni versionados en el worktree activo. Por ello, no es técnicamente honesto prometer un ajuste menor: se requerirá un generador nuevo, aislado y tipado para `PageConfig`.

> Una plantilla no debe considerarse diferente sólo porque su foto, color o nombre cambió. La diversidad se debe medir en un espacio de comportamiento: composición, orden de bloques, densidad, jerarquía, tipos de CTA, media, adornos y respuesta móvil. Este enfoque combina restricciones de calidad con una métrica explícita de diversidad, como propone la literatura de generación procedural orientada a calidad-diversidad.[1]

## 2. Capacidades reales ya disponibles en el Power Editor

El contrato `PageConfig` ya soporta bloques de banner, perfil, títulos, texto, links, redes, imagen, vídeo, cards, separador, espaciador, galería, servicios, productos, booking, FAQ, contacto, mapa, formas, anillos, ornamentos, marco, partículas y footer. También ya contiene estilos avanzados: composición, columnas, bordes, sombra, glow, glass, gradiente, filtros, efectos, máscaras, blend modes, movimiento y overrides responsive.

| Familia de diferenciación | Elementos existentes que el generador debe combinar con reglas, no al azar puro |
|---|---|
| Estructura | Banner presente/ausente; avatar foto/monograma/oculto; orden de bloques; título editorial/centrado/asimétrico; columas 1/2; ancho de contenido; densidad y espaciado. |
| Conversión | CTA largo único; CTA doble en dos columnas; secuencia de enlaces cortos; tarjetas de servicios; productos; reserva; contacto; FAQ. |
| Media | Vídeo full/compacto; image card; galería 2/3; cards con imagen; avatar y banner diferenciados. |
| Material y tono | Oro cálido, oro negro, champán, platino, plata, obsidiana, cobalto, esmeralda, terracota, rosas editoriales, cristal y neón controlado. |
| Efectos | Gradientes lineales/radiales, grano/papel/metal, glass, glow, vignette, spotlight, light-leak, chromatic, máscaras, blend y motion discreta. |
| Ambiente | Partículas diferenciadas, anillos, ornamentos, marcos, shapes y layouts limpios sin adornos para que el catálogo no sea homogéneamente recargado. |

La combinación debe estar gobernada por recetas coherentes. Por ejemplo, una firma “platino editorial” puede usar ausencia de banner, avatar cuadrado pequeño, título izquierda, dos CTAs, frame fino, partículas plata y serif de alto contraste. Una firma “oro ceremonial” debe ser sustancialmente distinta: banner presente, perfil superpuesto, CTA único largo, booking destacado, ornamentos Art Deco y movimiento sutil. No basta con cambiar el color del mismo DOM.

## 3. Arquitectura propuesta: motor determinista de calidad-diversidad

El diseño recomendado es un motor **determinista, tipado y evaluable**, con IA opcional únicamente para proponer copy o etiquetas después de que la estructura sea válida. El núcleo no dependerá de generación de texto libre; eso permite garantizar variedad, reproducibilidad y límites claros.

| Componente futuro | Función | Límite de seguridad |
|---|---|---|
| `src/lib/power-editor-template-factory/archetypes.ts` | Define arquitecturas mutuamente distinguibles: editorial, portfolio, servicios, reserva, commerce, creator media, minimal, gala, etc. | Cada arquetipo declara bloques permitidos, orden, densidad y mínimo de distancia con otros. |
| `src/lib/power-editor-template-factory/material-palettes.ts` | Paletas oro, platino, plata, negro, cristal, color y degradados con contraste revisado. | Sólo tokens validados; no colores sintácticamente inválidos. |
| `src/lib/power-editor-template-factory/media-registry.ts` | Registro de assets con licencia/atribución, orientación, temática, `assetId` y límites de uso por batch. | No usa fotos repetidas ni URLs efímeras; no inventa derechos. |
| `src/lib/power-editor-template-factory/content-kits.ts` | Copy neutral de placeholders, CTAs y estructuras por vertical. | No genera testimonios, reviews ni reseñas ficticias. |
| `src/lib/power-editor-template-factory/build-page-config.ts` | Compila una receta a `PageConfig`, usando sólo tipos/props que el editor ya renderiza. | Ejecuta `hydratePageConfig` y límites de capabilities antes de aceptar. |
| `src/lib/power-editor-template-factory/fingerprint.ts` | Calcula una huella estructural y distancias ponderadas. | Ningún template se acepta por hash cosmético solamente. |
| `src/lib/power-editor-template-factory/qa.ts` | Aplica gates técnicos, contraste, completitud y diversidad. | Rechaza template inválido, visualmente saturado o demasiado próximo a los aceptados. |
| `scripts/generate-power-editor-template-pack.mjs` | Genera un manifiesto JSON revisable por lote, con semilla, métricas y decisiones. | No escribe Supabase, no modifica UI y no publica. |
| `scripts/audit-power-editor-template-diversity.mjs` | Audita un manifiesto o un catálogo exportado y reporta cobertura, duplicados, uso de assets y distribución. | Sólo lectura. |

### Espacio de comportamiento y huella estructural

La huella no incluirá texto literal, nombre o un color aislado. Medirá al menos: presencia/posición de banner; tratamiento de avatar; familia tipográfica; alineación; orden de tipos de bloque; longitud de secuencia; número de CTAs; columnas por sección; tipos de CTA; proporción de bloques media; presencia de vídeo/galería/productos/booking; nivel de ornamentación; familia de partículas; material; gradiente; máscara; efectos; movimiento y representación responsive.

El lote se generará con cobertura de celdas: por ejemplo, no más de dos templates con la misma combinación `{arquetipo, banner, CTA, media, material}`. Una candidata debe superar el QA técnico y tener una distancia estructural mínima frente a todas las aceptadas. Si no puede alcanzar diversidad, se rechaza y se genera otra receta; no se rellena el lote con casi-clones. Esta separación entre calidad dura y diversidad explícita está alineada con el enfoque calidad-diversidad, que busca soluciones válidas que cubran métricas de comportamiento distintas.[1]

## 4. Reglas de calidad para un catálogo realmente diverso

| Regla | Umbral inicial propuesto | Qué evita |
|---|---:|---|
| Duplicado exacto | Huella canónica idéntica: rechazo. | Mismo `PageConfig` con otro nombre. |
| Cercanía estructural | Similitud ponderada ≥ 0,65: rechazo; 0,45–0,64: revisión. | Misma silueta con cambio de color/foto. |
| Repetición consecutiva | No repetir arquetipo, material, banner asset ni avatar asset en dos resultados contiguos. | Catálogo visualmente monótono. |
| Reutilización de assets | Cada avatar y banner tiene cuota por lote; el muestreo es sin reemplazo hasta agotar pool. | El mismo rostro/banner repetido. |
| Cobertura de features | Por lote premium, cada feature elegible debe aparecer con frecuencia mínima/maxima explícita. | Lotes donde vídeo, cards, CTA doble o partículas nunca aparecen. |
| Capabilities | Perfil `premium` y `getPublishIssues(config).length === 0`. | Configuraciones que el editor no permite. |
| Contraste y legibilidad | Contrast check sobre texto, CTA y fondos; títulos no se apoyan sólo en glow. | Oro/plata ilegible sobre fondos claros. |
| Presupuesto visual | Máximo de efectos simultáneos por arquetipo; una parte del catálogo debe ser minimal. | Diseños recargados que parecen variaciones del mismo collage. |

### Tratamiento de contenido sensible a autenticidad

El bloque `reviews` existe en el editor, pero no se poblará con reseñas, nombres, calificaciones ni testimonios inventados. Para templates publicados, el generador lo omitirá o producirá una estructura vacía no publicable que el usuario completa con datos reales. El mismo criterio aplica a imágenes de personas: no se debe rellenar el catálogo con retratos sin licencia o identidades simuladas como si fueran clientes.

## 5. Assets, avatares y banners: requisito real

La diversidad visual no puede garantizarse con un pool de 11 avatares y 8 banners para cientos de templates. El motor necesita un registro de assets con fuentes y permisos verificables. Hay dos caminos válidos; ninguno requiere decidirlo ahora.

| Enfoque | Resultado | Requisito |
|---|---|---|
| Banco curado aportado por Cripqer | Control total de estilo, licencia y reutilización. | Entregar assets con categoría, licencia, orientación y uso permitido. |
| Banco generado/curado antes del lote | Colección de banners abstractos, texturas, objetos y retratos con trazabilidad. | Revisión de derechos y carga a almacenamiento estable antes de referenciarlos. |

Hasta que exista ese registro, el generador puede generar configuraciones con monogramas, gradientes, ornamentos y media placeholders, pero no debe prometer variedad real de retratos/banners en producción.

## 6. Dos rutas de operación a decidir más adelante

El pedido mezcla un lote de trabajo puntual con la expectativa de un sistema autónomo. Antes de implementar, se deben comparar dos rutas viables:

| Enfoque | Resultado | Complejidad de preparación | Consideración operativa |
|---|---|---|---|
| Generador local por lotes revisables | Produce un manifiesto JSON de 24–48 templates, métricas y contact sheet para aprobar antes de persistir. | Menor; no requiere proceso persistente ni credenciales de producción durante diseño. | Es el mejor punto de partida para corregir diversidad sin contaminar el catálogo. |
| Generador de catálogo con ejecución administrativa controlada | Un proceso backend toma recetas/asset registry, genera, audita y escribe masters aprobados. | Mayor; requiere mecanismo seguro de ejecución administrativa, secreto de servidor y auditoría de batches. | Adecuado sólo tras estabilizar recetas, assets y las tablas manuales. |

No se recomienda un proceso nocturno que escriba directamente templates en producción antes de tener las restricciones de diversidad, una tabla de ejecuciones y un registro de assets; el error actual se amplificaría con cada lote. La generación offline y revisable es la base segura para una futura automatización.

## 7. Datos persistentes que se requerirían después — especificación, no SQL

Las tablas V4/V5 ya aplicadas cubren `power_editor_templates` y `power_editor_projects`; no se duplicarán. Para el generador profesional hacen falta, como máximo, dos registros de auditoría nuevos, a preparar manualmente sólo al final:

| Tabla propuesta | Finalidad | Campos principales | Escritura |
|---|---|---|---|
| `power_editor_template_generation_runs` | Rastrear semilla, versión del motor, configuración de lote, métricas de QA y estado de aprobación. | `id`, `created_at`, `engine_version`, `seed`, `requested_count`, `accepted_count`, `rejected_count`, `metrics_json`, `status`. | Sólo proceso administrativo de servidor. |
| `power_editor_template_generation_items` | Guardar huella, scores y receta de cada candidato; enlaza a master final cuando se aprueba. | `id`, `run_id`, `template_id`, `archetype`, `material`, `fingerprint`, `quality_score`, `diversity_score`, `asset_ids_json`, `decision`, `rejection_reasons`, `created_at`. | Sólo proceso administrativo de servidor. |

Estas dos tablas no exponen creación ni edición desde navegador. Las plantillas publicables continúan en `power_editor_templates`; la tabla de items da evidencia de por qué una plantilla fue aceptada y evita que un lote nuevo repita una firma ya aprobada. No se generará SQL hasta que se confirme el esquema real y se autorice una migración manual separada.

## 8. Fases de la futura implementación

1. Construir el motor tipado y el manifiesto offline, sin Supabase.
2. Definir 24–48 recetas de arquetipos con cobertura de todas las capacidades permitidas, excepto contenido de reseñas ficticias.
3. Ejecutar QA canónico y auditoría de diversidad sobre el manifiesto; corregir recetas que fallen.
4. Renderizar contactos de revisión y validar visualmente: no sólo JSON válido.
5. Preparar el SQL de las dos tablas de auditoría y sus políticas de servidor; el usuario lo revisa y aplica manualmente.
6. Después de aplicación y verificación, configurar una escritura administrativa explícita hacia `power_editor_templates`, nunca desde cliente normal.
7. Sólo con autorización posterior, exponer templates aprobados al Power Editor mediante su biblioteca; no cambia el editor heredado.

## 9. Criterios de aceptación

Un lote no se considerará listo si sólo cambia textos, avatars o color. Debe probar cobertura de arquetipos, distancia estructural, no repetición consecutiva de assets, contraste, uso intencional de features y compatibilidad con `hydratePageConfig`. Además, debe poder explicar para cada template su receta, material, bloques, huella y razón de aceptación.

## Referencias

[1]: https://arxiv.org/abs/1907.04053 "Gravina et al. — Procedural Content Generation through Quality Diversity"
