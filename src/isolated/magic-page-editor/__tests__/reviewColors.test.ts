/**
 * Reseñas · resolución de color en el consumo.
 *
 * El defecto que estas pruebas fijan, medido: la tarjeta de reseñas pinta el
 * fondo `page.surface` de la paleta, pero el nombre y el testimonio heredaban
 * `page.fg` / `page.muted`, que se derivan del fondo de la PÁGINA. En las
 * paletas donde ambos difieren —`red-medium`, `caramel`, `sage`…— eso deja
 * texto claro sobre superficie clara.
 *
 * Las pruebas no comprueban "que el panel pinta algo": miden el ratio WCAG
 * sobre el fondo REAL de la tarjeta, en las 88 paletas que el editor ofrece.
 */
import { describe, expect, it } from 'vitest';
import {
  PERCEPTIBLE_MIN_RATIO,
  REVIEW_INK,
  REVIEW_PAPER,
  TEXT_MIN_RATIO,
  UI_MIN_RATIO,
  accessibleOn,
  mixHex,
  readableExtreme,
  readReviewBorder,
  readReviewShadow,
  readReviewSpacing,
  reviewPadding,
  resolveReviewColors,
  reviewColorScopeStyle,
  reviewShadowStyle,
  supportedSemanticTokens,
  type ReviewColorProps,
  type ReviewThemeTokens,
} from '../utils/reviewColors';
import { contrastRatio } from '../utils/brandingContrast';
import { CARD_PADDING, CARD_SHADOWS } from '../utils/cardLayout';
import { familyPalettes, visualPalettes } from '../data/visualPresets';

/** El tema tal y como lo resuelve `useThemeTokens` para una paleta elegida. */
function themeOf(palette: (typeof visualPalettes)[number]): ReviewThemeTokens {
  return {
    surface: palette.page.surface,
    fg: palette.page.fg,
    muted: palette.page.muted,
    line: palette.page.line,
    accent: palette.accent,
    accentFg: palette.accentFg,
  };
}

const ALL = [...visualPalettes, ...familyPalettes];

const PLAIN_THEME: ReviewThemeTokens = {
  surface: '#FFFFFF',
  fg: '#211D19',
  muted: '#5A5A5A',
  line: '#DDDDDD',
  accent: '#B8935A',
  accentFg: '#FFFFFF',
};

describe('Reseñas · prioridad de color', () => {
  const theme: ReviewThemeTokens = {
    surface: '#FFFFFF',
    fg: '#211D19',
    muted: '#5A5A5A',
    line: '#DDDDDD',
    accent: '#B8935A',
    accentFg: '#FFFFFF',
  };

  it('1 · un override del ELEMENTO gana a todo lo demás', () => {
    const scope = resolveReviewColors({
      props: { nameColor: '#123456', cardText: '#654321' },
      blockProps: { groupCardText: '#abcdef' },
      semantic: { text: '#000000' },
      theme,
    });
    expect(scope.name.value).toBe('#123456');
  });

  it('2 · sin override de elemento, gana el de la TARJETA sobre el de la paleta', () => {
    const scope = resolveReviewColors({
      props: { cardText: '#654321' },
      semantic: { text: '#000000' },
      theme,
    });
    expect(scope.name.value).toBe('#654321');

    const fromBlock = resolveReviewColors({
      props: {},
      blockProps: { groupCardText: '#abcdef' },
      semantic: { text: '#000000' },
      theme,
    });
    expect(fromBlock.name.value).toBe('#abcdef');
  });

  it('el default de bloque usa la MISMA tabla de grupo que la familia de tarjetas', () => {
    // `resolveCard` mapea `groupCardText → cardText`; aquí llega ya como item.
    const scope = resolveReviewColors({
      props: {},
      blockProps: { groupCardText: '#abcdef' },
      theme,
    });
    expect(scope.name.value).toBe('#abcdef');
    // Y no por el nombre suelto en el bloque: ahí la prop no significa lo mismo.
    const loose = resolveReviewColors({
      props: {},
      blockProps: { cardText: '#abcdef' },
      theme,
    });
    expect(loose.name.value).toBe(theme.fg);
  });

  it('3 · el token semántico de la paleta se usa cuando NO está el nivel 2', () => {
    const scope = resolveReviewColors({
      props: {},
      semantic: { text: '#101820', surface: '#F2F4F8', line: '#C8CFDA', accent: '#1E56E0' },
      theme,
    });
    expect(scope.surface).toBe('#F2F4F8');
    expect(scope.name.value).toBe('#101820');
  });

  it('4 · sin nada de lo anterior, resuelve el fallback del tema', () => {
    const scope = resolveReviewColors({ props: {}, theme });
    expect(scope.surface).toBe(theme.surface);
    expect(scope.name.value).toBe(theme.fg);
  });

  it('el fondo de la tarjeta se decide ANTES que el texto, porque es la referencia', () => {
    const scope = resolveReviewColors({
      props: { cardBg: '#0B1F3A' },
      theme,
    });
    expect(scope.surface).toBe('#0B1F3A');
    // El texto del tema (casi negro) no lee sobre azul marino: se empuja solo.
    expect(contrastRatio(scope.name.value, '#0B1F3A')!).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
    expect(scope.name.enforced).toBe(true);
  });
});

