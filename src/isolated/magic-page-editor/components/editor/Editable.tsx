import React from 'react';
import { EditableParentContext } from '../../contexts/EditableParentContext';
import { useEditableElement } from '../../hooks/useEditableElement';
import type { ElementKind } from '../../types/editor';

type EditableTag = 'div' | 'section' | 'footer' | 'figure' | 'a' | 'article' | 'header' | 'li';

interface EditableProps extends Omit<React.HTMLAttributes<HTMLElement>, 'id'> {
  id: string;
  kind: ElementKind;
  label: string;
  blockKey?: string;
  as?: EditableTag;
  href?: string;
  target?: string;
  rel?: string;
}

/** Wraps any visible element so it can be tapped and edited in place. */
export function Editable({ id, kind, label, blockKey, as = 'div', children, ...rest }: EditableProps) {
  const { ref, handlers, removed, childContext } = useEditableElement(id, kind, label, { blockKey });
  if (removed) return null;
  const Tag = as as React.ElementType;
  return (
    <EditableParentContext.Provider value={childContext}>
      <Tag ref={ref} {...rest} {...handlers}>
        {children}
      </Tag>
    </EditableParentContext.Provider>);

}