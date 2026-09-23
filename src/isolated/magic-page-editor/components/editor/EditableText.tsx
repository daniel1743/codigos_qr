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
  multiline = false
}: EditableTextProps) {
  const ed = useEditor();
  const { ref, handlers, removed } = useEditableElement(id, 'text', label, { selectable });
  const text = ed.doc.texts[id] ?? value;
  const isEditing = ed.mode === 'edit' && ed.editingId === id;

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
      style={{ whiteSpace: 'pre-line', ...style, ...textStyleToCss(ed.doc.textStyles[id]) }}
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
