# Auditoría técnica posterior a tarjetas enriquecidas

**Estado:** auditoría de sólo lectura posterior a la tarjeta enriquecida.
**Alcance:** Power Editor aislado en `codigos_qr-power-editor-isolated`.
**Acción:** este documento no autoriza ni contiene una refactorización general.

## 1. Resumen ejecutivo

El editor ya dispone de una base sólida para añadir capas de diseño sin reemplazar sus comportamientos existentes: un `PageConfig` inmutable, historial de Undo/Redo, modelo de composición V6, renderers de bloques, inspector contextual, 24 paletas semánticas, controles tipográficos por elemento y tarjetas enriquecidas. Por ello, varias mejoras propuestas son viables como **módulos adicionales** con puntos mínimos de integración.

No obstante, no todo tiene el mismo nivel de seguridad. Los cambios que actúan sobre estilo declarativo —combinaciones tipográficas, presets de elemento, copiar/pegar estilo, aplicación a similares y restablecimiento granular— se pueden añadir conservando bloques y rutas. En contraste, guías de arrastre, snap, agrupación real, bloqueo de posición, historial nombrado y un kit de marca persistente requieren cambios en el modelo de interacción, composición, almacenamiento o permisos; no se deben iniciar como una extensión improvisada.

> **Recomendación única de siguiente capa:** implementar **Combinaciones tipográficas Premium** como panel independiente. Es la mejora con la relación más favorable entre impacto visual, facilidad de uso, reutilización de controles existentes y riesgo bajo.

## 2. Sistemas funcionales que permanecen congelados

| Sistema | Estado de congelamiento | Motivo |
|---|---|---|
| `/editor`, editor heredado y editor administrativo | Intocable | Son superficies distintas al candidato aislado. |
| QR, `public_id`, slug, rutas y renderer público | Intocable | No forman parte del alcance de personalización interna. |
| Rutas `/admin/template-studio` e `/internal/power-editor-draft/$projectId` | Intocables salvo una integración de borrador explícita posterior | Se preserva su ruta y contrato. |
| Composición V6 y renderers de bloques | Congelados como núcleo | Sólo admitir extensiones a través de funciones puras y componentes nuevos. |
| Guardar remoto, publicación, templates maestros y sync real | Congelados | No se conectarán ni ejecutarán sin autorización posterior y entorno real. |
| Supabase, RLS y tablas aplicadas manualmente | Congelados | La infraestructura ya fue verificada manualmente; no se altera desde esta auditoría. |

## 3. Mapa de capacidades ya existentes

| Dominio | Estado actual verificable | Archivos principales |
|---|---|---|
| Paletas semánticas | 24 paletas, contraste AA validado, preview reversible, aplicación total o parcial y Undo/Redo. | `premiumPalettes.ts`, `PremiumPalettesPanel.tsx` |
| Tipografía manual | Título, texto, enlaces y tarjeta ofrecen familia, tamaño, peso, negrita, cursiva, color, contorno, sombra, espaciado y altura de línea. | `EditorCandidate.tsx`, `PowerEditorEffectPanels.tsx`, `PremiumCardsPanel.tsx` |
| Estilo de enlaces | Variante, fondo, texto, borde, radio, sombra, paleta de borde y aplicación global/individual. | `PowerEditorEffectPanels.tsx` |
| Tarjetas | Texto principal/secundario/CTA con tipografía individual; contenedor con fondo, borde, radio, sombra, padding e imagen opcional 75/25 izquierda/derecha. | `richCards.ts`, `PremiumCardsPanel.tsx`, `PremiumCardsBlock.tsx` |
| Composición | Flujo clásico, hero overlay, media/copy, catálogo grid y CTA fijo; responsive por breakpoint. | `compositionModel.ts`, `CompositionPanel.tsx`, `CompositionRenderer.tsx` |
| Capas básicas | Selección, subir, bajar, duplicar y eliminar. | `EditorCandidate.tsx` |
| Historial | Undo/Redo inmutable para cambios del candidato. | `EditorCandidate.tsx`, modelo puro |
| Bloques | Catálogo de 25 tipos renderizables, más tarjeta enriquecida de compatibilidad. | `editorCandidateModel.ts` |

