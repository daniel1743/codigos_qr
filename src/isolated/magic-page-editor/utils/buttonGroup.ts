import type { PageDoc, TemplateId, TextAlign } from '../types/editor';
import { bioLinks, singleButtonSeed } from '../data/bioContent';

export const BUTTON_GROUP_ORDER = 'buttonGroupOrder';
export const BUTTON_GROUP_VERSION = 'buttonGroupVersion';
export const BUTTON_GROUP_VERSION_VALUE = '1';
/**
 * Explicit marker meaning "this group was already materialised by the editor".
 * It is the ONLY way to tell an intentionally empty group (the user deleted the
 * last button) apart from a legacy block that never had a canonical order.
 * Without it, an empty `buttonGroupOrder` would resurrect the legacy seeds.
 */
export const BUTTON_GROUP_INITIALIZED = 'buttonGroupInitialized';
export const BUTTON_GROUP_INITIALIZED_VALUE = '1';
/** Preset currently applied to the group style (surfaced so the control can show its state). */
export const BUTTON_GROUP_PRESET = 'groupCardCtaPreset';

export interface LegacyButtonSeed {
  label: string;
  sub?: string | undefined;
  href: string;
  icon?: string | undefined;
}

export interface ButtonGroupItem {
  stableId: string;
  scope: string;
  legacyIndex?: number | undefined;
  label: string;
  sub?: string | undefined;
  href: string;
  icon?: string | undefined;
  iconPosition?: string | undefined;
  isPrimary?: string | undefined;
  props: Record<string, string>;
}

export interface ButtonGroupModel {
  blockKey: string;
  scope: string;
  order: string[];
  items: ButtonGroupItem[];
  groupProps: Record<string, string>;
  canonical: boolean;
}

function itemScope(blockKey: string, stableId: string) {
  return `${blockKey}.${stableId}`;
}

function legacyItem(doc: PageDoc, index: number, seed: LegacyButtonSeed, blockKey: string): ButtonGroupItem {
  const scope = `${blockKey}.${index}`;
  const props = doc.props[scope] ?? {};
  return {
    stableId: `legacy-${index}`,
    scope,
    legacyIndex: index,
    label: doc.texts[`${scope}.label`] ?? seed.label,
    sub: doc.texts[`${scope}.sub`] ?? seed.sub,
    href: props['href'] ?? seed.href,
    icon: props['icon'] ?? seed.icon,
    iconPosition: props['iconPosition'],
    isPrimary: props['isPrimary'],
    props,
  };
}

/** Reads canonical ButtonGroup props when present and otherwise adapts legacy links.N. */
export function readButtonGroup(doc: PageDoc, blockKey: string, seeds: LegacyButtonSeed[]): ButtonGroupModel {
  const groupScope = `block:${blockKey}`;
  const groupProps = doc.props[groupScope] ?? {};
  const order = (groupProps[BUTTON_GROUP_ORDER] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  /* An initialized-but-empty group is a valid state: the user deleted every button. */
  const initialized = groupProps[BUTTON_GROUP_INITIALIZED] === BUTTON_GROUP_INITIALIZED_VALUE;
  if (order.length === 0) {
    const items = initialized ? [] : seeds.map((seed, index) => legacyItem(doc, index, seed, blockKey));
    return { blockKey, scope: groupScope, order: items.map((item) => item.stableId), items, groupProps, canonical: initialized };
  }

  const items = order.map((stableId) => {
    const scope = itemScope(blockKey, stableId);
    const props = doc.props[scope] ?? {};
    return {
      stableId,
      scope,
      label: props['label'] ?? 'Nuevo botón',
      sub: props['sub'],
      href: props['href'] ?? 'https://',
      icon: props['icon'],
      iconPosition: props['iconPosition'],
      isPrimary: props['isPrimary'],
      props,
    };
  });
  return { blockKey, scope: groupScope, order, items, groupProps, canonical: true };
}

/** Converts the current in-memory view to the canonical contract without deleting legacy props. */
export function ensureCanonicalButtonGroup(doc: PageDoc, model: ButtonGroupModel): PageDoc {
  if (model.canonical) return doc;
  const props = { ...doc.props, [model.scope]: { ...model.groupProps, [BUTTON_GROUP_VERSION]: BUTTON_GROUP_VERSION_VALUE, [BUTTON_GROUP_INITIALIZED]: BUTTON_GROUP_INITIALIZED_VALUE, [BUTTON_GROUP_ORDER]: model.order.join(',') } };
  const texts = { ...doc.texts };
  /* Per-line styles (alignment, size, colour) travel with the item, exactly like labels and hrefs. */
  const textStyles = { ...doc.textStyles };
  model.items.forEach((item) => {
    const scope = itemScope(model.blockKey, item.stableId);
    props[scope] = { ...item.props, label: item.label, href: item.href, ...(item.sub !== undefined ? { sub: item.sub } : {}), ...(item.icon ? { icon: item.icon } : {}) };
    texts[`${scope}.label`] = item.label;
    if (item.sub !== undefined) texts[`${scope}.sub`] = item.sub;
    (['label', 'sub'] as const).forEach((line) => {
      const legacy = doc.textStyles[`${item.scope}.${line}`];
      if (legacy) textStyles[`${scope}.${line}`] = { ...textStyles[`${scope}.${line}`], ...legacy };
    });
  });
  return { ...doc, props, texts, textStyles };
}

export function nextButtonId(model: ButtonGroupModel): string {
  let n = model.items.length + 1;
  let id = `btn_${n}`;
  while (model.order.includes(id)) id = `btn_${++n}`;
  return id;
}

export function canonicalScope(blockKey: string, stableId: string) {
  return itemScope(blockKey, stableId);
}

function normalizeIconSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasSemanticKeyword(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => {
    const normalized = normalizeIconSearchText(keyword);
    return normalized.includes(' ')
      ? value.includes(normalized)
      : new RegExp(`(^|[^a-z0-9])${normalized}([^a-z0-9]|$)`).test(value);
  });
}

