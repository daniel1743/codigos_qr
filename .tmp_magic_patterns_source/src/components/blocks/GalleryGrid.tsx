import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from '../editor/Editable';
import { EditableImage } from '../editor/EditableImage';
import { cx } from '../../utils/cx';

export type GalleryLayout = 'fila' | 'mosaico' | 'carrusel';

interface GalleryGridProps {
  id: string;
  items: string[];
  defaultLayout: GalleryLayout;
  radius: number;
  altPrefix: string;
  rowHeight?: number;
  className?: string;
}

const GAPS: Record<string, number> = { S: 6, M: 12, L: 22 };

/** A multi-image container. The whole set is one tappable object; each photo is also tappable. */
export function GalleryGrid({ id, items, defaultLayout, radius, altPrefix, rowHeight = 210, className }: GalleryGridProps) {
  const { doc, isMobile: m } = useEditor();
  const p = doc.props[id] ?? {};
  const list = p.items ? p.items.split('|').filter(Boolean) : items;
  const layout = p.layout as GalleryLayout ?? defaultLayout;
  const gap = Math.round((GAPS[p.gap ?? 'M'] ?? 12) * (m ? 0.7 : 1));

  const photo = (src: string, i: number, cls = '', style: React.CSSProperties = {}) =>
  <EditableImage
    key={`${i}-${src}`}
    id={`${id}.${i}`}
    src={src}
    alt={`${altPrefix} ${i + 1}`}
    label="Foto"
    className={cls}
    style={{ borderRadius: radius, ...style }} />;



  let body: React.ReactNode;
  if (layout === 'carrusel') {
    body =
    <div className="cq-scroll-none flex snap-x snap-mandatory overflow-x-auto" style={{ gap }}>
        {list.map((s, i) => photo(s, i, 'aspect-[4/5] shrink-0 snap-start', { width: m ? '72%' : '31%' }))}
      </div>;

  } else if (layout === 'mosaico') {
    const cols = m ? 2 : list.length >= 4 ? 4 : Math.max(1, Math.min(list.length, 3));
    body =
    <div
      className="grid"
      style={{ gap, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: m ? 118 : rowHeight, gridAutoFlow: 'dense' }}>
      
        {list.map((s, i) => {
        let span = '';
        if (i === 0 && cols > 1) span = 'col-span-2 row-span-2';else
        if (i === 1 && cols === 4) span = 'col-span-2';
        return photo(s, i, span);
      })}
      </div>;

  } else {
    const cols = Math.max(1, Math.min(list.length, m ? 3 : 4));
    body =
    <div className="grid" style={{ gap, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {list.map((s, i) => photo(s, i, 'aspect-[3/4]'))}
      </div>;

  }

  return (
    <Editable id={id} kind="gallery" label="Galería" data-layout={layout} className={cx('relative', className)}>
      {body}
    </Editable>);

}