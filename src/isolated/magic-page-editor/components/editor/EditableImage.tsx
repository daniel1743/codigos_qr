import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';
import { useFreeImagePan } from './controls/PositionPad';
import { mediaOverlayStyleFromProps, mediaPhotoStyle, mediaShapeStyle } from '../../utils/styles';

interface EditableImageProps {
  id: string;
  src: string;
  alt: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** An image that can be replaced, cropped, zoomed and repositioned directly from the page. */
export function EditableImage({ id, src, alt, label = 'Imagen', className, style, children }: EditableImageProps) {
  const { doc } = useEditor();
  const p = doc.props[id] ?? {};
  const overlay = mediaOverlayStyleFromProps(p);
  const crop = useFreeImagePan(id, p['cropX'], p['cropY']);
  const photoStyle = mediaPhotoStyle(p);
  const shapeStyle = mediaShapeStyle(p['shape']);
  const fit = p['fit'] === 'contain' ? 'contain' : 'cover';
  return (
    <Editable
      id={id}
      kind="image"
      label={label}
      className={cx(!className?.includes('absolute') && 'relative', 'overflow-hidden', className)}
      style={{ ...style, ...shapeStyle }}>
      
      <img
        src={p['src'] ?? src}
        alt={p['alt'] ?? alt}
        draggable={false}
        {...crop.handlers}
        className="absolute inset-0 h-full w-full touch-none transition-transform duration-200 ease-out"
        style={{ ...(p['cropX'] || p['cropY'] ? { ...photoStyle, objectPosition: crop.objectPosition } : photoStyle), objectFit: fit }} />

      {overlay && <div aria-hidden data-media-overlay={p['overlay']} style={overlay} />}
      {children}
    </Editable>);

}
