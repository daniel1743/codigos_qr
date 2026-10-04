import React, { useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useEditableElement } from '../../hooks/useEditableElement';
import { textStyleToCss } from '../../utils/styles';

type TextTag = 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div';

interface EditableTextProps {
  id: string;
  value: string;
  label?: string;
  as?: TextTag;
  className?: string;
  style?: React.CSSProperties;
  selectable?: boolean;
  multiline?: boolean;
  /** 'price' uses the price contract (edit, size, color, hide) but still edits inline. */
  kind?: 'text' | 'price';
  /**
   * `false` for scopes whose palette is deliberately independent (a card with its
   * own background/text colours): their persisted colours are NOT overridden by
   * "Unificar color de texto". Content text leaves this at the default.
   */
  unifyEligible?: boolean;
}

/** Text that edits inline: tap on desktop to type immediately, tap again on mobile to open the keyboard. */
export function EditableText({
  id,
  value,
  label = 'Texto',
  as = 'p',
  className,
  style,
  selectable = true,
  multiline = false,
  kind = 'text',
  unifyEligible = true
}: EditableTextProps) {
  const ed = useEditor();
  const { ref, handlers, removed } = useEditableElement(id, kind, label, { selectable });
  const text = ed.doc.texts[id] ?? value;
  const isEditing = ed.mode === 'edit' && ed.editingId === id;
  // E1.3 — content text follows the page-level "Unificar color de texto" even when
  // it carries its own persisted colour; independent-palette scopes opt out.
  const unifyFg = unifyEligible ? ed.doc.props['page']?.['textColor'] : undefined;

  useEffect(() => {
    if (!isEditing && ref.current && ref.current.innerText !== text) {
      ref.current.innerText = text;
    }
  }, [isEditing, text, ref]);

  useEffect(() => {
    const el = ref.current;
    if (!isEditing || !el) return;
    el.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing, ref]);

  if (removed) return null;

  const finish = (el: HTMLElement) => {
    const next = (multiline ? el.innerText : el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    if (next && next !== text) ed.setText(id, next);else
    el.innerText = text;
  };

  const baseKeyDown = (handlers as {onKeyDown?: (e: React.KeyboardEvent) => void;}).onKeyDown;
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ whiteSpace: 'pre-line', ...style, ...textStyleToCss(ed.doc.textStyles[id], { unifyEligible, unifyFg }) }}
      {...handlers}
      contentEditable={isEditing || undefined}
      suppressContentEditableWarning
      spellCheck={isEditing ? false : undefined}
      onBlur={
      isEditing ?
      (e: React.FocusEvent<HTMLElement>) => {
        finish(e.currentTarget);
        ed.setEditingId((cur) => cur === id ? null : cur);
        ed.setKeyboard(false);
      } :
      undefined
      }
      onPaste={
      isEditing ?
      (e: React.ClipboardEvent) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      } :
      undefined
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (isEditing) {
          if (e.key === 'Escape' || e.key === 'Enter' && !multiline && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
          e.stopPropagation();
          return;
        }
        baseKeyDown?.(e);
      }}>
      
      {text}
    </Tag>);

}
