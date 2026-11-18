/**
 * Resolución de color de las tarjetas de reseñas — capa de CONSUMO.
 *
 * El problema que resuelve: la tarjeta pinta `--surface` (el fondo que la
 * paleta le da) pero heredaba `--fg` / `--muted` derivados del fondo de la
 * PÁGINA. `makePalette` genera `muted = mix(fg, page, 0.62)` —una mezcla fija
 * hacia el fondo de la página— y `fg = readableOn(page)`, así que nada de eso
 * está medido contra la superficie donde realmente se pintan. Medido sobre las
 * 88 paletas: el testimonio queda por debajo de AA en **63** de ellas (28 por
 * debajo de 3:1, 9 por debajo de 2:1) y el nombre falla en `caramel` (2.67:1)
 * y `red-energy` (4.45:1) —literalmente las "tarjetas con nombres y testimonios
 * demasiado claros sobre superficies claras" del informe.
 *
 * La corrección NO toca las paletas ni los temas: son valores históricos y
 * publicados. Se resuelve aquí, en el consumo, con la prioridad que ya define
 * el contrato del editor:
 *
 *   1. override explícito del ELEMENTO   (`nameColor`, `textColor`, `starsColor`, …)
 *   2. override de la TARJETA            (`cardText`, `cardBg`, `cardLine`, …)
 *   3. tokens semánticos de la paleta    (`palette.semantic.*`, los 12)
 *   4. fallback accesible del tema       (tokens resueltos, reparados a AA)
 *
 * Dos reglas gobiernan toda la cadena:
 *
 * · **Un color explícito se conserva.** Si el autor eligió un color, se usa tal
 *   cual, aunque no llegue a AA; lo que sí hace el editor es medirlo y avisarlo
 *   en el panel (`contrast`), en vez de corregirlo por su cuenta.
 * · **Un color derivado nunca queda por debajo del umbral.** Cualquier valor
 *   que no venga de 1 ó 2 se mide contra el fondo REAL de la tarjeta y, si no
 *   alcanza el objetivo, se empuja hacia el extremo de la casa hasta lograrlo
 *   (`accessibleOn`). Es lo que convierte "tokens semánticos" en "fallback
 *   accesible" en vez de en una promesa.
 *
 * Sobre el nivel 3, verificado en el código y no supuesto: **el renderer actual
 * no consume `palette.semantic`**. El único lector de una paleta es
 * `useThemeTokens`, y lee `page`, `accent`, `accentFg`, `swatches` y `radius`
 * (`hooks/useThemeTokens.ts:22-70`). Y los tokens de este nivel son *isomorfos*
 * a los del tema: `makePalette` publica `text: fg`, `muted`, `line`,
 * `accent: accent`, `ctaBackground: accent` y `ctaForeground/iconForeground:
 * accentFg`. Consumirlos "tal cual" no habría cambiado nada: arrastran
 * exactamente el mismo defecto. Eso no queda como comentario —lo fija una
 * prueba: el nivel 3 nunca mueve un color ya publicado.
 *
 * Los únicos tokens que aportan algo que hoy no existe son los que no tienen
 * consumidor: `secondarySurface` (superficie interior) e `iconSurface`. Se
 * aplican **sólo** donde el autor los pide, para que ninguna página publicada se
 * mueva por sí sola (ver `surfaceSecondaryAuthored`).
 *
 * Cuando el fondo no es un hex medible —el tono personalizado de la página
 * produce `color-mix(…)`— el módulo **no adivina**: conserva el valor heredado,
 * que es lo que la página ya renderizaba. Es el mismo contrato que documenta
 * `brandingContrast.contrastRatio` para sus `null`.
 *
 * Puro y sin dependencias de React: se prueba sobre las 88 paletas.
 */
import { contrastRatio, parseHexColor } from './brandingContrast';
import { CARD_GROUP_ITEM_KEYS, CARD_PADDING, CARD_SHADOWS } from './cardLayout';
import { ensureContrast, hexToRgb, rgbToHex } from './coverPalette';

