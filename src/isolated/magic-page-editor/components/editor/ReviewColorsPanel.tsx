import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { reviewColorScopeFor, useReviewColorSource } from '../../hooks/useReviewColors';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { SwatchRow } from './controls/SwatchRow';
import { Toggle } from './controls/Toggle';
import { cx } from '../../utils/cx';
import {
  PERCEPTIBLE_MIN_RATIO,
  TEXT_MIN_RATIO,
  readReviewBorder,
  readReviewShadow,
  readReviewSpacing,
  reviewPadding,
  type ReviewColorProps,
  type ReviewColorScope,
  type ReviewToken,
} from '../../utils/reviewColors';
import { useThemeTokens } from '../../hooks/useThemeTokens';

/**
 * El panel de color de una tarjeta de reseña.
 *
 * Existe como componente propio, y no como JSX suelto en `useSelectionActions`,
 * por una razón concreta: el panel y la tarjeta tienen que medir con la MISMA
 * entrada. Si el panel resolviera los colores por su cuenta, el ratio que
 * muestra no sería el que se ve en la tarjeta — que es justo el defecto del
 * informe llevado al panel. Por eso comparte `useReviewColorSource` y
 * `reviewColorScopeFor` con `ReviewsBlock`.
 *
 * El mismo componente sirve para los dos ámbitos que el contrato distingue:
 *
 *  · `scope="element"` → escribe overrides de ESTA reseña (`nameColor`, `cardBg`…).
 *  · `scope="block"`   → escribe los defaults de todo el bloque, con los nombres
 *    de grupo del contrato (`groupCardText`, `groupCardBg`…), los mismos que
 *    resuelve `resolveCard` para la familia de tarjetas.
 *
 * Lo que el panel NO hace: corregir un color que el autor eligió. Lo mide y lo
 * dice —con el número y con el techo alcanzable cuando el fondo no da para
 * más—, pero la decisión es de quien escribe.
 */

type ReviewColorRole =
  | 'surface'
  | 'surfaceSecondary'
  | 'name'
  | 'text'
  | 'stars'
  | 'line'
  | 'avatarBg'
  | 'avatarFg';

interface ColorRow {
  /** Clave en el ámbito del elemento (`doc.props[review.id]`). */
  elementKey: keyof ReviewColorProps;
  /** Clave del default de bloque (contrato de grupo). */
  groupKey: keyof ReviewColorProps;
  label: string;
  hint: string;
  /** El rol resuelto que se mide y se muestra. */
  role: ReviewColorRole;
  /** Umbral exigido, o `null` para un rol decorativo (se mide, no se exige). */
  minRatio: number | null;
}

const ROWS: ColorRow[] = [
  {
    elementKey: 'cardBg',
    groupKey: 'groupCardBg',
    label: 'Fondo de la tarjeta',
    hint: 'Todo se mide contra este fondo.',
    role: 'surface',
    minRatio: null,
  },
  {
    elementKey: 'cardSurface',
    groupKey: 'groupCardSurface',
    label: 'Superficie secundaria',
    hint: 'Banda interior del testimonio. Sólo se pinta si la eliges.',
    role: 'surfaceSecondary',
    minRatio: null,
  },
  {
    elementKey: 'nameColor',
    groupKey: 'groupCardText',
    label: 'Nombre del cliente',
    hint: 'Texto normal: WCAG AA 4.5:1.',
    role: 'name',
    minRatio: TEXT_MIN_RATIO,
  },
  {
    elementKey: 'textColor',
    groupKey: 'groupCardMuted',
    label: 'Texto del testimonio',
    hint: 'Texto normal: WCAG AA 4.5:1.',
    role: 'text',
    minRatio: TEXT_MIN_RATIO,
  },
  {
    elementKey: 'starsColor',
    groupKey: 'groupCardAccent',
    label: 'Estrellas de valoración',
    hint: 'Debe verse sobre el fondo; la forma marca la diferencia.',
    role: 'stars',
    minRatio: PERCEPTIBLE_MIN_RATIO,
  },
  {
    elementKey: 'cardLine',
    groupKey: 'groupCardLine',
    label: 'Bordes',
    hint: 'Decorativo: se mide y se muestra, no se corrige.',
    role: 'line',
    minRatio: null,
  },
  {
    elementKey: 'avatarColor',
    groupKey: 'groupCardIconBg',
    label: 'Avatar o imagen',
    hint: 'Fondo del chip de iniciales.',
    role: 'avatarBg',
    minRatio: PERCEPTIBLE_MIN_RATIO,
  },
  {
    elementKey: 'cardIconColor',
    groupKey: 'groupCardIconColor',
    label: 'Iniciales del avatar',
    hint: 'Se miden contra el chip, no contra la tarjeta: AA 4.5:1.',
    role: 'avatarFg',
    minRatio: TEXT_MIN_RATIO,
  },
];

