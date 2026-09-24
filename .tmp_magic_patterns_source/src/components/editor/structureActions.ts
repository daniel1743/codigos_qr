import { ArrowDownIcon, ArrowUpIcon, CopyIcon, EyeIcon, EyeOffIcon, Trash2Icon } from 'lucide-react';
import type { EditorValue } from '../../contexts/EditorContext';
import type { EditorAction } from './editorAction';

/** The universal block-container contract: move up, move down, duplicate, hide, delete. */
export function structureActions(ed: EditorValue, key: string): EditorAction[] {
  const index = ed.doc.blocks.findIndex((b) => b.key === key);
  const hidden = !!ed.doc.blocks[index]?.hidden;
  return [
  { key: 'up', label: 'Subir', icon: ArrowUpIcon, onClick: () => ed.moveBlock(key, -1), disabled: index <= 0 },
  { key: 'down', label: 'Bajar', icon: ArrowDownIcon, onClick: () => ed.moveBlock(key, 1), disabled: index >= ed.doc.blocks.length - 1 },
  { key: 'dup', label: 'Duplicar', icon: CopyIcon, onClick: () => ed.duplicateBlock(key) },
  { key: 'hide', label: hidden ? 'Mostrar' : 'Ocultar', icon: hidden ? EyeIcon : EyeOffIcon, active: hidden, onClick: () => ed.toggleHidden(key) },
  { key: 'delete', label: 'Eliminar', icon: Trash2Icon, danger: true, onClick: () => ed.deleteBlock(key) }];

}