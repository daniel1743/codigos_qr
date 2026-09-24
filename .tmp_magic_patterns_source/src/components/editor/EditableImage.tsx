import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';

interface EditableImageProps {
  id: string;
  src: string;
  alt: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** An image that can be replaced, cropped and repositioned directly from the page. */
export function EditableImage({ id, src, alt, label = 'Imagen', className, style, children }: EditableImageProps) {
  const { doc } = useEditor();
  const p = doc.props[id] ?? {};
  return (
    <Editable
      id={id}
      kind="image"
      label={label}
      className={cx(!className?.includes('absolute') && 'relative', 'overflow-hidden', className)}
      style={style}>
      
      <img
        src={p.src ?? src}
        alt={p.alt ?? alt}
        draggable={false}
        className="absolute inset-0 h-full w-full transition-transform duration-200 ease-out"
        style={{
          objectFit: p.fit === 'contain' ? 'contain' : 'cover',
          objectPosition: p.pos ?? 'center',
          transform: `scale(${p.zoom ?? '1'})`,
          background: p.fit === 'contain' ? 'var(--surface)' : undefined
        }} />
      
      {children}
    </Editable>);

}