// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import { bioLinks } from '../data/bioContent';
import { canonicalScope, readButtonGroup } from '../utils/buttonGroup';
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

  it('never deletes the last button of the group', () => {
    const single = {
      ...seedDoc(),
      props: { 'block:links': { buttonGroupOrder: 'btn_a' }, 'links.btn_a': { label: 'Único', href: 'https://a.com' } },
    };
    const model = readButtonGroup(single, 'links', bioLinks);

    expect(canDeleteButton(model)).toBe(false);
    expect(deleteButton(single, collection, 'btn_a')).toBe(single);
  });

  it('reorders the collection and updates the reported position', () => {
    const doc = moveButton(seedDoc(), collection, 'legacy-3', -1);
    const model = readButtonGroup(doc, 'links', bioLinks);

    expect(model.order).toEqual(['legacy-0', 'legacy-1', 'legacy-3', 'legacy-2']);
    expect(model.items[2]!.stableId).toBe('legacy-3');
  });
});
