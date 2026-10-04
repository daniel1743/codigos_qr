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
  defaultProps?: Record<string, string | undefined>;
  /** Optional destination; renders an anchor instead of a div so the photo can be tapped. */
  href?: string;
  target?: string;
  rel?: string;
}

/** An image that can be replaced, cropped, zoomed and repositioned directly from the page. */
export function EditableImage({ id, src, alt, label = 'Imagen', className, style, children, defaultProps = {}, href, target, rel }: EditableImageProps) {
  const { doc } = useEditor();
  const p = doc.props[id] ?? {};
  const overlay = mediaOverlayStyleFromProps(p);
  const crop = useFreeImagePan(id, p['cropX'], p['cropY']);
  const photoStyle = mediaPhotoStyle(p);
  const shapeStyle = mediaShapeStyle(p['shape'] ?? defaultProps.shape);
  const fit = (p['fit'] ?? defaultProps.fit) === 'contain' ? 'contain' : 'cover';
  const isLocked = p['locked'] === 'true';
  return (
    <Editable
      id={id}
      kind="image"
      label={label}
      as={href ? 'a' : 'div'}
      {...(href ? { href, ...(target ? { target, rel: rel ?? 'noreferrer' } : {}) } : {})}
      className={cx(!className?.includes('absolute') && 'relative', 'overflow-hidden', className)}
      style={{ ...style, ...shapeStyle }}>
      
      <img
        src={p['src'] ?? src}
        alt={p['alt'] ?? alt}
        draggable={false}
        {...(isLocked ? {} : crop.handlers)}
        className={cx("absolute inset-0 h-full w-full transition-transform duration-200 ease-out", !isLocked && "touch-none")}
        style={{ ...(p['cropX'] || p['cropY'] ? { ...photoStyle, objectPosition: crop.objectPosition } : photoStyle), objectFit: fit }} />

      {overlay && <div aria-hidden data-media-overlay={p['overlay']} style={overlay} />}
      {children}
    </Editable>);

}