describe('Reseñas · los colores explícitos se conservan', () => {
  const theme: ReviewThemeTokens = {
    surface: '#FFFFFF',
    fg: '#211D19',
    muted: '#5A5A5A',
    line: '#DDDDDD',
    accent: '#B8935A',
    accentFg: '#FFFFFF',
  };

  it('un color elegido por el autor NO se corrige, aunque no llegue a AA', () => {
    // #F0F0F0 sobre blanco es ≈1.1:1 — el peor caso posible — y aun así manda.
    const scope = resolveReviewColors({ props: { cardText: '#F0F0F0' }, theme });
    expect(scope.name.value).toBe('#F0F0F0');
    expect(scope.name.enforced).toBe(false);
  });

  it('pero SÍ se mide, para que el panel pueda avisar del ratio real', () => {
    const scope = resolveReviewColors({ props: { cardText: '#F0F0F0' }, theme });
    expect(scope.name.contrast).not.toBeNull();
    expect(scope.name.contrast!).toBeLessThan(TEXT_MIN_RATIO);
  });

  it('el fondo elegido también manda, y el texto derivado se re-mide contra ÉL', () => {
    const scope = resolveReviewColors({ props: { cardBg: '#111111' }, theme });
    expect(scope.surface).toBe('#111111');
    expect(contrastRatio(scope.name.value, '#111111')!).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
    expect(contrastRatio(scope.text.value, '#111111')!).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
  });

  it('un valor vacío es "sin override", que es como lo escribe el editor', () => {
    const scope = resolveReviewColors({ props: { cardText: '' }, theme });
    expect(scope.name.value).toBe(theme.fg);
  });
});

describe('Reseñas · fondo no medible (tono personalizado): no se adivina nada', () => {
  /** El caso real: `bgOverride` produce `color-mix(...)`, que no es un hex. */
  const theme: ReviewThemeTokens = {
    surface: 'color-mix(in srgb, #334455 90%, transparent)',
    fg: '#211D19',
    muted: 'color-mix(in srgb, #211D19 60%, #334455)',
    line: 'color-mix(in srgb, #211D19 15%, #334455)',
    accent: '#B8935A',
    accentFg: '#FFFFFF',
  };

  it('devuelve exactamente los valores heredados, uno por uno', () => {
    const scope = resolveReviewColors({ props: {}, theme });
    expect(scope.surface).toBe(theme.surface);
    expect(scope.name.value).toBe(theme.fg);
    expect(scope.text.value).toBe(theme.muted);
    expect(scope.starsEmpty.value).toBe(theme.line);
    expect(scope.line.value).toBe(theme.line);
    expect(scope.name.contrast).toBeNull();
  });

  it('pero un fondo explícito vuelve a habilitar la medición', () => {
    const scope = resolveReviewColors({ props: { cardBg: '#FFFFFF' }, theme });
    expect(scope.surface).toBe('#FFFFFF');
    expect(scope.name.contrast).not.toBeNull();
    expect(scope.name.value).toBe(theme.fg);
  });
});

