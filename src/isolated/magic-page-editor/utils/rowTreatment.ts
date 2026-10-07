/**
 * How a list-shaped block draws each row (L2.3).
 *
 * This is the semantic behind Magic Patterns' `cardStyle: 'line'`: not "a border
 * turned on", but a different *structure* — a list of entries separated by
 * hairlines, with no per-item surface, versus discrete raised surfaces.
 *
 * Deliberately a shared vocabulary rather than a flag on one block, so the
 * blocks that need it later (`reviews`, `social`) adopt the same key and the same
 * two meanings instead of inventing a second, incompatible way to say it.
 *
 * Stored as a plain string prop on the block scope, so it persists with no
 * schema change:
 *   - `block:<blockKey>` → { rowTreatment?: 'surface' | 'rule' }
 */
export type RowTreatment = 'surface' | 'rule';

export const ROW_TREATMENTS: { value: RowTreatment; label: string; hint: string }[] = [
  {
    value: 'surface',
    label: 'Tarjetas',
    hint: 'Cada fila es una superficie con fondo, borde y esquinas.',
  },
  {
    value: 'rule',
    label: 'Lista con filetes',
    hint: 'Sin superficie: las filas se separan con líneas finas.',
  },
];

/**
 * Absent or unrecognised resolves to `surface`, which is what every existing
 * block already renders — so a page that never sets this cannot change.
 */
export function resolveRowTreatment(raw: string | undefined): RowTreatment {
  return raw === 'rule' ? 'rule' : 'surface';
}