/**
 * Suggests a visual icon without persisting or overriding a manual choice.
 * `context` is intentionally optional so legacy callers remain unchanged;
 * templates can pass a profession/role when it is available.
 */
export function suggestButtonIcon(href: string, label: string, context = ''): string | undefined {
  const value = normalizeIconSearchText(`${href} ${label} ${context}`);
  
  // Redes
  if (value.includes('wa.me') || value.includes('whatsapp')) return 'whatsapp';
  if (value.includes('instagram') || (value.includes('@') && !value.includes('.com'))) return 'instagram';
  if (value.includes('facebook') || value.includes(' fb') || value.includes('fb.com')) return 'facebook';
  if (value.includes('tiktok') || value.includes('tik tok')) return 'tiktok';
  if (value.includes('youtube') || value.includes('youtu.be')) return 'youtube';
  
  // Contacto & Servicios
  if (value.includes('mailto:') || value.includes('correo') || value.includes('email')) return 'mail';
  if (value.includes('tel:') || value.includes('llamar') || value.includes('teléfono') || value.includes('telefono')) return 'phone';
  if (value.includes('escribir') || value.includes('escríbe') || value.includes('escribe')) return 'write';
  if (hasSemanticKeyword(value, ['carpintería', 'madera', 'ebanista'])) return 'carpentry';
  if (hasSemanticKeyword(value, ['albañil', 'construcción', 'obra', 'obrero', 'fontanero', 'plomero', 'pintor', 'reformas', 'servicio', 'reparación'])) return 'services';
  if (hasSemanticKeyword(value, ['casa', 'hogar', 'vivienda', 'interiorismo', 'arquitectura'])) return 'home';
  if (hasSemanticKeyword(value, ['arquitecto', 'ingeniero', 'abogado', 'asesor', 'consultor', 'contador', 'empresa', 'negocio'])) return 'business';
  if (hasSemanticKeyword(value, ['fotógrafo', 'fotógrafa', 'fotografía', 'fotógrafo', 'cámara', 'video', 'vídeo'])) return 'camera';
  if (hasSemanticKeyword(value, ['médico', 'doctor', 'enfermero', 'clínica', 'salud', 'dentista', 'nutricionista'])) return 'health';
  if (hasSemanticKeyword(value, ['profesor', 'maestro', 'docente', 'curso', 'clase', 'academia'])) return 'book';
  if (hasSemanticKeyword(value, ['chef', 'cocinero', 'restaurante', 'panadero', 'repostería', 'comida'])) return 'food';
  if (hasSemanticKeyword(value, ['veterinario', 'mascota', 'perro', 'gato'])) return 'pets';
  if (hasSemanticKeyword(value, ['peluquería', 'estética', 'belleza', 'manicura', 'spa'])) return 'sparkles';
  if (hasSemanticKeyword(value, ['viajes', 'turismo', 'hotel', 'guía', 'rutas'])) return 'location';
  if (hasSemanticKeyword(value, ['tienda', 'venta', 'productos', 'ropa', 'comercio'])) return 'shopping';
  
  // Ubicación, Citas & Acción
  if (value.includes('maps.google') || value.includes('google.com/maps') || value.includes('ubicación') || value.includes('ubicacion') || value.includes('dirección') || value.includes('direccion')) return 'location';
  if (value.includes('reservar') || value.includes('reserva') || value.includes('agenda') || value.includes('booking')) return 'calendar';
  if (value.includes('visitar') || value.includes('ver ') || value.includes('conoce')) return 'eye';
  if (value.includes('http') && !value.includes('wa.me') && !value.includes('instagram') && !value.includes('facebook') && !value.includes('youtube') && !value.includes('tiktok')) return 'external';
  return undefined;
}

