import React, { useContext, useLayoutEffect, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { EditableParentContext } from '../contexts/EditableParentContext';
import { buildPublicLinkTrackEvent } from '../utils/publicLinkTracking';
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

  /**
   * PUBLIC ANALYTICS (preview mode only).
   *
   * Magic templates render every external destination (`EditableSocial`,
   * `EditableCTA`, block CTAs, card CTAs, location CTA) through this shared
   * `Editable` layer, so a single handler here instruments the whole public
   * surface without duplicating analytics code per template or per component:
   *   - it is attached ONLY in preview mode, so edit mode never emits;
   *   - it never calls preventDefault/stopPropagation, so navigation is intact;
   *   - in-page `#anchor` links and the `https://` placeholder are skipped;
   *   - one click on one anchor produces exactly one event (no double counting).
   */
  const trackPublicLink = ed.mode === 'preview' && ed.onTrack
    ? (e: React.MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        const event = buildPublicLinkTrackEvent({
          href: el.getAttribute('href'),
          itemId: id,
          blockId: blockKey,
          label,
          visibleText: el.textContent
        });
        if (event) ed.onTrack?.(event);
      }
    : undefined;

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
  trackPublicLink ?
  { onClick: trackPublicLink } :
  {};

  return {
    ref,
    handlers,
    isSelected,
    removed,
    childContext: { id: selectable ? id : parent.id, blockKey }
  };
}