# 07 PÁGINA PÚBLICA PREMIUM UI

## OBJETIVO

Refinar y ensamblar visualmente todos los componentes existentes de la página pública para producir una experiencia coherente, premium, elegante y profesional. Convertir un generador de links genérico en una herramienta de marca personal ('microsite' feel).

## ESTADO INICIAL

Los componentes (portada, avatar, anillo, botones, fondos) operaban individualmente. Algunas opciones de color y fondos oscuros provocaban fallos de legibilidad (texto oscuro sobre fondo oscuro). El ancho máximo en desktop se sentía ligeramente estrecho y faltaban detalles de pulido visual y de accesibilidad. No había alineación de motion-reduce.

## COMPOSICIÓN

Se refinó la jerarquía de los elementos: Portada fluida, solapamiento elegante del avatar, titulo y bio con margen transpirable, seguido por la lista de enlaces con anchos y paddings estandarizados.

## PORTADA

Comportamiento fluido. Si existe, la imagen (`banner_url`) usa un contenedor `h-32 sm:h-40 shrink-0` con `object-cover`. Si no existe, se inyecta un padding-top estructural compensatorio de `pt-10 sm:pt-16` para naturalidad.

## AVATAR

Usa `w-28 h-28 object-cover shadow-lg border-[3px] border-white/40 backdrop-blur-sm` junto con `avatarShapeClass`.
Si existe portada, utiliza `-mt-14 mb-4` para un solapamiento parcial de 50%. Sin portada usa `mb-6`.
Integra la clase utilitaria `motion-reduce:transition-none` para respetar configuraciones del sistema operativo.

## RING

Implementado nativamente usando `outline` y `outline-offset` para respetar cualquier radio y evitar cortes en la imagen del avatar o renderizado doble en fondos oscuros.

## NOMBRE

Calcula automáticamente el `textColor` contrastante en base a la iluminancia (YIQ) del `background_color`.
Alineación centrada con `break-words tracking-tight`. Peso `font-extrabold`.

## BIO

También usa el `textColor` calculado. Ancho máximo contenido (`max-w-[320px]`) con `opacity-80` para jerarquía secundaria. Excelente legibilidad y espaciado respecto a la botonera principal.

## BOTONES

Conservan el sistema UI-06 (7 estilos). Se refinaron eliminando cualquier microinteracción rebotante, utilizando `transition-all duration-200 hover:-translate-y-[1px]` acompañado estricta y obligatoriamente por `motion-reduce` y eliminando todo outline ruidoso en favor de `focus-visible:ring-2`.

## ICONOGRAFÍA

Soporte para los SVG reales de marcas vía `react-simple-icons` y fallback en `lucide-react`. Atributo `aria-hidden="true"` aplicado.

## FONDO

Añadida la regla `backgroundAttachment: 'fixed'` al mapeo del estilo de contenedor si es degradado, asegurando una experiencia visual premium al hacer scroll, evitando cortes si la altura del viewport sobrepasa los límites de pantalla.

## PLANTILLAS

El sistema asimila perfectamente los presets (Editorial, minimal, dark...). La nueva automatización de legibilidad respeta los temas y soluciona conflictos entre `bg_color` customizados sin necesidad de migrar propiedades adicionales en la base de datos (Ej: `button_text_color` intocado).

## FOOTER

No se añadió marca de agua publicitaria. El límite se mantiene limpio.

## EMPTY STATES

Cualquier combinación (sin portada, sin bio, 2 links, 10 links) respeta el flujo de caja sin destruir los paddings o empalmar márgenes.

## PREVIEW/PUBLIC PARITY

Coincidencia absoluta 1:1, ya que `editor.tsx` importa directamente el `<PublicProfileView isPreview={true} />`.

## MOBILE

Mobile-first aplicado desde el CSS base, con paddings simétricos laterales (`px-4 sm:px-6`).

## DESKTOP

Ancho máximo reajustado a `md:max-w-[520px]` desde `480px` para prevenir un look 'formulario', centrando la composición.

## ACCESSIBILITY

Añadido `aria-hidden="true"` a todos los iconos sociales, decorativos y el chevron de acción. Motion reduce aplicado estrictamente. Aumento de contraste automatizado (`YIQ >= 128 ? '#1a1a1a' : '#fdfdfd'`).

## PERFORMANCE

Nulo aumento de renders y paquetes. La capa matemática del YIQ corre eficientemente en memoria para un valor único (bgColor).

## ARCHIVOS MODIFICADOS

- `src/components/profile/PublicProfileView.tsx`

## LÓGICA PROTEGIDA

Supabase Auth, RLS, Fetch logic, Links routing, QR y Public_ID, Publish logic intactos.

## SMOKE TEST

Todos los estilos validados en emulación responsiva de navegador. Clicks en preview detenidos mediante `e.preventDefault()`, mientras en producción usan navegaciones limpias `target="_blank" rel="noopener noreferrer"`.

## REGRESIONES

Nula alteración de comportamientos existentes.

## PENDIENTES FASE 6

Auditoría responsive del editor de bloques (desktop vs mobile).

## VEREDICTO

UI-07 culminado. El micrositio tiene ahora una base visual de grado producto final.