describe('Reseñas · las 88 paletas quedan legibles sobre el fondo de la tarjeta', () => {
  it('reproduce los dos casos del informe: nombre y testimonio claros sobre superficie clara', () => {
    // `caramel` es el peor y el que se ve en la captura: `#F7EEE4` (casi blanco)
    // sobre `#B98A5A` → 2.67:1 en el nombre y 2.50:1 en el testimonio.
    const caramel = visualPalettes.find((entry) => entry.id === 'caramel')!;
    const caramelTheme = themeOf(caramel);
    expect(contrastRatio(caramelTheme.fg, caramelTheme.surface)!).toBeLessThan(TEXT_MIN_RATIO);
    expect(contrastRatio(caramelTheme.muted, caramelTheme.surface)!).toBeLessThan(TEXT_MIN_RATIO);

    // `red-energy` falla por poco y también estaba en la captura: 4.45:1 en el
    // nombre y 3.63:1 en el testimonio.
    const redEnergy = visualPalettes.find((entry) => entry.id === 'red-energy')!;
    const redTheme = themeOf(redEnergy);
    expect(contrastRatio(redTheme.fg, redTheme.surface)!).toBeLessThan(TEXT_MIN_RATIO);
    expect(contrastRatio(redTheme.muted, redTheme.surface)!).toBeLessThan(TEXT_MIN_RATIO);

    for (const [palette, theme] of [
      [caramel, caramelTheme],
      [redEnergy, redTheme],
    ] as const) {
      const scope = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
      expect(contrastRatio(scope.name.value, scope.surface)!, palette.id).toBeGreaterThanOrEqual(
        TEXT_MIN_RATIO,
      );
      expect(contrastRatio(scope.text.value, scope.surface)!, palette.id).toBeGreaterThanOrEqual(
        TEXT_MIN_RATIO,
      );
    }
  });

  it('ninguna de las 16 paletas con nombre deja el nombre ilegible', () => {
    const failing: string[] = [];
    for (const palette of visualPalettes) {
      const theme = themeOf(palette);
      // Las 16 con nombre NO traen bloque semántico: van del nivel 2 al 4.
      expect(palette.semantic, `${palette.id} no debería traer tokens semánticos`).toBeUndefined();
      const scope = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
      const ratio = contrastRatio(scope.name.value, scope.surface);
      if (ratio === null || ratio < TEXT_MIN_RATIO) failing.push(`${palette.id}=${ratio}`);
    }
    expect(failing).toEqual([]);
  });

  it('ninguna de las 72 variantes de familia deja el nombre ilegible', () => {
    const failing: string[] = [];
    for (const palette of familyPalettes) {
      const theme = themeOf(palette);
      const scope = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
      const ratio = contrastRatio(scope.name.value, scope.surface);
      if (ratio === null || ratio < TEXT_MIN_RATIO) failing.push(`${palette.id}=${ratio}`);
    }
    expect(failing).toEqual([]);
  });

  it('tampoco el testimonio, las estrellas ni las iniciales del avatar', () => {
    const failing: string[] = [];
    for (const palette of ALL) {
      const theme = themeOf(palette);
      const scope = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
      for (const role of ['name', 'text'] as const) {
        const ratio = contrastRatio(scope[role].value, scope.surface);
        if (ratio === null || ratio < TEXT_MIN_RATIO) failing.push(`${palette.id}.${role}=${ratio}`);
      }
      // Las estrellas no llevan el umbral de texto: son la marca de la paleta y
      // la valoración se lee por la forma y por el `aria-label`. Sólo se exige
      // que se vean. El borde queda fuera a propósito —es decoración y su test
      // es el siguiente.
      for (const role of ['stars', 'starsEmpty', 'avatarBg'] as const) {
        const ratio = contrastRatio(scope[role].value, scope.surface);
        if (ratio === null || ratio < PERCEPTIBLE_MIN_RATIO) {
          failing.push(`${palette.id}.${role}=${ratio}`);
        }
      }
      const initials = contrastRatio(scope.avatarFg.value, scope.avatarBg.value);
      if (initials === null || initials < TEXT_MIN_RATIO) {
        failing.push(`${palette.id}.avatarFg=${initials}`);
      }
    }
    expect(failing).toEqual([]);
  });

  it('el defecto era real y amplio: el testimonio fallaba en 63 de las 88 paletas', () => {
    // La evidencia, medida y no estimada: el `muted` de la paleta contra la
    // superficie de su propia tarjeta. Por eso la corrección vive en el consumo
    // y no en un parche a una paleta.
    const broken = ALL.filter((palette) => {
      const theme = themeOf(palette);
      const ratio = contrastRatio(theme.muted, theme.surface);
      return ratio === null || ratio < TEXT_MIN_RATIO;
    }).map((palette) => palette.id);
    expect(broken.length).toBe(63);
    expect(broken).toContain('earth-rich');
    expect(broken).toContain('red-energy');
    expect(broken).toContain('black-premium-premium');
    // Y el nombre, además, se rompía en 2 de ellas.
    const names = ALL.filter((palette) => {
      const theme = themeOf(palette);
      return (contrastRatio(theme.fg, theme.surface) ?? 9) < TEXT_MIN_RATIO;
    }).map((palette) => palette.id);
    expect(names).toEqual(['caramel', 'red-energy']);
  });

  it('el borde NO se repara: es decoración y su valor es una decisión de diseño', () => {
    // 23 de las 88 paletas tienen el borde por debajo de 1.5:1 sobre su propia
    // superficie —el peor, `red-energy`, a 1.00:1: el borde de su tarjeta es
    // literalmente del color de la tarjeta—. Empujarlo habría repintado páginas
    // publicadas, y WCAG 1.4.11 no se lo exige a un borde que no identifica
    // ningún control ni informa de nada que el texto no diga ya.
    const invisible = ALL.filter((palette) => {
      const theme = themeOf(palette);
      return (contrastRatio(theme.line, theme.surface) ?? 9) < PERCEPTIBLE_MIN_RATIO;
    }).map((palette) => palette.id);
    expect(invisible.length).toBe(23);
    expect(invisible).toContain('red-energy');

    const scope = resolveReviewColors({ props: {}, theme: PLAIN_THEME });
    expect(scope.line.value).toBe('#DDDDDD');
    expect(scope.line.enforced).toBe(false);
    expect(scope.line.contrast!).toBeLessThan(UI_MIN_RATIO);

    // Un override del autor tampoco se toca.
    const overridden = resolveReviewColors({ props: { cardLine: '#000000' }, theme: PLAIN_THEME });
    expect(overridden.line.value).toBe('#000000');
  });

  it('documenta la causa raíz: el token semántico es isomorfo al del tema', () => {
    // `makePalette` publica `text: fg`, `muted`, `line`, `accent: accent`,
    // `ctaBackground: accent` y `ctaForeground/iconForeground: accentFg`, así que
    // consumir el nivel 3 "tal cual" NO arregla la tarjeta: arrastra el mismo par
    // sin medir. Ésa es la desconexión que cierra esta capa, y por eso el arreglo
    // es la medición, no un cambio de token.
    for (const palette of ALL) {
      const theme = themeOf(palette);
      if (palette.semantic) {
        expect(palette.semantic.text, palette.id).toBe(theme.fg);
        expect(palette.semantic.muted, palette.id).toBe(theme.muted);
        expect(palette.semantic.accent, palette.id).toBe(theme.accent);
        expect(palette.semantic.ctaBackground, palette.id).toBe(theme.accent);
        expect(palette.semantic.iconForeground, palette.id).toBe(theme.accentFg);
      }
    }
    // Un caso de familia, medido: `blue-medium` pinta su testimonio a 1.64:1
    // sobre su propia superficie, y su token semántico es ese mismo valor.
    const blue = familyPalettes.find((entry) => entry.id === 'blue-medium')!;
    expect(contrastRatio(blue.semantic!.muted, blue.semantic!.surface)!).toBeLessThan(2);
    const blueTheme = themeOf(blue);
    const scope = resolveReviewColors({
      props: {},
      semantic: blue.semantic,
      theme: blueTheme,
    });
    expect(contrastRatio(scope.text.value, scope.surface)!).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
  });

  it('el nivel 3 nunca mueve un color que una página ya publica', () => {
    // La comprobación que la tarea pide explícitamente: no basta con declarar
    // que los 12 tokens son consumidos. Se resuelve cada paleta CON y SIN tokens
    // semánticos y se exige que todo lo visible salga idéntico. La única
    // excepción es la superficie interior, que es nueva y sólo se pinta cuando el
    // autor la pide — y eso lo comprueba el test siguiente.
    const moved: string[] = [];
    const roles = [
      'name',
      'text',
      'stars',
      'starsEmpty',
      'line',
      'accent',
      'accentFg',
      'avatarBg',
      'avatarFg',
    ] as const;
    for (const palette of ALL) {
      const theme = themeOf(palette);
      const withSemantic = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
      const withoutSemantic = resolveReviewColors({ props: {}, theme });
      for (const role of roles) {
        if (withSemantic[role].value !== withoutSemantic[role].value) {
          moved.push(
            `${palette.id}.${role}: ${withoutSemantic[role].value} → ${withSemantic[role].value}`,
          );
        }
      }
      if (withSemantic.surfaceSecondary !== withoutSemantic.surfaceSecondary) {
        expect([withSemantic.surfaceSecondaryAuthored, withoutSemantic.surfaceSecondaryAuthored]).toEqual(
          [false, false],
        );
      }
    }
    expect(moved).toEqual([]);
  });

  it('la superficie interior sólo se pinta si el autor la pidió', () => {
    const palette = familyPalettes.find((entry) => entry.id === 'earth-rich')!;
    const theme = themeOf(palette);
    const automatic = resolveReviewColors({ props: {}, semantic: palette.semantic, theme });
    // El contrato la resuelve desde la paleta...
    expect(automatic.surfaceSecondary).toBe(palette.semantic!.secondarySurface);
    // ...pero no se marca como escrita por el autor: el bloque no la pinta.
    expect(automatic.surfaceSecondaryAuthored).toBe(false);

    const authored = resolveReviewColors({
      props: { cardSurface: '#FFF3E0' },
      semantic: palette.semantic,
      theme,
    });
    expect(authored.surfaceSecondary).toBe('#FFF3E0');
    expect(authored.surfaceSecondaryAuthored).toBe(true);

    const fromBlock = resolveReviewColors({
      props: {},
      blockProps: { groupCardSurface: '#FFF3E0' },
      semantic: palette.semantic,
      theme,
    });
    expect(fromBlock.surfaceSecondary).toBe('#FFF3E0');
    expect(fromBlock.surfaceSecondaryAuthored).toBe(true);
  });
});