/* ------------------------------------------------------------------ */
/* UX recovery helpers (identity, text scope, destination feedback)    */
/*                                                                     */
/* These are pure read helpers: they never change the persisted format. */
/* ------------------------------------------------------------------ */

/** Legacy seeds store `chat` for WhatsApp; the icon library calls it `whatsapp`. */
export function normalizeButtonIcon(icon: string | undefined): string | undefined {
  if (icon === 'chat') return 'whatsapp';
  return icon;
}

export interface ButtonIdentity {
  /** 1-based position inside the current order. */
  position: number;
  total: number;
  label: string;
  /** "Botón 2 de 4 · Guía: Costa Brava" */
  identity: string;
  stableId?: string | undefined;
}

/** Identity of one button, derived from the live order so it survives reorder/rename/add/delete. */
export function buttonIdentity(model: ButtonGroupModel, stableIdOrScope: string): ButtonIdentity {
  const index = model.items.findIndex(
    (item) => item.stableId === stableIdOrScope || item.scope === stableIdOrScope,
  );
  const total = model.items.length;
  const item = index >= 0 ? model.items[index] : undefined;
  const label = (item?.label ?? 'Botón').trim() || 'Botón';
  const position = index >= 0 ? index + 1 : 0;
  return {
    position,
    total,
    label,
    identity: position > 0 ? `Botón ${position} de ${total} · ${label}` : label,
    stableId: item?.stableId,
  };
}

/** Identity of the whole collection: "Grupo de botones · 4 elementos". */
export function buttonGroupIdentity(total: number): string {
  return `Grupo de botones · ${total} ${total === 1 ? 'elemento' : 'elementos'}`;
}

/** textStyles key of a button line. Uses the existing PageDoc.textStyles map. */
export function buttonTextStyleId(scope: string, line: 'label' | 'sub'): string {
  return `${scope}.${line}`;
}

/** Common text alignment of every button line, or '' when the group is mixed. */
export function commonButtonTextAlign(doc: PageDoc, model: ButtonGroupModel): TextAlign | '' {
  const values = model.items.map((item) => doc.textStyles[buttonTextStyleId(item.scope, 'label')]?.align ?? 'left');
  if (values.length === 0) return '';
  return values.every((value) => value === values[0]) ? values[0]! : '';
}

export type DestinationType = 'web' | 'whatsapp' | 'email' | 'phone' | 'anchor' | 'empty';

export interface DestinationInfo {
  /** Normalised destination that is safe to persist. */
  href: string;
  type: DestinationType;
  valid: boolean;
  message: string;
  /** Short human summary used by the roster ("marinasole.com/guia"). */
  summary: string;
}

const DOMAIN_LIKE = /^[\w-]+(\.[\w-]+)+(\/[^\s]*)?$/;
const ANCHOR_LIKE = /^#[^\s]+$/;

