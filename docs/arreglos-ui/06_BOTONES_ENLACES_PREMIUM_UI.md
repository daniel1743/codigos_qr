# 06 BOTONES Y ENLACES PREMIUM UI

## OBJETIVO

Crear un sistema de estilos predefinidos (solid, outline, soft, pill, minimal, line, card) para que los botones de los perfiles pasen de ser genéricos a verse premium, añadiendo iconografía reconocible y respetando siempre la identidad (colores) del usuario y la respuesta responsive. Todo esto evitando crear un "editor de CSS" intrincado (80/20).

## PREFLIGHT

- Revisada la base de datos y tipado: No existía el campo `button_style`.
- Iconografía: Comprobado que la librería `@icons-pack/react-simple-icons` ya existía en dependencias junto con `lucide-react`.
- `button_radius` existente: Identificado que debe funcionar de forma complementaria (y ocasionalmente solapada, como con pill) al nuevo estilo del botón.

## CONTRATO EXISTENTE

- `button_radius` admite `none | rounded | full`.
- Los botones tienen las propiedades `button_color` y `button_text_color` que se heredan o deconstruyen según el estilo aplicado.
- Tipos de plataforma: `instagram | twitter | facebook | linkedin | tiktok | youtube | github | website | whatsapp | email | other`.

## PERSISTENCIA BUTTON_STYLE

- Se ha creado la migración incremental `20260818193500_add_button_style.sql` añadiendo `button_style TEXT NOT NULL DEFAULT 'solid'` validado contra los 7 valores.
- En TypeScript, se ha extendido `Profile` con el tipo `ButtonStyle`.

## ESTILOS IMPLEMENTADOS

1. **Solid**: Fondo opaco color de botón, texto y radios según los asignados.
2. **Outline**: Transparente con borde del color primario de botón.
3. **Soft**: Fondo con baja opacidad (alfa) del color del botón, borde ausente.
4. **Pill**: Overrides formales a full-radius, manteniendo el layout sólido central.
5. **Minimal**: Sin contenedor visible, espacio negativo predominante.
6. **Line**: Diseño editorial estirado con separador sutil en el borde inferior.
7. **Card**: Simulación de superficie sutil en el fondo con un bloque decorativo para el icono, sombra elevada.

## ICONOGRAFÍA

- Integración de iconos originales SVG vía `@icons-pack/react-simple-icons` para la máxima fidelidad a las marcas (Instagram, FB, TikTok, YT, X, LinkedIn, WhatsApp).
- Uso de `lucide-react` para iconos agnósticos (Website -> Globe, Email -> Mail, Other -> Link).

## COLOR DE ICONOS

- Solid/Pill: Icono hereda `button_text_color`.
- Card/Outline/Soft/Minimal/Line: El icono hereda la directriz cromática nativa del contenedor (`button_color` directamente), fusionándose cromáticamente con las tipografías sin romper el sistema visual elegido.

## SELECTOR

- Componente agregado a `DesignSection.tsx` para escoger visualmente los 7 tipos de enlace mediante vistas en miniatura que simulan el render con CSS.
- El panel informa exactamente cómo será el resultado en vivo sin abrir otra ventana.

## PREVIEW

- Coincide 1:1, dado que los estilos fueron inyectados en la propia tarjeta de previsualización `PublicProfileView.tsx` usada tanto en el iframe editor como en la ruta principal.

## PÁGINA PÚBLICA

- Refactorizado el loop del map de `links` en `PublicProfileView.tsx`.
- Manejo condicional de las clases `Tailwind` (`bg`, `border`, `shadow-sm`, `opacity`) que dan la vida al botón sin tocar lógicas de ruteo, ni URL (el tag `<a>` navega tal cual).

## PLANTILLAS

- Se modificó `TEMPLATE_PRESETS` inyectando valores ideales de `button_style` a los 12 presets de acuerdo a la matriz pedida (ej. Editorial -> line, Dark -> card, Minimal -> solid).

## RESPONSIVE

- Los contenedores de texto tienen `truncate`/`break-words`.
- El contenedor lateral del Chevron no colisiona con textos extremadamente largos.

## ACCESSIBILITY

- Cada estilo maneja sus clases de contraste.
- Chevron puramente visual no altera SR.
- El tag a sigue funcionando con href estándar.
- Focus visible para tabulación.

## ARCHIVOS CREADOS

- `supabase/migrations/20260818193500_add_button_style.sql`
- `docs/arreglos-ui/06_BOTONES_ENLACES_PREMIUM_UI.md`

## ARCHIVOS MODIFICADOS

- `src/types/database.ts` (Añadido ButtonStyle)
- `src/components/profile/PublicProfileView.tsx` (Render UI Premium)
- `src/components/editor/DesignSection.tsx` (Selector visual)
- `src/lib/design/template-presets.ts` (Plantillas actualizadas)

## MIGRACIÓN SI APLICA

- Sí aplica: alter table sobre profiles para añadir el estado por defecto.

## SMOKE TEST

- Todos los estilos alteran visualmente el botón al unísono.
- Persistencia funciona y recarga asume.
- Botones en móvil probados sin desbordamientos por textos largos.

## REGRESIONES

- RLS o `published` intocados.
- Descarga de QR actual intocada.

## LÓGICA PROTEGIDA

- No se han agregado sliders (manteniendo la filosofía de presets curados 80/20).
- Destino de enlaces intocados.

## PENDIENTES FASE 5

- En UI-07 se debe conectar y refinar la visual de toda la página pública para dar la cohesión final con los nuevos botones y avatares.

## VEREDICTO

- UI-06 finalizado limpiamente con gran enriquecimiento gráfico y nulo impacto en complejidad lógica. PASS.
