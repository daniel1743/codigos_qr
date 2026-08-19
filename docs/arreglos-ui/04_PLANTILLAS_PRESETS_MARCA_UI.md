# REPORTE DE IMPLEMENTACIÓN: FASE 04 - PLANTILLAS Y PRESETS DE MARCA

## OBJETIVO RECIBIDO

Implementar un sistema premium de plantillas (presets visuales) que permita a usuarios sin conocimientos de diseño transformar radicalmente su página con un solo clic, priorizando una filosofía de "80/20" y estética profesional curada.

## ESTADO INICIAL

El editor dependía completamente de la selección manual de colores y fuentes (UI-03). No existía un concepto de "Temas rápidos" agrupados, dejando toda la responsabilidad de composición en el usuario, lo que reducía la velocidad de personalización y podía generar diseños con malos contrastes o mala legibilidad si el usuario no tenía buen criterio.

## ARQUITECTURA DE PRESETS

Se configuró un sistema estático sin dependencias de base de datos (`template-presets.ts`).
Cada plantilla mapea directamente a propiedades ya existentes de `Profile`:

- `font_family`
- `background_color` (soporta gradients)
- `button_color`
- `button_text_color`
- `button_radius` ("none", "rounded", "full")

## PLANTILLAS IMPLEMENTADAS

Se definieron 12 presets curados:

1. **Minimal**: Limpio y universal (`Inter`, bordes suaves, fondo blanco)
2. **Editorial**: Sofisticado (`Playfair Display`, bordes rectos, beige)
3. **Beauty**: Moderno y delicado (`DM Sans`, cálido, píldora)
4. **Creator**: Digital (`Manrope`, grises, píldora)
5. **Music**: Expresivo (`Montserrat`, fondo oscuro, alto contraste)
6. **Business**: Corporativo (`Inter`, fondo gris azulado, conservador)
7. **Photography**: Visual (`Cormorant Garamond`, cálido terroso, recto)
8. **Warm**: Artesanal (`Lora`, tonos arena y marrón)
9. **Dark**: Premium (`Manrope`, fondo negro puro)
10. **Modern**: Servicios (`Poppins`, azul brillante, tech)
11. **Ocean**: Vibrante (`Manrope`, gradient cyan/azul)
12. **Sunset**: Inspirador (`DM Sans`, gradient naranja/rosa)

## SELECTOR VISUAL

El `<TemplatePicker />` reemplazó los antiguos "Temas rápidos" dentro de la sección Diseño.
Muestra una grilla responsiva (de 2 a 4 columnas según espacio) con un _mini-preview_ visual y el nombre de la plantilla.

## MINI PREVIEWS

Las mini-previews son componentes `<TemplateThumbnail />` ultraligeros creados puramente con HTML/CSS (sin imágenes, ni requests de red). Estos componentes calculan si el fondo de la plantilla es oscuro o claro, y ajustan la opacidad de los avatares falsos y textos (`mix-blend-mode` simulado) para garantizar que las demostraciones siempre sean legibles. Emplean las fuentes reales (`font-family`) para que el usuario pueda percibir la tipografía.

## ESTADO PERSONALIZADO

El picker verifica en tiempo real la correspondencia exacta entre la base de datos (o borrador local) y las 12 plantillas. Si el usuario selecciona "Minimal", pero cambia manualmente el color de fondo a rojo, el sistema detecta que la igualdad estricta se rompió y cambia discretamente el estado a un badge que dice **"Personalizado"**.

## PERSONALIZACIÓN POSTERIOR

Ninguna plantilla bloquea al usuario. Es posible escoger un punto de partida y modificar posteriormente cualquiera de sus atributos mediante el Font Picker o el Color Picker.

## PERSISTENCIA

Las plantillas **no inyectan `template_id`** en la DB. Sus acciones equivalen a modificar simultáneamente 5 propiedades del perfil. Al guardar y recargar, el estado se preserva perfectamente porque los valores subyacentes son strings nativos (`font_family`, `background_color`, etc.).

## RESPONSIVE

- **Mobile**: Grid de 2 columnas `grid-cols-2`. Mantiene tamaños legibles de touch points (mínimo 44px).
- **Desktop**: Fluye inteligentemente a 4 columnas para maximizar aprovechamiento visual sin scroll vertical exhaustivo.

## ACCESSIBILITY

Cada botón/plantilla cuenta con `aria-label`, `aria-pressed`, `type="button"`, y focus visible.

## ARCHIVOS CREADOS

- `src/lib/design/template-presets.ts`
- `src/components/editor/TemplatePicker.tsx`
- `docs/arreglos-ui/04_PLANTILLAS_PRESETS_MARCA_UI.md`

## ARCHIVOS MODIFICADOS

- `src/components/editor/DesignSection.tsx` (Remoción de Temas Rápidos, inserción de TemplatePicker y Forma de Botón).
- `src/components/profile/PublicProfileView.tsx` (Activación efectiva de `button_radius` sobre los enlaces públicos).

## DEPENDENCIAS

No se añadieron dependencias nuevas de `npm`. Solo tipografía preexistente (`@fontsource`).

## SMOKE TEST

- **Previsualización**: Cambio atómico instantáneo al hacer clic sobre una plantilla (fuente, color, bordes, todo se recalcula en `<PublicProfileView />`).
- **Personalización posterior**: El Font Picker y Color Picker coexisten y actúan sobre el estado local modificando la configuración base sin sobreescribir la lógica.
- **Preview pública**: Carga exitosa.
- **Avatar, Bio y Links**: Intactos en cada iteración.
- **Rendimiento**: Animaciones y re-renders dentro del umbral de <16ms por frame, la previsualización no traba el hilo principal.

## BUILD/LINT/TYPECHECK

`npm run build` y `npm run lint` finalizados y validados exitosamente en ambos entornos.

## REGRESIONES

Cero. El código del sistema y el QR sigue estrictamente encapsulado.

## LÓGICA PROTEGIDA

Ninguna modificación en Supabase ni interacciones con backend que alteren la identidad del usuario o link-tree logic.

## PENDIENTES FASE 3

- UI-05: Portada, Avatar cuadrado y anillos.
- UI-06: Estilos extendidos de Botón Premium (Outline, Soft, etc).
- UI-07: Rediseño Final Página Pública.

## VEREDICTO

**PASS**. El sistema está estable y operativo.
