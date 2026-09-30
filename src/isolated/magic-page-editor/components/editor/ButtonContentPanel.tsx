import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { LinkEditor } from './controls/LinkEditor';
import { ScopeNote } from './controls/ScopeNote';
import { alignOptions } from './controls/AlignGroup';
import { buttonTextStyleId, readButtonGroup, type LegacyButtonSeed } from '../../utils/buttonGroup';
import type { TextAlign } from '../../types/editor';

interface ButtonContentPanelProps {
  blockKey: string;
  seeds: LegacyButtonSeed[];
  scope: string;
  /** "Guía: Costa Brava" — the button label, used to name every section. */
  label: string;
}

const ALIGN_LABELS: { value: TextAlign; label: string }[] = alignOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

/**
 * "Contenido": everything that belongs to ONE button.
 * The header of every section names the button so ownership is never ambiguous.
 */
export function ButtonContentPanel({ blockKey, seeds, scope, label }: ButtonContentPanelProps) {
  const ed = useEditor();
  const model = readButtonGroup(ed.doc, blockKey, seeds);
  const item = model.items.find((entry) => entry.scope === scope);
  const props = ed.doc.props[scope] ?? {};
  const labelValue = ed.doc.texts[buttonTextStyleId(scope, 'label')] ?? item?.label ?? label;
  const subValue = ed.doc.texts[buttonTextStyleId(scope, 'sub')] ?? item?.sub ?? '';
  const hasSub = item?.sub !== undefined;
  const align = ed.doc.textStyles[buttonTextStyleId(scope, 'label')]?.align ?? 'left';

  const setText = (line: 'label' | 'sub', value: string) => {
    ed.updateDoc((doc) => {
      const texts = { ...doc.texts };
      if (value) texts[buttonTextStyleId(scope, line)] = value;
      else delete texts[buttonTextStyleId(scope, line)];
      const propsNext = { ...doc.props, [scope]: { ...doc.props[scope] } };
      if (line === 'sub') {
        if (value) propsNext[scope]!['sub'] = value;
        else delete propsNext[scope]!['sub'];
      }
      return { ...doc, texts, props: propsNext };
    });
  };

  const setAlign = (value: TextAlign) => {
    ed.updateDoc((doc) => {
      const textStyles = { ...doc.textStyles };
      textStyles[buttonTextStyleId(scope, 'label')] = { ...textStyles[buttonTextStyleId(scope, 'label')], align: value };
      if (hasSub) {
        textStyles[buttonTextStyleId(scope, 'sub')] = { ...textStyles[buttonTextStyleId(scope, 'sub')], align: value };
      }
      return { ...doc, textStyles };
    });
  };

  return (
    <div className="space-y-4">
      <ScopeNote scope="item" />
      <PanelSection title="Texto de este botón" hint="Toca el texto en la página o escribe aquí.">
        <label className="block">
          <span className="sr-only">Texto del botón</span>
          <input
            type="text"
            aria-label="Texto del botón"
            value={labelValue}
            onChange={(e) => setText('label', e.target.value)}
            className="w-full rounded-xl border border-line bg-transparent px-3 py-2 text-[14px] text-ink shadow-sm focus:border-select focus:outline-none focus:ring-1 focus:ring-select" />
        </label>
        <label className="mt-2 block">
          <span className="mb-1 block text-[12px] text-mute">Subtexto (opcional)</span>
          <input
            type="text"
            aria-label="Subtexto del botón"
            placeholder="Sin subtexto"
            value={subValue}
            onChange={(e) => setText('sub', e.target.value)}
            className="w-full rounded-xl border border-line bg-transparent px-3 py-2 text-[13.5px] text-ink shadow-sm focus:border-select focus:outline-none focus:ring-1 focus:ring-select" />
        </label>
      </PanelSection>

      <PanelSection title="Alineación del texto" hint="Se aplica al texto y al subtexto de este botón.">
        <Segmented
          ariaLabel="Alineación del texto del botón"
          options={ALIGN_LABELS}
          value={align}
          onChange={(value) => setAlign(value)} />
      </PanelSection>

      <PanelSection title={`Enlace de · ${label}`} hint="Este enlace solo pertenece a este botón.">
        <LinkEditor
          value={props['href'] ?? item?.href ?? ''}
          onChange={(value) => ed.setProp(scope, 'href', value)}
          newTab={props['newTab']}
          onNewTabChange={(value) => ed.setProp(scope, 'newTab', value)} />
      </PanelSection>
    </div>);
}
