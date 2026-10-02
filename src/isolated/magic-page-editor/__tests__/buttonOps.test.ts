// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import { bioLinks } from '../data/bioContent';
import { BUTTON_GROUP_INITIALIZED, canonicalScope, readButtonGroup } from '../utils/buttonGroup';
import { addButton, canDeleteButton, deleteButton, duplicateButton, moveButton } from '../utils/buttonOps';

const collection = { blockKey: 'links', seeds: bioLinks };
const seedDoc = () => createInitialMagicEditorState('bio').doc;

describe('Button group operations (UX recovery)', () => {
  it('adds a button at the end of the collection and keeps the identity contract', () => {
    const doc = addButton(seedDoc(), collection);
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.items).toHaveLength(5);
    expect(model.order[4]).toBe('btn_5');
    expect(doc.props[canonicalScope('links', 'btn_5')]).toMatchObject({ label: 'Nuevo botón', isPrimary: 'off' });
    expect(doc.texts['links.btn_5.label']).toBe('Nuevo botón');
  });

  it('duplicates a button right after the source, with its own destination', () => {
    const doc = duplicateButton(seedDoc(), collection, 'legacy-1');
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.order.slice(0, 4)).toEqual(['legacy-0', 'legacy-1', 'btn_5', 'legacy-2']);
    expect(doc.props['links.btn_5']).toMatchObject({ href: bioLinks[1]!.href, isPrimary: 'off' });
    expect(model.items[2]!.label).toBe(`${bioLinks[1]!.label} (copia)`);
  });

  it('deletes one button without touching the destinations of its siblings', () => {
    const doc = deleteButton(seedDoc(), collection, 'legacy-2');
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.items).toHaveLength(3);
    expect(model.order).not.toContain('legacy-2');
    expect(model.items.map((item) => item.href)).toEqual([bioLinks[0]!.href, bioLinks[1]!.href, bioLinks[3]!.href]);
  });

  it('deletes the last remaining button, leaving an explicitly empty group', () => {
    const single = {
      ...seedDoc(),
      props: { 'block:links': { buttonGroupOrder: 'btn_a' }, 'links.btn_a': { label: 'Único', href: 'https://a.com' } },
    };
    const before = readButtonGroup(single, 'links', bioLinks);
    expect(canDeleteButton(before)).toBe(true);

    const doc = deleteButton(single, collection, 'btn_a');
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.items).toHaveLength(0);
    expect(model.order).toEqual([]);
    expect(model.canonical).toBe(true);
    expect(doc.props['block:links']?.[BUTTON_GROUP_INITIALIZED]).toBe('1');
    /* Re-reading the persisted document must NOT resurrect the legacy seeds. */
    expect(readButtonGroup(doc, 'links', bioLinks).items).toHaveLength(0);
  });

  it('keeps the legacy seed fallback when the group was never initialized', () => {
    const legacy = { ...seedDoc(), props: {} };
    const model = readButtonGroup(legacy, 'links', bioLinks);

    expect(model.canonical).toBe(false);
    expect(model.items).toHaveLength(4);
  });

  it('does not hydrate seeds for an explicitly empty canonical group', () => {
    const empty = {
      ...seedDoc(),
      props: { 'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: '' } },
    };
    const model = readButtonGroup(empty, 'links', bioLinks);

    expect(model.items).toHaveLength(0);
    expect(model.canonical).toBe(true);
  });

  it('deletes one of two buttons and keeps exactly one', () => {
    const two = {
      ...seedDoc(),
      props: {
        'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: 'btn_a,btn_b' },
        'links.btn_a': { label: 'A', href: 'https://a.com' },
        'links.btn_b': { label: 'B', href: 'https://b.com' },
      },
    };
    const doc = deleteButton(two, collection, 'btn_a');
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.order).toEqual(['btn_b']);
    expect(model.items).toHaveLength(1);
  });

  it('returns the same document when the id does not exist', () => {
    const two = {
      ...seedDoc(),
      props: {
        'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: 'btn_a,btn_b' },
        'links.btn_a': { label: 'A', href: 'https://a.com' },
        'links.btn_b': { label: 'B', href: 'https://b.com' },
      },
    };
    expect(deleteButton(two, collection, 'missing')).toBe(two);
  });

  it('allows adding a button again after the group became empty', () => {
    const emptied = {
      ...seedDoc(),
      props: { 'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: '' } },
    };
    const doc = addButton(emptied, collection, 'Renacido');
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.items).toHaveLength(1);
    expect(model.items[0]!.label).toBe('Renacido');
    expect(doc.props[canonicalScope('links', 'btn_1')]).toMatchObject({ label: 'Renacido' });
  });

  it('reorders the collection and updates the reported position', () => {
    const doc = moveButton(seedDoc(), collection, 'legacy-3', -1);
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.order).toEqual(['legacy-0', 'legacy-1', 'legacy-3', 'legacy-2']);
    expect(model.items[2]!.stableId).toBe('legacy-3');
  });
});