/** Los dos extremos de la casa, idénticos a los de `useThemeTokens.readableOn`. */
export const REVIEW_INK = '#211D19';
export const REVIEW_PAPER = '#FBF6EE';
/** Los extremos puros: último recurso, para fondos de luminancia media. */
export const PURE_INK = '#000000';
export const PURE_PAPER = '#FFFFFF';

/** WCAG AA: texto normal. El nombre (15px) y el testimonio (13.5px) lo necesitan. */
export const TEXT_MIN_RATIO = 4.5;
/** WCAG AA para texto grande y para componentes de interfaz (bordes, iconos). */
export const UI_MIN_RATIO = 3;
/**
 * **No es un umbral WCAG.** Es el mínimo para que algo se vea, y existe porque la
 * medición encontró un defecto que ningún umbral de accesibilidad cubre: en
 * `sage` y `caramel` el acento de la paleta es *exactamente* el color de la
 * superficie de la tarjeta (`#6B7A4E` y `#B98A5A`), así que las cinco estrellas
 * de valoración —y el chip del avatar— se pintaban a 1.00:1, o sea, no se veían.
 * Eso no es "contraste mejorable", es una valoración que no aparece; y el
 * informe lo llama "colores incompletos".
 *
 * Como no hay norma que lo fije, el valor se elige y se declara: 1.5:1 es el
 * punto donde el color deja de ser una mancha y se distingue del fondo, y sólo
 * se aplica a los valores **derivados** —un color elegido por el autor nunca se
 * toca, ni siquiera aquí.
 */
export const PERCEPTIBLE_MIN_RATIO = 1.5;

/**
 * Las claves de `doc.props` que la resolución lee, por rol.
 *
 * Los nombres `card*` y `groupCard*` **no se inventan aquí**: son los del
 * contrato de tarjeta que ya publican `cardLayout.CARD_GROUP_ITEM_KEYS` y
 * `FamilyCard` (`cardBg`, `cardSurface`, `cardText`, `cardMuted`, `cardLine`,
 * `cardAccent`, `cardAccentFg`, `cardIconBg`, `cardIconColor`, `spacing`,
 * `shadow`, `border`). Una reseña es una tarjeta, así que acepta las mismas
 * props con el mismo significado, y el default de bloque es la misma prop de
 * grupo (`groupCardText`, …) que resuelve `resolveCard` para la familia.
 *
 * Los alias cortos (`nameColor`, `textColor`, `starsColor`, `avatarColor`) son
 * la única adición: nombran el rol concreto dentro de la tarjeta de reseña y
 * ganan al nombre genérico, que sigue funcionando.
 */
export interface ReviewColorProps {
  /** Override del elemento: el color del nombre. */
  nameColor?: string;
  /** Override del elemento: el color del testimonio. */
  textColor?: string;
  /** Override del elemento: el color de las estrellas. */
  starsColor?: string;
  /** Override del elemento: el fondo del avatar de iniciales. */
  avatarColor?: string;
  /** Overrides de la tarjeta. */
  cardBg?: string;
  cardSurface?: string;
  cardText?: string;
  cardMuted?: string;
  cardLine?: string;
  cardAccent?: string;
  cardAccentFg?: string;
  cardIconBg?: string;
  cardIconColor?: string;
  /** Geometría y profundidad: mismos escalones que la familia de tarjetas. */
  spacing?: string;
  shadow?: string;
  border?: string;
  /** Defaults de bloque, con los nombres del contrato (`CARD_GROUP_ITEM_KEYS`). */
  groupCardBg?: string;
  groupCardSurface?: string;
  groupCardText?: string;
  groupCardMuted?: string;
  groupCardLine?: string;
  groupCardAccent?: string;
  groupCardAccentFg?: string;
  groupCardIconBg?: string;
  groupCardIconColor?: string;
  groupCardSpacing?: string;
  groupCardShadow?: string;
  groupCardBorder?: string;
}

