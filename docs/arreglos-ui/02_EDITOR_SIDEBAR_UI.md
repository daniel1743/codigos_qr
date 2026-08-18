# FASE UI-02: Editor Creativo 2026 — Sidebar, Paneles y Organización

## OBJETIVO
Convertir el largo formulario apilado verticalmente en una herramienta creativa moderna, limpia y compacta. Esto se logra implementando una arquitectura de Sidebar + Panel Contextual + Preview, reduciendo el scrolling innecesario y adoptando patrones de diseño SaaS premium 2026 (tipo "Apple-like" sobrio), **sin modificar en absoluto la lógica funcional de la aplicación**.

## ESTADO HEREDADO DE UI-01
- `alert`, `confirm` y `prompt` eliminados.
- Sonner configurado globalmente para toasts no bloqueantes.
- AlertDialog funcionando para confirmar eliminaciones críticas.
- Microinteracciones base (hover, `active:scale-[0.98]`, focus rings) configuradas en botones e inputs.

## ESTADO DEL EDITOR ANTES
- Un solo bloque gigante con scroll vertical (`grid grid-cols-1 lg:grid-cols-2`).
- El lado izquierdo apilaba `<ProfileSection>`, `<DesignSection>`, `<LinksSection>`, `<ShareSection>`.
- Cada sección era visible todo el tiempo, empujando el contenido hacia abajo.
- Las tarjetas de enlaces ocupaban demasiado espacio vertical, mostrando todos los inputs y controles a la vez.

## ARQUITECTURA VISUAL ANTERIOR
- `div` contenedor -> Componentes en pila -> Preview al lado.
- Todo compartía el mismo scroll.

## NUEVA ARQUITECTURA DEL EDITOR
Se ha desarmado el formulario largo vertical en tres áreas clave:
- **Sidebar (Navegación):** Se mantiene a la izquierda, manejando un estado interno `activeTab` para cambiar el panel contextual.
- **Panel Contextual:** Ubicado a la derecha del Sidebar, es donde se montan los componentes como `ProfileSection`, `LinksSection`, etc. Posee su propio scroll si el contenido es muy largo, y puede colapsarse lateralmente.
- **Preview:** Permanece visible a la derecha como el contenido de fondo ("Main"). Siempre accesible sin tener que scrollear todo el documento.

## SIDEBAR
Implementado con ancho fijo de `88px` en Desktop. Contiene iconos de `lucide-react` para Perfil, Enlaces, Diseño, Texto, Elementos y Publicar. Cada ícono cuenta con hover state suave y animación de `scale-110` al activarse.

## PANEL CONTEXTUAL
Panel deslizable con ancho fijo de `360px`. Posee botón para cerrarse (`<X>`) permitiendo que el usuario vea la previsualización sin distracciones. Implementa componentes por tabulaciones. 

## ENLACES COMPACTOS
El pesado formulario de cada enlace fue comprimido utilizando `<Accordion type="single">`. 
- **Estado colapsado:** Muestra el logotipo de la red, nombre, URL y el switch de visibilidad.
- **Estado expandido:** Muestra las opciones de edición y organización.
- Un solo enlace puede estar abierto a la vez, garantizando un área limpia.

## ICONOGRAFÍA
Se instaló y utilizó exitosamente `@icons-pack/react-simple-icons` para renderizar logotipos reales de Instagram, WhatsApp, X, Facebook, TikTok, YouTube, Telegram. Para LinkedIn se mantuvo una alternativa compatible de `lucide-react`. Estos íconos se pintan con los colores corporativos reales en una capa tenue.

## RESPONSIVE
En resoluciones móviles (`< 768px`), el Sidebar lateral desaparece y se convierte en un **Bottom Navigation Bar**. Al seleccionar una opción, el panel contextual emerge desde abajo como un *Bottom Sheet* con sombra superior y manejador de arrastre simulado, dejando la previsualización siempre a mano al fondo.

## ARCHIVOS CREADOS
- `src/components/editor/TextSection.tsx`
- `src/components/editor/ElementsSection.tsx`

## ARCHIVOS MODIFICADOS
- `src/routes/editor.tsx` (Cambio estructural absoluto del Layout).
- `src/components/editor/LinksSection.tsx` (Reconstrucción total a Accordion).
- `src/components/editor/DesignSection.tsx` (Extracción de tipografía).
- `src/components/editor/ProfileSection.tsx` (Retoque de headers).
- `src/components/editor/ShareSection.tsx` (Retoque de headers).

## DEPENDENCIAS
- `@icons-pack/react-simple-icons` (Agregado para logotipos de marcas).

## LÓGICA CONGELADA
- Persistencia en Supabase no modificada.
- Sincronización de enlaces preservada (El componente `<LinksSection>` sigue emitiendo el mismo objeto de enlaces hacia el `onChange` del padre).
- Handlers `handleSave` y Auth intactos.
- Lógica de publicación y URL públicas sin alteraciones.

## PRUEBAS
- **Build Passed:** `npm run build` compiló existosamente usando Vite/TanStack (Vercel Node 24.x).
- **Smoke test de UI:** Comportamientos responsive, acordeones e iconos se renderizan correctamente sin fallos de compilación.

## REGRESIONES
Ninguna conocida. Toda mutación se limitó a envolturas de presentación (CSS / Divs / Accordion), preservando el estado de datos en el padre (`editor.tsx`).

## PENDIENTES UI-03
- Integración de Selector Visual avanzado para fondos.
- Expansión de "Elementos".
- Re-escribir lógica real para selección avanzada de Google Fonts.

## VEREDICTO
**PASS**