function tokenOf(scope: ReviewColorScope, role: ReviewColorRole): ReviewToken {
  if (role === 'surface') return { value: scope.surface, contrast: null, enforced: false };
  if (role === 'surfaceSecondary')
    return { value: scope.surfaceSecondary, contrast: null, enforced: false };
  return scope[role];
}

/**
 * La lectura honesta del ratio.
 *
 * Cuando un color elegido a mano no llega al umbral, el panel no lo esconde ni
 * lo "arregla": lo declara con su número. No se añade un "techo del fondo",
 * porque no existe: con negro y blanco en la paleta el mejor ratio posible
 * nunca baja de 4.58:1 para cualquier fondo, así que el umbral SIEMPRE es
 * alcanzable y el fondo nunca es la excusa. Un gris por debajo de AA es una
 * decisión, no una limitación, y el panel lo dice así.
 */
function RatioReadout({ token, minRatio }: { token: ReviewToken; minRatio: number | null }) {
  if (token.contrast === null) {
    return <span className="text-[11px] text-mute">sin medir</span>;
  }
  const ratio = `${token.contrast.toFixed(2)}:1`;
  if (minRatio === null) {
    return <span className="text-[11px] text-mute">{ratio}</span>;
  }
  if (token.contrast >= minRatio) {
    return <span className="text-[11px] font-medium text-[#1F7A45]">{ratio} · AA</span>;
  }
  return (
    <span className="text-[11px] font-medium text-[#B45309]" data-contrast-warning="">
      {ratio} · por debajo de AA
    </span>
  );
}

interface ReviewColorsPanelProps {
  /** El ámbito donde se escribe: `doc.props[propId]`. */
  propId: string;
  /** `element` escribe overrides de esta tarjeta; `block`, los defaults del bloque. */
  scope: 'element' | 'block';
  /** Props del elemento seleccionado (vacío en el ámbito de bloque). */
  elementProps: ReviewColorProps;
  /** Defaults del bloque, con los nombres de grupo del contrato. */
  groupProps: ReviewColorProps;
}