describe('Reseñas · los tokens semánticos no pisan una elección del autor', () => {
  const page = (extra: Record<string, string>) => ({ palette: 'earth-rich', ...extra });
  const palette = familyPalettes.find((entry) => entry.id === 'earth-rich')!;

  it('sin overrides de página, entrega los 12 tokens', () => {
    const tokens = supportedSemanticTokens(page({}), palette);
    expect(tokens).toEqual(palette.semantic);
  });

  it('descarta el token del rol que el autor ya decidió en la página', () => {
    expect(supportedSemanticTokens(page({ textColor: '#FF0000' }), palette)!.text).toBeUndefined();
    expect(supportedSemanticTokens(page({ mutedColor: '#FF0000' }), palette)!.muted).toBeUndefined();
    expect(supportedSemanticTokens(page({ surfaceColor: '#FF0000' }), palette)!.surface).toBeUndefined();
    expect(supportedSemanticTokens(page({ lineColor: '#FF0000' }), palette)!.line).toBeUndefined();
    // El acento arrastra sus dos alias de CTA.
    const accent = supportedSemanticTokens(page({ accent: '#FF0000' }), palette)!;
    expect(accent.accent).toBeUndefined();
    expect(accent.ctaBackground).toBeUndefined();
    // Y el acento de texto, su alias de icono.
    const accentFg = supportedSemanticTokens(page({ accentFg: '#FF0000' }), palette)!;
    expect(accentFg.accentFg).toBeUndefined();
    expect(accentFg.ctaForeground).toBeUndefined();
    expect(accentFg.iconForeground).toBeUndefined();
    // Lo que no se toca, sigue.
    expect(accentFg.secondarySurface).toBe(palette.semantic!.secondarySurface);
  });

  it('con un tono personalizado no aporta nada: la paleta entera está fuera', () => {
    // Es lo que hace `useThemeTokens`: `bgOverride` reemplaza el tono de página.
    expect(supportedSemanticTokens(page({ bgOverride: '#334455' }), palette)).toBeUndefined();
  });

  it('una página sin paleta tampoco tiene tokens', () => {
    expect(supportedSemanticTokens({ palette: 'no-existe' }, undefined)).toBeUndefined();
  });

  it('`""` es "sin override", que es como el editor limpia un color', () => {
    const tokens = supportedSemanticTokens(page({ textColor: '' }), palette)!;
    expect(tokens.text).toBe(palette.semantic!.text);
  });
});