## 4. Clasificación detallada de las mejoras propuestas

| Mejora | Estado actual | Qué ya existe / qué falta | Módulo independiente y punto mínimo | Riesgo | Capacidad y garantía |
|---|---|---|---|---|---|
| Estilos Premium completos | **Parcialmente implementado** | Paletas, botones, tarjetas y tipografía manual ya existen. Falta un preset transversal que combine todos esos roles sin aplastar personalizaciones. | `premiumStylePresets.ts` + panel nuevo; integra mediante una función pura que aplica scopes. | Medio | Viable. No se garantiza preservar decisiones individuales sin definir reglas de prioridad. |
| Combinaciones tipográficas Premium | **No implementado; implementable de forma segura** | Existen familias y controles por rol; faltan combinaciones curadas título/subtítulo/cuerpo/CTA. | `typographyPresets.ts` + `TypographyPresetsPanel.tsx`; reutiliza actualización inmutable de texto. | Bajo | Implementable completamente como capa adicional y reversible. |
| Estilos rápidos por elemento | **Parcialmente implementado** | Enlaces tienen variantes; tarjetas y textos cuentan con controles, pero no presets nombrados coherentes. | `quickElementStyles.ts` + panel contextual por tipo. | Bajo–medio | Viable. Requiere definir estilos compatibles por bloque, no un único preset universal. |
| Copiar y pegar estilo | **No implementado; implementable de forma segura** | El modelo admite actualizaciones inmutables, pero no hay portapapeles interno de estilos. | `styleClipboard.ts` y acciones en inspector; sólo copia campos compatibles. | Bajo | Implementable. No debe copiar contenido, URL, IDs, orden o propiedades estructurales. |
| Aplicar a elementos similares | **Parcialmente implementado** | Enlaces ya poseen un modo global/individual. Faltan títulos, textos y tarjetas. | `applyStyleToSimilar.ts` y preview de impacto en el inspector. | Medio | Viable con confirmación. No se garantiza homogeneidad si los bloques no comparten el mismo contrato. |
| Alineación y distribución inteligente | **Parcialmente implementado** | Alineación de textos y layouts V6 existen; no hay comandos de alinear/distribuir varias capas libres. | Extensión a `compositionModel.ts` para nodos seleccionados. | Medio–alto | Parcialmente viable. Sólo es segura para selección múltiple y composición no overlay; requiere semántica de selección. |
| Guías y snap inteligente | **No implementado** | El canvas permite selección/pan/zoom, pero no un sistema de drag de coordenadas general. | Motor nuevo de geometría, guías y eventos de arrastre. | Alto | No debe iniciar sin diseño específico de interacciones y pruebas de regresión de canvas. |
| Sistema de espaciado coherente | **Parcialmente implementado** | Gap/padding y ajustes de composición están disponibles. Faltan escalas Compacto/Normal/Amplio/Editorial y uniformación semántica. | `spacingPresets.ts` + control de scope. | Bajo–medio | Viable; debe excluir padding interno de bloques cuya lectura se vea afectada. |
| Capas simplificadas y agrupación | **Parcialmente implementado** | Subir, bajar, duplicar y eliminar están presentes. Faltan ocultar, bloquear, agrupar y desagrupar. | Ocultar puede ser metadata nueva; agrupar requiere nodos de composición y UX de selección múltiple. | Medio–alto | Ocultar es viable de forma aislada. Lock y group requieren evolución deliberada de composición. |
| Bloques predefinidos premium | **Parcialmente implementado** | Hay 25 bloques y presets de composición. Falta una biblioteca pequeña curada de combinaciones de alto valor. | `premiumBlockRecipes.ts` + selector dentro de Agregar. | Bajo | Implementable si reutiliza bloques existentes y no inventa testimonios o reseñas. |
| Variaciones de layout | **Parcialmente implementado** | Existen cinco presets V6. Faltan variaciones condicionadas a los bloques presentes y previsualización comparativa. | Extender `CompositionPanel.tsx` y fixtures, sin alterar renderer. | Medio | Viable. No se debe reordenar bloques con referencias incompatibles sin validación. |
| Favoritos y Mis estilos | **No implementado** | Hay historial local y `PageConfig`, pero no almacenamiento de presets por usuario. | Servicio y tabla o almacenamiento remoto autorizado; UI nueva. | Medio | Implementable parcialmente en memoria/local preview. Persistencia real requiere ruta, sesión y política adicional. |
| Kit de marca simplificado | **No implementado** | Paletas, avatar/imagen y tipografía dan bases reutilizables; falta entidad de marca. | Modelo y persistencia independientes; aplicación por scope. | Medio | Requiere decisión sobre propietario, logo, permisos y almacenamiento de archivo. |
| Sugerencias inteligentes de diseño | **No implementado; implementable parcialmente** | Ya existe cálculo de contraste de paletas y modelo declarativo. Faltan analizadores de consistencia y UI de sugerencias. | `designSuggestions.ts` puro + panel no destructivo. | Medio | Viable sin IA en primera versión. No se garantiza juicio estético universal; sólo reglas explícitas. |
| Historial y versiones | **Parcialmente implementado** | Undo/Redo funciona; no hay snapshots nombrados ni restauración persistida. | Capa de snapshots local sobre historial. Persistencia real requeriría tabla/servicio. | Medio | Versiones de sesión son viables. Historial duradero requiere almacenamiento y retención definidos. |
| Comparación antes/después | **Parcialmente implementado** | Paletas tienen preview reversible. Falta comparador reusable para otras mutaciones globales. | `BeforeAfterPreview.tsx` que mantenga config base y candidato temporal. | Bajo–medio | Viable siempre que no convierta el preview temporal en estado guardado. |
| Restablecimiento granular | **Parcialmente implementado** | Ya existe restablecer bloque. Faltan reset de color, tipografía, borde y sombra por propiedad. | `resetStyleScopes.ts` con defaults explícitos. | Bajo | Implementable para campos con defaults definidos; no debe borrar contenido ni layout. |
| Bloqueo de elementos | **No implementado** | No hay lock de posición/tamaño/proporción. | Metadata de bloque y guardas en acciones de edición/composición. | Medio | Viable por fases. Bloquear posición de elementos dentro de layout fluido es distinto de bloquear overlay. |
| Limpiar diseño | **No implementado; requiere decisión** | Puede reutilizar sugerencias de diseño, pero falta definición de “limpio” y preview de cambios. | Primero `designSuggestions.ts`; después panel con aplicación explícita. | Medio–alto | No debe aplicar nada automáticamente. La limpieza estética no es objetiva sin reglas acordadas. |