/** Los 12 tokens semánticos de la paleta, tal y como los publica `makePalette`. */
export interface ReviewSemanticTokens {
  pageBackground?: string;
  surface?: string;
  secondarySurface?: string;
  text?: string;
  muted?: string;
  accent?: string;
  accentFg?: string;
  line?: string;
  ctaBackground?: string;
  ctaForeground?: string;
  iconSurface?: string;
  iconForeground?: string;
}

/** Lo que el tema ya resolvió para la página (incluye "Unificar color de texto"). */
export interface ReviewThemeTokens {
  surface: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
}

export interface ReviewColorInput {
  /** `doc.props[reviewId]` — overrides de elemento y de tarjeta. */
  props: ReviewColorProps;
  /** `doc.props[`block:${key}`]` — el mismo nivel "tarjeta", aplicado a todas. */
  blockProps?: ReviewColorProps;
  /** Tokens semánticos de la paleta elegida, si hay una. */
  semantic?: ReviewSemanticTokens | undefined;
  /** Fallback del tema. */
  theme: ReviewThemeTokens;
}

/** Un color resuelto, con lo que se midió y si hubo que intervenir. */
export interface ReviewToken {
  value: string;
  /** Ratio medido contra el fondo real de la tarjeta; `null` si no es medible. */
  contrast: number | null;
  /** `true` cuando el valor se empujó para alcanzar el umbral. */
  enforced: boolean;
}

export interface ReviewColorScope {
  /** Fondo real de la tarjeta: la referencia contra la que se mide todo. */
  surface: string;
  surfaceSecondary: string;
  /**
   * `true` cuando la superficie interior salió de un override del autor (nivel 1
   * ó 2) y no de la paleta. El bloque sólo pinta la banda interior en ese caso:
   * así ninguna página ya publicada cambia de aspecto por sí sola.
   */
  surfaceSecondaryAuthored: boolean;
  name: ReviewToken;
  text: ReviewToken;
  stars: ReviewToken;
  /** La estrella vacía: informa la valoración sin depender sólo del color. */
  starsEmpty: ReviewToken;
  line: ReviewToken;
  accent: ReviewToken;
  accentFg: ReviewToken;
  avatarBg: ReviewToken;
  avatarFg: ReviewToken;
}

/**
 * Profundidad: los tres escalones del contrato de tarjeta, ni uno más.
 *
 * No se inventa una sombra propia. `CARD_SHADOWS` es la que ya pintan las
 * tarjetas de familia y la que ofrece `CardSurfaceFields`, así que la reseña usa
 * exactamente la misma (`soft` = "Suave", `lifted` = "Elevada") y el informe
 * queda satisfecho por la vía nativa: "profundidad sutil, sin imponer sombras
 * excesivas" es, literalmente, el escalón que ya existe.
 *
 * El defecto es `none`, **el mismo del contrato** (`cardProps.shadow ?? 'none'`
 * en `FamilyCard`, `props.shadow ?? 'none'` en el panel): la profundidad se
 * elige. Eso importa aquí más que en ninguna otra parte — si el defecto fuera
 * una sombra, cada página ya publicada con reseñas cambiaría de aspecto al
 * abrir el editor, y eso es exactamente lo que no debe pasar.
 */
export type ReviewShadow = 'none' | 'soft' | 'lifted';

export const REVIEW_SHADOW_DEFAULT: ReviewShadow = 'none';

/** Una sombra sólo si el valor es uno de los tres del contrato. */
export function readReviewShadow(raw: string | undefined): ReviewShadow {
  return raw === 'none' || raw === 'soft' || raw === 'lifted' ? raw : REVIEW_SHADOW_DEFAULT;
}

/** La sombra del escalón elegido. `none` se declara, no se omite. */
export function reviewShadowStyle(shadow: ReviewShadow): Record<string, string> {
  return { boxShadow: CARD_SHADOWS[shadow] ?? CARD_SHADOWS['none']! };
}