function summarizeWeb(href: string): string {
  return href.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Validates and safely normalises a button destination.
 * Supported: https/http, mailto:, tel:, wa.me / whatsapp, instagram, youtube, maps and bare domains.
 */
export function normalizeDestination(raw: string): DestinationInfo {
  const value = (raw ?? '').trim();
  if (!value) {
    return { href: '', type: 'empty', valid: false, message: 'Escribe un destino para este botón.', summary: 'Sin destino' };
  }
  if (/\s/.test(value)) {
    return { href: value, type: 'web', valid: false, message: 'La dirección no puede contener espacios.', summary: value };
  }
  if (ANCHOR_LIKE.test(value)) {
    return { href: value, type: 'anchor', valid: true, message: 'Enlace interno de la página.', summary: value };
  }
  if (/^mailto:/i.test(value)) {
    const address = value.slice('mailto:'.length);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
    return {
      href: value,
      type: 'email',
      valid,
      message: valid ? 'Se abrirá el correo del visitante.' : 'Falta un correo válido después de mailto:',
      summary: valid ? address : 'Correo incompleto',
    };
  }
  if (/^tel:/i.test(value)) {
    const digits = value.slice('tel:'.length).replace(/[^\d+]/g, '');
    const valid = digits.replace(/\D/g, '').length >= 6;
    return {
      href: `tel:${digits}`,
      type: 'phone',
      valid,
      message: valid ? 'Se iniciará una llamada.' : 'Falta un número de teléfono después de tel:',
      summary: valid ? digits : 'Teléfono incompleto',
    };
  }
  const lower = value.toLowerCase();
  if (lower === 'https://' || lower === 'http://' || lower === 'https:/' || lower === 'http:/') {
    return { href: value, type: 'web', valid: false, message: 'Falta el dominio (por ejemplo miweb.com).', summary: 'Dominio incompleto' };
  }
  if (lower.startsWith('wa.me/') || lower.startsWith('api.whatsapp.com/') || lower.startsWith('whatsapp:')) {
    const digits = lower
      .replace(/^whatsapp:/, '')
      .replace(/^(https?:\/\/)?(api\.)?(wa\.me|whatsapp\.com)\//, '');
    const valid = digits.replace(/\D/g, '').length >= 6;
    return {
      href: `https://wa.me/${digits}`,
      type: 'whatsapp',
      valid,
      message: valid ? 'Abrirá WhatsApp con este número.' : 'Falta el número después de wa.me/',
      summary: `wa.me/${digits}`,
    };
  }
  if (
    lower.startsWith('instagram.com/') ||
    lower.startsWith('youtube.com/') ||
    lower.startsWith('youtu.be/') ||
    lower.startsWith('maps.google.') ||
    lower.startsWith('google.com/maps')
  ) {
    const href = `https://${value}`;
    return { href, type: 'web', valid: true, message: 'Destino válido.', summary: summarizeWeb(href) };
  }
  if (/^https?:\/\//i.test(value)) {
    const valid = DOMAIN_LIKE.test(value.replace(/^https?:\/\//i, ''));
    return {
      href: value,
      type: 'web',
      valid,
      message: valid ? 'Destino válido.' : 'Revisa el dominio: parece incompleto.',
      summary: summarizeWeb(value),
    };
  }
  if (DOMAIN_LIKE.test(value)) {
    return {
      href: `https://${value}`,
      type: 'web',
      valid: true,
      message: 'Destino válido (hemos añadido https://).',
      summary: value.replace(/\/$/, ''),
    };
  }
  return {
    href: value,
    type: 'web',
    valid: false,
    message: 'No parece una dirección válida. Prueba: https://miweb.com, wa.me/34600111222, mailto:hola@miweb.com',
    summary: value,
  };
}

/** Short destination summary for roster rows and panel headers. */
export function destinationSummary(raw: string | undefined): string {
  return normalizeDestination(raw ?? '').summary;
}

/** Default seed labels used when a links block has no persisted items yet. */
const GENERIC_BUTTON_SEEDS: LegacyButtonSeed[] = [
  { label: 'Nuevo enlace', href: 'https://' },
  { label: 'Otro enlace', href: 'https://' },
];

/**
 * Seeds of the collection for a given template. The bio page has curated seeds;
 * every other template falls back to the generic pair used by GenericBlock.
 */
export function buttonSeedsForTemplate(templateId: TemplateId): LegacyButtonSeed[] {
  return templateId === 'bio' ? bioLinks : GENERIC_BUTTON_SEEDS;
}

export interface ButtonCollectionRef {
  blockKey: string;
  seeds: LegacyButtonSeed[];
}

/** Resolves the links collection that owns a block, if the block is a links block. */
export function buttonCollectionFor(
  doc: PageDoc,
  templateId: TemplateId,
  blockKey: string | undefined,
): ButtonCollectionRef | undefined {
  if (!blockKey) return undefined;
  const block = doc.blocks.find((entry) => entry.key === blockKey && (entry.type === 'links' || entry.type === 'button'));
  if (!block) return undefined;
  return { blockKey: block.key, seeds: block.type === 'button' ? singleButtonSeed : buttonSeedsForTemplate(templateId) };
}