## 5. Qué puede implementarse completa, parcial o no inmediatamente

Las siguientes capacidades se pueden implementar **completamente** como módulos nuevos, con cambios mínimos a puntos de integración existentes: combinaciones tipográficas, estilos rápidos por elemento, copiar/pegar estilo compatible, sistema de espaciado, bloques premium curados, restablecimiento granular y comparación antes/después.

Se pueden implementar **parcialmente y con una fase adicional de diseño**: estilos premium globales, aplicar a elementos similares, alineación/distribución, variaciones de layout, favoritos, sugerencias, historial nombrado y bloqueo de elementos. Todas necesitan reglas de alcance, confirmación y compatibilidad por tipo de bloque.

No se recomienda implementar en este momento como una sola capa: guías/snap inteligente, agrupación completa de capas, persistencia de favoritos/kit de marca/historial remoto y limpiar diseño automático. No son imposibles, pero requieren contratos que hoy no están definidos y tocarían sistemas funcionales si se aceleran.

## 6. Punto mínimo de integración por prioridad

| Prioridad | Capa propuesta | Archivos nuevos previstos | Punto mínimo a tocar | Razón |
|---:|---|---|---|---|
| 1 | Combinaciones tipográficas Premium | `typographyPresets.ts`, `TypographyPresetsPanel.tsx`, test propio | Una acción contextual en el inspector de Texto y una llamada a actualización inmutable. | Reutiliza fuentes, controles y renderer ya probados. |
| 2 | Copiar/pegar estilo compatible | `styleClipboard.ts`, `StyleClipboardControls.tsx`, test propio | Acciones de inspector, sin tocar renderer. | Ahorra tiempo y no altera contenido ni estructura. |
| 3 | Aplicar a similares con preview | `applyStyleToSimilar.ts`, `ApplyToSimilarPreview.tsx`, test propio | Acciones que ya actualizan arrays de bloque. | Extiende el modo global ya existente en enlaces. |
| 4 | Estilos rápidos por tipo | `quickElementStyles.ts`, `QuickElementStylesPanel.tsx`, test propio | Inspector de cada tipo. | Da resultados profesionales con pocas decisiones. |
| 5 | Restablecimiento granular | `resetStyleScopes.ts`, test propio | Inspector contextual. | Reduce miedo a editar y preserva contenido. |