export function ReviewColorsPanel({ propId, scope, elementProps, groupProps }: ReviewColorsPanelProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const source = useReviewColorSource();
  const resolved = reviewColorScopeFor(source, elementProps, groupProps);
  /**
   * Una sola función de escritura porque el ámbito decide el NOMBRE, no el
   * valor: el elemento escribe `nameColor` / `cardBg`, y el bloque escribe el
   * default de grupo del contrato (`groupCardText` / `groupCardBg`), que es la
   * prop que `resolveCard` mapea a la tarjeta.
   */
  const write = (row: ColorRow, value: string | undefined) => {
    const key = scope === 'element' ? row.elementKey : row.groupKey;
    ed.setProp(propId, key as string, value ?? '');
  };
  /** Geometría y profundidad: mismas claves `spacing`/`shadow`/`border` del contrato. */
  const geo = (itemKey: GeoKey) =>
    scope === 'element'
      ? elementProps[GEO_KEYS[itemKey].element as keyof ReviewColorProps]
      : groupProps[GEO_KEYS[itemKey].block as keyof ReviewColorProps];
  /** Lo que el autor escribió en ESTE ámbito; `''`/ausente = heredado. */
  const authored = (row: ColorRow) =>
    scope === 'element' ? elementProps[row.elementKey] : groupProps[row.groupKey];

  const spacing = readReviewSpacing(geo('spacing'));
  const shadow = readReviewShadow(geo('shadow'));
  const bordered = readReviewBorder(geo('border'));

  return (
    <div className="space-y-4" data-testid="review-colors-panel" data-scope={scope}>
      <PanelSection
        title="Colores de la reseña"
        hint={
          scope === 'element'
            ? 'Vacío = automático: hereda la paleta de la página. Un color elegido se respeta tal cual, y aquí ves su contraste real.'
            : 'Valores por defecto de todas las reseñas del bloque. Vacío = automático (paleta de la página).'
        }>
        <div className="space-y-4">
          {ROWS.map((row) => {
            const token = tokenOf(resolved, row.role);
            return (
              <div key={row.elementKey} className="space-y-1.5" data-testid={`review-color-row-${row.role}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-mute">{row.label}</span>
                  <RatioReadout token={token} minRatio={row.minRatio} />
                </div>
                <SwatchRow
                  colors={t.swatches}
                  value={authored(row)}
                  onChange={(value) => write(row, value)}
                />
                <span className="block text-[11px] leading-snug text-mute">{row.hint}</span>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection
        title="Separación y profundidad"
        hint="Los mismos escalones que la familia de tarjetas: nada nuevo que aprender y nada que el renderer ignore.">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-[11.5px] font-medium text-mute">Relleno interior</span>
            <Segmented
              ariaLabel="Relleno de la reseña"
              options={[
                { value: 'S', label: 'Compacto' },
                { value: 'M', label: 'Medio' },
                { value: 'L', label: 'Amplio' },
              ]}
              value={spacing}
              onChange={(value) => ed.setProp(propId, 'spacing', value)}
            />
            <span className="mt-1 block text-[11px] text-mute">{reviewPadding(spacing)} px</span>
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-medium text-mute">Profundidad</span>
            <Segmented
              ariaLabel="Profundidad de la reseña"
              options={[
                { value: 'none', label: 'Sin sombra' },
                { value: 'soft', label: 'Suave' },
                { value: 'lifted', label: 'Elevada' },
              ]}
              value={shadow}
              onChange={(value) => ed.setProp(propId, 'shadow', value)}
            />
          </div>
          <Toggle
            label="Borde"
            checked={bordered}
            onChange={(value) => ed.setProp(propId, 'border', value ? 'on' : 'off')}
          />
        </div>
      </PanelSection>

      <PanelSection title="Restablecer">
        <button
          type="button"
          onClick={() => {
            for (const row of ROWS) write(row, '');
            for (const itemKey of Object.keys(GEO_KEYS) as GeoKey[]) {
              ed.setProp(
                propId,
                scope === 'element' ? GEO_KEYS[itemKey].element : GEO_KEYS[itemKey].block,
                '',
              );
            }
          }}
          className={cx(
            'inline-flex h-10 w-full items-center justify-center rounded-xl border border-line bg-white px-3 text-[12.5px] font-medium text-ink',
            'transition-colors duration-150 hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1',
          )}>
          Volver a la paleta de la página
        </button>
        {scope === 'element' && (
          <p className="mt-2 text-[11px] leading-snug text-mute">
            El contorno de selección lo dibuja el editor por fuera de la tarjeta, así que un fondo
            oscuro no lo tapa: la reseña seleccionada sigue distinguiéndose.
          </p>
        )}
      </PanelSection>
    </div>
  );
}

/** Geometría y profundidad: mismas claves `spacing`/`shadow`/`border`, por ámbito. */
const GEO_KEYS = {
  spacing: { element: 'spacing', block: 'groupCardSpacing' },
  shadow: { element: 'shadow', block: 'groupCardShadow' },
  border: { element: 'border', block: 'groupCardBorder' },
} as const;

type GeoKey = keyof typeof GEO_KEYS;