/** Los tres escalones de relleno interior, los mismos de la familia. */
export type ReviewSpacing = 'S' | 'M' | 'L';

export const REVIEW_SPACING_DEFAULT: ReviewSpacing = 'M';

/** `M` = 20px, que es el `p-5` que la tarjeta ya tenía: nada se mueve por defecto. */
export function readReviewSpacing(raw: string | undefined): ReviewSpacing {
  return raw === 'S' || raw === 'M' || raw === 'L' ? raw : REVIEW_SPACING_DEFAULT;
}

export function reviewPadding(spacing: ReviewSpacing): number {
  return CARD_PADDING[spacing] ?? CARD_PADDING['M']!;
}

/**
 * El borde: `on` por defecto, igual que en `FamilyCard` (`border ?? 'on'`). El
 * color lo decide el rol `line`; aquí sólo se decide si se pinta.
 */
export function readReviewBorder(raw: string | undefined): boolean {
  return raw !== 'off';
}

/* ------------------------------------------------------------------ */
/* Aritmética                                                          */
/* ------------------------------------------------------------------ */

/**
 * Mezcla lineal por canal, el mismo cálculo que `visualPresets.mix`.
 *
 * Se replica —en vez de importarse— porque aquél es privado del generador de
 * paletas y esto es una lectura, no una paleta: si mañana cambia la generación,
 * las paletas publicadas no deben moverse por ello.
 */
export function mixHex(from: string, to: string, amount: number): string {
  const a = parseHexColor(from);
  const b = parseHexColor(to);
  if (!a || !b) return from;
  const t = Math.min(1, Math.max(0, amount));
  const blend = (index: number) => {
    const value = Math.round(a[index]! * (1 - t) + b[index]! * t);
    return value.toString(16).padStart(2, '0');
  };
  return `#${blend(0)}${blend(1)}${blend(2)}`.toUpperCase();
}

/**
 * El extremo que mejor lee sobre `surface`, medido —no supuesto—. Por defecto
 * entre los de la casa; con dos candidatos propios, entre ésos.
 */
export function readableExtreme(
  surface: string,
  dark: string = REVIEW_INK,
  light: string = REVIEW_PAPER,
): string {
  const ink = contrastRatio(dark, surface);
  const paper = contrastRatio(light, surface);
  if (ink === null || paper === null) return REVIEW_INK;
  return ink >= paper ? dark : light;
}

/**
 * `preferred` si ya alcanza `minRatio` sobre `surface`; si no, la versión más
 * cercana que sí lo alcanza.
 *
 * La reparación **no se escribe aquí**: se delega en
 * `coverPalette.ensureContrast`, que ya existe, está probado y camina la
 * *luminosidad en HSL* conservando tono y saturación —el color elegido sigue
 * pareciendo el color elegido, sólo cambia de luz—. Repetir esa aritmética con
 * una mezcla en RGB, que es lo primero que uno escribe, desatura: el acento
 * `#123DB7` de `blue-medium` acababa en `#CCD1E3`, un gris azulado que ya no es
 * la marca de nadie. Con HSL se queda en azul.
 *
 * Encima de eso, dos garantías que `ensureContrast` solo no da:
 *
 * · **Se prueban también los extremos.** `ensureContrast` camina en una sola
 *   dirección —la que marca la luminosidad del fondo—, así que en un fondo de
 *   luminancia media puede quedarse corto aunque otro color sí llegue. Aquí,
 *   si el camino con tono no alcanza el umbral, se miden los cuatro extremos
 *   (tinta y papel de la casa, y los puros `#000000`/`#FFFFFF` como último
 *   recurso) y se devuelve el mejor.
 * · **Nunca devuelve algo peor que la entrada.** El punto de partida es
 *   `preferred`: todo lo demás tiene que mejorarlo. Si el color heredado ya era
 *   lo mejor posible para ese fondo, se devuelve intacto.
 *
 * Cuando el fondo no admite el umbral con ningún color —`red-energy`: su
 * superficie se queda en 4.45:1 incluso con blanco puro— devuelve ese techo y lo
 * declara en `contrast`, en vez de fingir que cumplió. El panel lo dice con el
 * número medido; no se esconde.
 *
 * Y cuando algo no es un hex medible, devuelve `preferred` intacto: no se
 * inventa un color para un valor que no se puede medir.
 */
