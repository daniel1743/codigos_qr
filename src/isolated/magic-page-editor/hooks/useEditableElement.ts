import React, { useContext, useLayoutEffect, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { EditableParentContext } from '../contexts/EditableParentContext';
import type { ElementKind } from '../types/editor';

interface Options {
  blockKey?: string;
  selectable?: boolean;
}

export function useEditableElement(id: string, kind: ElementKind, label: string, opts: Options = {}) {
  const ed = useEditor();
  const parent = useContext(EditableParentContext);
  const ref = useRef<HTMLElement | null>(null);
  const selectable = opts.selectable !== false;
  const blockKey = opts.blockKey ?? parent.blockKey;
  const removed = !!ed.doc.removed[id];
  const { register, unregister } = ed;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!selectable || !el) return;
    register({ id, kind, label, parentId: parent.id, blockKey, el });
    return () => unregister(id, el);
  }, [id, kind, label, parent.id, blockKey, selectable, removed, register, unregister]);

  const isSelected = ed.selection?.id === id;
  const active = ed.mode === 'edit' && selectable;

  const activate = () => {
    if (!isSelected) {
      ed.select(id);
      return;
    }
    if (kind === 'text' && ed.editingId !== id) {
      ed.setEditingId(id);
      if (ed.isMobile) ed.setKeyboard(true);
    }
  };

  const handlers = active ?
  {
    'data-cq': '',
    'data-selected': isSelected ? 'true' : undefined,
    tabIndex: 0,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      activate();
    },
    onDoubleClick:
    kind === 'cta' ?
    (e: React.MouseEvent) => {
      e.stopPropagation();
      ed.setEditingId(`${id}.label`);
      if (ed.isMobile) ed.setKeyboard(true);
    } :
    undefined,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.target === e.currentTarget && ed.editingId !== id) {
        e.preventDefault();
        e.stopPropagation();
        activate();
      }
    }
  } :
  {};

  return {
    ref,
    handlers,
    isSelected,
    removed,
    childContext: { id: selectable ? id : parent.id, blockKey }
  };
}