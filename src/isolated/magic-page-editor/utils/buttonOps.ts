import type { PageDoc } from '../types/editor';
import {
  BUTTON_GROUP_ORDER,
  canonicalScope,
  ensureCanonicalButtonGroup,
  nextButtonId,
  readButtonGroup,
  type ButtonGroupModel,
  type LegacyButtonSeed } from
'./buttonGroup';

export interface ButtonCollection {
  blockKey: string;
  seeds: LegacyButtonSeed[];
}

function canonicalOf(doc: PageDoc, collection: ButtonCollection): PageDoc {
  return ensureCanonicalButtonGroup(doc, readButtonGroup(doc, collection.blockKey, collection.seeds));
}

function withOrder(doc: PageDoc, blockKey: string, order: string[]): PageDoc {
  const id = `block:${blockKey}`;
  return { ...doc, props: { ...doc.props, [id]: { ...doc.props[id], [BUTTON_GROUP_ORDER]: order.join(',') } } };
}

/**
 * Button collection operations, mirroring utils/cardOps: pure, single-step and undoable.
 * They read the same canonical contract as the renderer, so no persisted format changes.
 */
export function addButton(doc: PageDoc, collection: ButtonCollection, label = 'Nuevo botón'): PageDoc {
  const canonical = canonicalOf(doc, collection);
  const model = readButtonGroup(canonical, collection.blockKey, collection.seeds);
  const stableId = nextButtonId(model);
  const scope = canonicalScope(collection.blockKey, stableId);
  return {
    ...canonical,
    props: {
      ...canonical.props,
      [`block:${collection.blockKey}`]: {
        ...canonical.props[`block:${collection.blockKey}`],
        [BUTTON_GROUP_ORDER]: [...model.order, stableId].join(','),
      },
      [scope]: { label, href: 'https://', icon: 'none', isPrimary: 'off' },
    },
    texts: { ...canonical.texts, [`${scope}.label`]: label },
  };
}

export function duplicateButton(doc: PageDoc, collection: ButtonCollection, stableId: string): PageDoc {
  const canonical = canonicalOf(doc, collection);
  const model = readButtonGroup(canonical, collection.blockKey, collection.seeds);
  const source = model.items.find((item) => item.stableId === stableId);
  const sourceIndex = model.order.indexOf(stableId);
  if (!source || sourceIndex < 0) return doc;
  const newId = nextButtonId(model);
  const newScope = canonicalScope(collection.blockKey, newId);
  const sourceProps = canonical.props[source.scope] ?? {};
  const label = `${source.label} (copia)`;
  return {
    ...canonical,
    props: {
      ...canonical.props,
      [newScope]: {
        label,
        href: sourceProps['href'] ?? source.href,
        ...(source.sub !== undefined ? { sub: source.sub } : {}),
        ...(sourceProps['icon'] !== undefined ? { icon: sourceProps['icon'] } : source.icon !== undefined ? { icon: source['icon'] } : {}),
        ...(sourceProps['iconPosition'] !== undefined ? { iconPosition: sourceProps['iconPosition'] } : {}),
        isPrimary: 'off',
      },
      [`block:${collection.blockKey}`]: {
        ...canonical.props[`block:${collection.blockKey}`],
        [BUTTON_GROUP_ORDER]: [
          ...model.order.slice(0, sourceIndex + 1),
          newId,
          ...model.order.slice(sourceIndex + 1),
        ].join(','),
      },
    },
    texts: {
      ...canonical.texts,
      [`${newScope}.label`]: label,
      ...(source.sub !== undefined ? { [`${newScope}.sub`]: source.sub } : {}),
    },
  };
}

/**
 * Removes one button from the order. The last button of a group is never removed:
 * callers must explain that to the user instead of silently doing nothing.
 */
export function deleteButton(doc: PageDoc, collection: ButtonCollection, stableId: string): PageDoc {
  const canonical = canonicalOf(doc, collection);
  const model = readButtonGroup(canonical, collection.blockKey, collection.seeds);
  if (model.items.length <= 1) return doc;
  return withOrder(canonical, collection.blockKey, model.order.filter((id) => id !== stableId));
}

export function moveButton(
  doc: PageDoc,
  collection: ButtonCollection,
  stableId: string,
  direction: -1 | 1,
): PageDoc {
  const canonical = canonicalOf(doc, collection);
  const model = readButtonGroup(canonical, collection.blockKey, collection.seeds);
  const index = model.order.indexOf(stableId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= model.order.length) return doc;
  const order = [...model.order];
  [order[index], order[target]] = [order[target]!, order[index]!];
  return withOrder(canonical, collection.blockKey, order);
}

/** A group must keep at least one button. */
export function canDeleteButton(model: ButtonGroupModel): boolean {
  return true;
}