export function accessibleOn(surface: string, preferred: string, minRatio: number): ReviewToken {
  const measured = contrastRatio(preferred, surface);
  if (measured === null) return { value: preferred, contrast: null, enforced: false };
  if (measured >= minRatio) return { value: preferred, contrast: measured, enforced: false };

  const background = hexToRgb(surface);
  const foreground = hexToRgb(preferred);
  if (background && foreground) {
    const repaired = rgbToHex(ensureContrast(foreground, background, minRatio));
    const ratio = contrastRatio(repaired, surface);
    if (ratio !== null && ratio >= minRatio) return { value: repaired, contrast: ratio, enforced: true };
  }

  let best: ReviewToken = { value: preferred, contrast: measured, enforced: true };
  for (const extreme of [REVIEW_INK, REVIEW_PAPER, PURE_INK, PURE_PAPER]) {
    const ratio = contrastRatio(extreme, surface);
    if (ratio !== null && ratio > (best.contrast ?? 0)) {
      best = { value: extreme, contrast: ratio, enforced: true };
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Resolución                                                          */
/* ------------------------------------------------------------------ */

/** Primer valor con contenido. `''` es "sin override": así lo escribe el editor. */
function pick(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/** `cardText` → `groupCardText`. Derivado de la tabla del contrato, no copiado. */
const GROUP_KEY_BY_ITEM: Record<string, string> = Object.fromEntries(
  Object.entries(CARD_GROUP_ITEM_KEYS).map(([groupKey, itemKey]) => [itemKey, groupKey]),
);

/**
 * El default de bloque de una prop de tarjeta.
 *
 * Se lee la prop de GRUPO (`groupCardText`), que es la que usa el contrato para
 * decir "todas las tarjetas de este bloque". Nunca la prop suelta en el bloque:
 * ahí `spacing` significa otra cosa —el ritmo vertical de la sección, 28/60/104px
 * en `Block.tsx`— y escribirla desde aquí movería la página entera en vez de la
 * tarjeta.
 */
function groupDefault(blockProps: ReviewColorProps, itemKey: string): string | undefined {
  const groupKey = GROUP_KEY_BY_ITEM[itemKey];
  if (groupKey === undefined) return undefined;
  return (blockProps as Record<string, string | undefined>)[groupKey];
}

/** Un valor que el autor escribió: se conserva, sólo se mide. */
function explicit(value: string | undefined, surface: string): ReviewToken {
  const found = pick(value);
  if (found === undefined) return { value: '', contrast: null, enforced: false };
  return { value: found, contrast: contrastRatio(found, surface), enforced: false };
}

interface RoleInput {
  /**
   * Nivel 1: overrides del elemento, en orden de prioridad. El alias corto del
   * rol (`nameColor`) va antes que el nombre genérico del contrato (`cardText`).
   */
  elementKeys?: (keyof ReviewColorProps)[];
  /** Nivel 2 (tarjeta): se leen en la tarjeta y luego en el default del bloque. */
  cardKeys: (keyof ReviewColorProps)[];
  /** Nivel 3. */
  semantic?: string | undefined;
  /** Nivel 4. */
  theme: string;
  /**
   * El umbral exigido al rol —o `null` para medir sin reparar, que es el caso
   * del borde (ver el rol `line`).
   */
  minRatio: number | null;
  /** Fondo de referencia: el de la tarjeta, o el del avatar para la inicial. */
  surface: string;
  props: ReviewColorProps;
  blockProps: ReviewColorProps;
}

/**
 * Aplica la prioridad de cuatro niveles a un rol.
 *
 * Niveles 1 y 2 devuelven el valor tal cual (explícito). El nivel 3 sólo se
 * acepta si alcanza el umbral sobre el fondo real; si no, se pasa al 4, que ya
 * viene reparado — y si el 4 tampoco llegase, se conserva el mejor de los dos,
 * porque el objetivo es la legibilidad, no la procedencia.
 *
 * Cuando NINGUNO de los dos se puede medir —fondo no hex, el caso del tono
 * personalizado— se devuelve el valor del tema sin tocar: exactamente lo que la
 * página renderizaba antes de esta capa.
 */
function resolveRole(input: RoleInput): ReviewToken {
  const { elementKeys, cardKeys, semantic, theme, minRatio, surface, props, blockProps } = input;

  for (const key of elementKeys ?? []) {
    const element = explicit(props[key], surface);
    if (element.value !== '') return element;
  }
  for (const key of cardKeys) {
    const card = explicit(pick(props[key], groupDefault(blockProps, key)), surface);
    if (card.value !== '') return card;
  }

  /**
   * `minRatio === null` es "mide, pero no repares": el rol se conserva tal y
   * como lo publica el contrato —paleta primero, tema después— y sólo se
   * registra su ratio medido.
   */
  if (minRatio === null) {
    const chosen = pick(semantic, theme) ?? theme;
    return { value: chosen, contrast: contrastRatio(chosen, surface), enforced: false };
  }

  const fromTheme = accessibleOn(surface, theme, minRatio);
  if (semantic === undefined) return fromTheme;

  const fromPalette = accessibleOn(surface, semantic, minRatio);
  if (fromPalette.contrast !== null && fromPalette.contrast >= minRatio) return fromPalette;
  if (fromPalette.contrast === null && fromTheme.contrast === null) return fromTheme;
  return (fromTheme.contrast ?? 0) >= (fromPalette.contrast ?? 0) ? fromTheme : fromPalette;
}

/**
 * Resuelve la paleta completa de una tarjeta de reseñas.
 *
 * El fondo se decide PRIMERO porque es la referencia de todas las medidas: un
 * override de tarjeta cambia el fondo, y con él el contraste exigible a todo lo
 * que se pinte encima.
 */
export function resolveReviewColors(input: ReviewColorInput): ReviewColorScope {
  const { props, blockProps = {}, semantic, theme } = input;

  const surface =
    pick(props.cardBg, groupDefault(blockProps, 'cardBg'), semantic?.surface, theme.surface) ??
    theme.surface;
  const authoredSurfaceSecondary = pick(
    props.cardSurface,
    groupDefault(blockProps, 'cardSurface'),
  );
  const surfaceSecondary =
    pick(authoredSurfaceSecondary, semantic?.secondarySurface, surface) ?? surface;

  const name = resolveRole({
    elementKeys: ['nameColor'],
    cardKeys: ['cardText'],
    semantic: semantic?.text,
    theme: theme.fg,
    minRatio: TEXT_MIN_RATIO,
    surface,
    props,
    blockProps,
  });

  /**
   * El testimonio es el que más sufre: el `muted` de la paleta se mezcla hacia
   * el fondo de la PÁGINA, así que sobre la tarjeta hay que medirlo contra el
   * fondo de la tarjeta. Se apoya en el mismo nivel 4 que el resto —el token
   * del tema, reparado— en vez de inventar una mezcla propia: lo que decide es
   * el umbral, no la procedencia.
   */
  const text = resolveRole({
    elementKeys: ['textColor'],
    cardKeys: ['cardMuted'],
    semantic: semantic?.muted,
    theme: theme.muted,
    minRatio: TEXT_MIN_RATIO,
    surface,
    props,
    blockProps,
  });

  /**
   * La estrella LLENA es el acento de la paleta. **No se le exige WCAG**: es la
   * marca de la paleta, no un texto, y WCAG 1.4.11 exime a un gráfico cuya
   * información está disponible de otra forma —aquí lo está por tres vías: la
   * forma (`fill="none"` en las vacías), el `aria-label` "N de 5 estrellas" y el
   * `data-review-rating`, que es además el control con el que el autor edita la
   * valoración—. Llevarlo a 3:1 costaba caro y se midió: obligaba a cambiar el
   * acento en 25 de las 88 paletas, y un acento más claro u oscuro ya no es el
   * color de la marca. Así que ninguna página publicada se mueve por esto.
   *
   * Lo que sí se corrige es que la estrella **se vea**, con el mínimo perceptible
   * (`PERCEPTIBLE_MIN_RATIO`) y sin tocar el tono: en `sage` y `caramel` el
   * acento *es* el color de la tarjeta y las cinco estrellas desaparecían.
   */
  const stars = resolveRole({
    elementKeys: ['starsColor'],
    cardKeys: ['cardAccent'],
    semantic: semantic?.accent,
    theme: theme.accent,
    minRatio: PERCEPTIBLE_MIN_RATIO,
    surface,
    props,
    blockProps,
  });

  /**
   * La estrella vacía sale del propio acento, apagado hacia el fondo de la
   * tarjeta: mismo tono, siempre más débil que la llena —se lee "apagada", no
   * "de otro color"— y medida contra el fondo real. Si apagarla la borraría, se
   * apaga menos; y si aun así no llega, se queda con el color de la llena y la
   * diferencia la marca la forma, que es un cuadrado hueco frente a uno relleno.
   */
  const starsEmpty = (() => {
    const faded = [0.5, 0.25, 0]
      .map((amount) => mixHex(stars.value, surface, amount))
      .find((candidate) => (contrastRatio(candidate, surface) ?? 0) >= PERCEPTIBLE_MIN_RATIO);
    if (faded === undefined) return accessibleOn(surface, theme.line, UI_MIN_RATIO);
    return { value: faded, contrast: contrastRatio(faded, surface), enforced: false };
  })();

  /**
   * El borde es **decoración**, y por eso este rol es el único que se mide pero
   * no se repara (`minRatio: null`). WCAG 1.4.11 exige 3:1 a los componentes de
   * interfaz y a los gráficos necesarios para entender el contenido; un borde de
   * tarjeta no identifica ningún control ni informa de nada que el texto no diga
   * ya, y su valor es una decisión de diseño de la plantilla. Empujarlo a 3:1
   * habría repintado 83 de las 88 paletas publicadas —`line` es
   * `mix(page, accent, 0.5)` y vive por debajo de 2:1 en 51 de ellas.
   *
   * La separación entre tarjetas la resuelve la profundidad, que es del contrato y
   * el autor puede apagar (`reviewShadowStyle`, escalón `none` por defecto). Un
   * override del autor, en cambio, manda siempre: nivel 1 y 2 se devuelven tal cual.
   */
  const line = resolveRole({
    cardKeys: ['cardLine'],
    semantic: semantic?.line,
    theme: theme.line,
    minRatio: null,
    surface,
    props,
    blockProps,
  });

  const accent = resolveRole({
    cardKeys: ['cardAccent'],
    semantic: semantic?.accent,
    theme: theme.accent,
    minRatio: null,
    surface,
    props,
    blockProps,
  });

  const accentFg = resolveRole({
    cardKeys: ['cardAccentFg'],
    semantic: semantic?.accentFg,
    theme: theme.accentFg,
    minRatio: TEXT_MIN_RATIO,
    surface: accent.value,
    props,
    blockProps,
  });

  /**
   * El fondo del avatar es una **superficie**, no un control: no se repara.
   *
   * Medido, y por eso: el acento de `cream` (`#B8935A`) no llega a 3:1 sobre la
   * tarjeta, así que empujarlo lo dejaba en un tono medio — y un fondo de
   * luminancia media es justo el que NO admite iniciales a 4.5:1 con ningún
   * color. La reparación del fondo se comía la legibilidad de lo que va encima.
   * Conservando el acento de la paleta, la inicial se resuelve sola (tinta o
   * papel, el que lea) y el chip no se mueve en ninguna página publicada.
   *
   * `ctaBackground` y `accent` son el mismo valor en `makePalette`, así que el
   * nivel 3 entra sin cambiar nada.
   */
  const avatarBg = resolveRole({
    elementKeys: ['avatarColor'],
    cardKeys: ['cardIconBg', 'cardAccent'],
    semantic: semantic?.ctaBackground ?? semantic?.accent,
    theme: theme.accent,
    minRatio: PERCEPTIBLE_MIN_RATIO,
    surface,
    props,
    blockProps,
  });

  /** La inicial se lee SIEMPRE contra el fondo del avatar, no contra la tarjeta. */
  const avatarFg = (() => {
    const card = explicit(
      pick(props.cardIconColor, groupDefault(blockProps, 'cardIconColor'), props.cardAccentFg, groupDefault(blockProps, 'cardAccentFg')),
      avatarBg.value,
    );
    if (card.value !== '') return card;
    return accessibleOn(avatarBg.value, semantic?.iconForeground ?? theme.accentFg, TEXT_MIN_RATIO);
  })();

  return {
    surface,
    surfaceSecondary,
    surfaceSecondaryAuthored: authoredSurfaceSecondary !== undefined,
    name,
    text,
    stars,
    starsEmpty,
    line,
    accent,
    accentFg,
    avatarBg,
    avatarFg,
  };
}

/**
 * Los tokens semánticos que la página admite, dado lo que el autor ya eligió.
 *
 * Existe porque el nivel 3 se sitúa **por encima** del 4 en el contrato, y los
 * overrides de página (`textColor`, `mutedColor`, `surfaceColor`, `lineColor`,
 * `accent`, `accentFg`) llegan justamente por el nivel 4, dentro del tema. Si se
 * pasaran los 12 tokens sin filtrar, la paleta pisaría una elección explícita
 * del autor — una regresión silenciosa. Así que cada token se descarta cuando el
 * rol que alimenta ya tiene dueño.
 *
 * Y si la página usa un tono personalizado (`bgOverride`), el tema entero de la
 * paleta está fuera de juego —es lo que hace `useThemeTokens`—: no queda ningún
 * token semántico que aportar, ni siquiera para medir.
 *
 * Los nombres de las props son los mismos que lee `useThemeTokens`; el día que
 * aquéllos cambien, esta función cambia con ellos.
 */
export function supportedSemanticTokens(
  page: Record<string, string | undefined>,
  palette: { semantic?: ReviewSemanticTokens | undefined } | undefined,
): ReviewSemanticTokens | undefined {
  const semantic = palette?.semantic;
  if (semantic === undefined) return undefined;
  const overridden = (key: string) => (page[key] ?? '').trim() !== '';
  if (overridden('bgOverride')) return undefined;

  const kept: ReviewSemanticTokens = { ...semantic };
  if (overridden('textColor')) delete kept.text;
  if (overridden('mutedColor')) delete kept.muted;
  if (overridden('surfaceColor')) delete kept.surface;
  if (overridden('lineColor')) delete kept.line;
  if (overridden('accent')) {
    delete kept.accent;
    delete kept.ctaBackground;
  }
  if (overridden('accentFg')) {
    delete kept.accentFg;
    delete kept.ctaForeground;
    delete kept.iconForeground;
  }
  return kept;
}

/**
 * Los estilos de la tarjeta: las mismas variables CSS que ya usan las clases
 * `cq-*`, pero resueltas dentro del ámbito de la tarjeta. Eso hace que esta
 * corrección valga para el render del editor y para el público sin duplicar
 * ninguna rama del renderer.
 */
export function reviewColorScopeStyle(scope: ReviewColorScope): Record<string, string> {
  return {
    background: scope.surface,
    '--surface': scope.surface,
    '--fg': scope.name.value,
    '--muted': scope.text.value,
    '--line': scope.line.value,
    '--accent': scope.accent.value,
    '--accent-fg': scope.accentFg.value,
  };
}
