import { normalizeDestination } from './buttonGroup';

/**
 * The shared primitive behind the `cta`, `whatsapp` and `contact` blocks (L2.5).
 *
 * They are three block types in the target's data model and three rows in the
 * matrix, but their anatomy is one thing: a panel, an optional heading, an
 * optional subtitle, optional labelled rows, and one action. So there is one
 * implementation, and the thin differences live in the per-type defaults.
 *
 * The split this module exists to enforce:
 *
 *   · ACTION (semantics)     — where the block sends the visitor. A real `href`
 *                              built and validated by the project's own
 *                              `normalizeDestination`, plus the new-tab flag.
 *   · PANEL  (presentation)  — how the block looks. A surface, and nothing else.
 *
 * Neither constrains the other: a WhatsApp action reads identically on a bare,
 * panel or accent surface, so "which destination" and "how it is painted" can be
 * changed independently.
 */

export type PanelSurface = 'plain' | 'surface' | 'accent';

export const PANEL_SURFACES: { value: PanelSurface; label: string; hint: string }[] = [
  { value: 'plain', label: 'Suelto', hint: 'Sin panel: el contenido va directo sobre la página.' },
  { value: 'surface', label: 'Panel', hint: 'Una superficie con borde alrededor del contenido.' },
  { value: 'accent', label: 'Acento', hint: 'Un bloque pintado con el color de acento de la página.' },
];

/**
 * `fallback` carries the block type's own default, because the three types do
 * not look alike in the target: `contact` has no panel, `whatsapp` sits on a
 * surface and `cta` is painted in the accent. An unknown stored value keeps that
 * default, so a corrupted prop cannot restyle a published page.
 */
export function resolvePanelSurface(
  raw: string | undefined,
  fallback: PanelSurface = 'surface'
): PanelSurface {
  return raw === 'plain' || raw === 'surface' || raw === 'accent' ? raw : fallback;
}

export type ActionKind = 'web' | 'whatsapp' | 'email' | 'phone';

export const ACTION_KINDS: { value: ActionKind; label: string; prefix: string }[] = [
  { value: 'web', label: 'Web', prefix: 'https://' },
  { value: 'whatsapp', label: 'WhatsApp', prefix: 'https://wa.me/' },
  { value: 'email', label: 'Email', prefix: 'mailto:' },
  { value: 'phone', label: 'Teléfono', prefix: 'tel:' },
];

/** Reads the kind back off a stored destination, so the picker shows the truth. */
export function actionKindOf(href: string | undefined): ActionKind {
  const value = (href ?? '').trim();
  if (/^mailto:/i.test(value)) return 'email';
  if (/^tel:/i.test(value)) return 'phone';
  if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(value)) return 'whatsapp';
  return 'web';
}

/**
 * The destination the block will actually link to.
 *
 * Delegates to `normalizeDestination` — the same validator the link editor and
 * the button groups already use — so "destinos válidos" has one definition in
 * this codebase rather than a second one here. An unusable destination yields an
 * empty string, which makes the anchor render without an `href` instead of
 * pointing somewhere broken.
 */
export function actionHref(raw: string | undefined): string {
  const destination = normalizeDestination(raw ?? '');
  return destination.valid ? destination.href : '';
}

/** Whether a stored destination can be linked to, for the editor's status line. */
export function actionIsValid(raw: string | undefined): boolean {
  return normalizeDestination(raw ?? '').valid;
}

/** Seed destination for a brand-new block of each type, so it never ships dead. */
export const ACTION_SEEDS: Record<ActionKind, string> = {
  web: 'https://',
  whatsapp: 'https://wa.me/34600000000',
  email: 'mailto:hola@tudominio.com',
  phone: 'tel:+34600000000',
};