describe('Reseñas · ámbito CSS de la tarjeta', () => {
  it('emite las mismas variables que ya usan las clases cq-*, resueltas en la tarjeta', () => {
    const scope = resolveReviewColors({
      props: {},
      theme: PLAIN_THEME,
    });
    const style = reviewColorScopeStyle(scope);
    expect(style['--fg']).toBe('#211D19');
    expect(style['--muted']).toBe('#5A5A5A');
    expect(style['--line']).toBe('#DDDDDD');
    expect(style['--accent']).toBe('#B8935A');
    expect(style['--surface']).toBe('#FFFFFF');
    expect(style['background']).toBe('#FFFFFF');
  });

  it('todos los valores son strings: el documento sólo admite strings', () => {
    const scope = resolveReviewColors({
      props: { cardBg: '#101010' },
      theme: PLAIN_THEME,
    });
    for (const value of Object.values(reviewColorScopeStyle(scope))) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('Reseñas · separación y profundidad', () => {
  it('tres escalones, y sólo esos tres: cualquier otra cosa cae al de la casa', () => {
    expect(readReviewShadow('none')).toBe('none');
    expect(readReviewShadow('soft')).toBe('soft');
    expect(readReviewShadow('lifted')).toBe('lifted');
    for (const raw of [undefined, '', 'exagerada', '0', 'SOFT']) {
      expect(readReviewShadow(raw)).toBe('none');
    }
  });

  it('es la MISMA tabla que usa la familia de tarjetas: una sola fuente de verdad', () => {
    expect(reviewShadowStyle('soft')['boxShadow']).toBe(CARD_SHADOWS['soft']);
    expect(reviewShadowStyle('lifted')['boxShadow']).toBe(CARD_SHADOWS['lifted']);
    expect(reviewShadowStyle('none')['boxShadow']).toBe('none');
  });

  it('el defecto no mueve ninguna página publicada: sin sombra, relleno 20px, borde sí', () => {
    // Los tres coinciden con lo que la tarjeta ya renderizaba antes del cambio.
    expect(readReviewShadow(undefined)).toBe('none');
    expect(reviewPadding(readReviewSpacing(undefined))).toBe(20);
    expect(readReviewBorder(undefined)).toBe(true);
    // Y los escalones son los del contrato de tarjeta, no unos propios.
    expect(reviewPadding('S')).toBe(CARD_PADDING['S']);
    expect(reviewPadding('M')).toBe(CARD_PADDING['M']);
    expect(reviewPadding('L')).toBe(CARD_PADDING['L']);
    expect(readReviewBorder('off')).toBe(false);
    expect(readReviewSpacing('XL')).toBe('M');
  });
});

describe('Reseñas · aritmética de contraste', () => {
  it('elige el extremo MEDIDO, no el que adivinaría un umbral', () => {
    for (const surface of ['#FFFFFF', '#111111', '#767676', '#D83A3A', '#F5A4A0', '#1F2A44']) {
      const chosen = readableExtreme(surface);
      const other = chosen === REVIEW_INK ? REVIEW_PAPER : REVIEW_INK;
      expect(
        contrastRatio(chosen, surface)!,
        `${surface} eligió ${chosen}`,
      ).toBeGreaterThanOrEqual(contrastRatio(other, surface)!);
      expect([REVIEW_INK, REVIEW_PAPER]).toContain(chosen);
    }
  });

  it('accessibleOn deja intacto lo que ya cumple', () => {
    const token = accessibleOn('#FFFFFF', '#111111', TEXT_MIN_RATIO);
    expect(token.value).toBe('#111111');
    expect(token.enforced).toBe(false);
  });

  it('accessibleOn empuja hasta cumplir, conservando el tono cuando puede', () => {
    const token = accessibleOn('#FFFFFF', '#F0F0F0', TEXT_MIN_RATIO);
    expect(token.enforced).toBe(true);
    expect(token.contrast!).toBeGreaterThanOrEqual(TEXT_MIN_RATIO);
    // Sigue siendo un gris: no salta a negro puro.
    expect(token.value.toLowerCase()).not.toBe('#000000');
  });

  it('accessibleOn no inventa un color para un valor no medible', () => {
    const token = accessibleOn('color-mix(in srgb, red 10%, white)', '#111111', TEXT_MIN_RATIO);
    expect(token.value).toBe('#111111');
    expect(token.contrast).toBeNull();
    expect(token.enforced).toBe(false);
  });

  it('mixHex es determinista y no muta los extremos', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixHex('no-es-hex', '#FFFFFF', 0.5)).toBe('no-es-hex');
  });

  it('un override de tarjeta que rompe el contraste se conserva y se mide', () => {
    const props: ReviewColorProps = { cardBg: '#FFFFFF', cardMuted: '#F2F2F2' };
    const scope = resolveReviewColors({
      props,
      theme: {
        surface: '#111111',
        fg: '#FFFFFF',
        muted: '#DDDDDD',
        line: '#444444',
        accent: '#B8935A',
        accentFg: '#111111',
      },
    });
    expect(scope.text.value).toBe('#F2F2F2');
    expect(scope.text.contrast!).toBeLessThan(TEXT_MIN_RATIO);
  });
});