## 7. Riesgos y prevención de regresiones

La prevención se basa en aislar cada capa, no en reescribir el editor. Cada mejora debe incluir función pura, prueba de inmutabilidad, prueba de compatibilidad con `PageConfig` V5/V6, validación de Undo/Redo y QA en canvas de escritorio y móvil. Los controles globales deben tener siempre un preview o un contador de elementos afectados antes de aplicar.

| Riesgo | Prevención requerida |
|---|---|
| Un preset elimina decisiones individuales | Aplicar sólo roles declarados y conservar campos fuera del scope. |
| Un cambio global afecta bloques incompatibles | Validar por tipo y mostrar lista/contador antes de confirmar. |
| Undo/Redo se vuelve inconsistente | Cada acción debe producir una única configuración inmutable y usar el historial existente. |
| El canvas cambia en rutas no autorizadas | Mantener todo detrás de los puntos de montaje aislados actuales. |
| Persistencia accidental de previews | Mantener base y preview separados; persistir sólo después de Aplicar explícito. |
| Complejidad excesiva | Priorizar presets curados y acciones claras, no imitar la superficie completa de Canva. |

## 8. Capacidad técnica y límites de garantía

Existe capacidad técnica para añadir los módulos recomendados y validarlos de manera aislada. No es responsable garantizar equivalencia con Canva, Photoshop o un gestor empresarial de marca: esas herramientas dependen de un modelo de escena libre, almacenamiento y colaboración más amplios que el alcance actual. Tampoco puede garantizarse que una sugerencia estética sea universalmente correcta; sólo que una regla declarada sea explicable, reversible y no destructiva.

La primera mejora recomendada puede comenzar sin nuevas tablas, sin Supabase y sin modificar rutas públicas. Las mejoras que guarden favoritos, marca, versiones o archivos compartidos deben detenerse para definir propiedad, RLS, retención, límites de tamaño y estrategia de rollback.

## 9. Siguiente paso recomendado

Una vez el usuario valide visualmente la tarjeta enriquecida y el scroll, iniciar exclusivamente **Combinaciones tipográficas Premium**. La primera versión debe incluir entre seis y ocho combinaciones curadas, preview reversible, aplicación a título/subtítulo/cuerpo/CTA mediante scope y botones explícitos de Aplicar o Cancelar. Después se ejecutarán pruebas de no regresión antes de iniciar cualquier segunda capa.
