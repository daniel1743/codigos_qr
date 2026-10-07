import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from '../editor/Editable';
import { EditableImage } from '../editor/EditableImage';
import { cx } from '../../utils/cx';
import { mediaHeightStyle } from '../../utils/styles';

export type GalleryLayout =
  | 'fila' | 'mosaico' | 'carrusel' | 'masonry' | 'stacked'
  // L2.5 · two compositions the target uses and the native set lacked.
  | 'destacada' | 'bloques';

/** Every gallery layout the renderer implements, in the order the picker shows them. */
export const galleryLayouts: {value: GalleryLayout;label: string;hint: string;}[] = [
{ value: 'fila', label: 'Fila', hint: 'Todas las fotos en una cuadrícula pareja.' },
{ value: 'mosaico', label: 'Mosaico', hint: 'Una foto grande y el resto alrededor.' },
{ value: 'carrusel', label: 'Carrusel', hint: 'Se desplazan en horizontal.' },
{ value: 'masonry', label: 'Editorial', hint: 'Columnas de altura libre.' },
{ value: 'stacked', label: 'Apilada', hint: 'Fotos superpuestas y giradas.' },
// Both are new ids, so a gallery that already stores one of the five above
// cannot reach them and cannot move.
{ value: 'destacada', label: 'Destacada', hint: 'Una foto a todo el ancho y una fila de tres debajo.' },
{ value: 'bloques', label: 'Bloques', hint: 'Una foto ancha arriba y el resto en dos columnas.' }];

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
  const list = p['items'] ? p['items'].split('|').filter(Boolean) : items;
  const pageVariant = doc.props.page?.familyVariant;
  const pageLayouts: Record<string, GalleryLayout> = {
    'gallery-editorial': 'fila', 'gallery-mosaic': 'mosaico', 'gallery-filmstrip': 'carrusel',
    'gallery-masonry': 'masonry', 'gallery-stacked': 'stacked'
  };
  const layout = pageLayouts[pageVariant ?? ''] ?? p['layout'] as GalleryLayout ?? defaultLayout;
  const gap = Math.round((GAPS[p['gap'] ?? 'M'] ?? 12) * (m ? 0.7 : 1));

  /**
   * `defaultHeight` is the HEIGHT THE LAYOUT wants, and it is deliberately
   * applied before `mediaHeightStyle` so an authored `mediaHeight` still wins.
   * Passing it through `style` instead would have put it last and silently
   * overridden the L2.2 control on exactly these two layouts.
   */
  const photo = (
    src: string,
    i: number,
    cls = '',
    style: React.CSSProperties = {},
    defaultHeight?: number
  ) => {
    const photoProps = doc.props[`${id}.${i}`] ?? {};
    const href = photoProps['href'] ?? p['href'] ?? '';
    const newTab = (photoProps['newTab'] ?? p['newTab'] ?? 'on') !== 'off';
    return (
      <EditableImage
        key={`${i}-${src}`}
        id={`${id}.${i}`}
        src={src}
        alt={`${altPrefix} ${i + 1}`}
        label="Foto"
        className={cls}
        // L2.2: one insertion point covers every gallery layout. A literal
        // `mediaHeight` replaces the layout's own ratio or height.
        style={{
          borderRadius: radius,
          ...(defaultHeight === undefined ? {} : { height: defaultHeight }),
          ...mediaHeightStyle(photoProps),
          ...style
        }}
        {...(href ? { href, ...(newTab ? { target: '_blank', rel: 'noreferrer' } : {}) } : {})} />
    );
  };



  let body: React.ReactNode;
  if (layout === 'stacked') {
    body = <div className="relative mx-auto h-[320px] max-w-[520px]">{list.slice(0, 5).map((s, i) => photo(s, i, 'absolute left-1/2 top-1/2 aspect-[4/5] w-[46%] -translate-x-1/2 -translate-y-1/2 shadow-xl', { transform: `translate(calc(-50% + ${(i - 2) * 22}px), calc(-50% + ${Math.abs(i - 2) * 8}px)) rotate(${(i - 2) * 5}deg)`, zIndex: i }))}</div>;
  } else if (layout === 'masonry') {
    body = <div className="columns-2 gap-3 md:columns-3">{list.map((s, i) => photo(s, i, `mb-3 inline-block w-full ${i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`))}</div>;
  } else if (layout === 'carrusel') {
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

  } else if (layout === 'destacada') {
    /* One photo across the full width, then a three-column row whose first
       entry spans two — the composition the target opens its gallery with.
       The second row is capped at three so the lead keeps the weight; extra
       photos beyond four are not rendered rather than wrapped into a shape the
       layout was not drawn for. */
    const row = list.slice(1, 4);
    const small = Math.round(rowHeight * 0.72);
    body =
    <div className="flex flex-col" style={{ gap }}>
        {photo(list[0] ?? '', 0, 'w-full object-cover', {}, rowHeight)}
        {row.length > 0 &&
      <div className="grid grid-cols-3" style={{ gap }}>
          {row.map((s, i) => photo(s, i + 1, cx('w-full object-cover', i === 0 && 'col-span-2'), {}, small))}
        </div>}
      </div>;

  } else if (layout === 'bloques') {
    /* A wide lead spanning both columns, then the rest two-up. Same cap of four
       for the same reason. */
    const block = Math.round(rowHeight * 0.72);
    body =
    <div className="grid grid-cols-2" style={{ gap }}>
        {list.slice(0, 4).map((s, i) => photo(s, i, cx('w-full object-cover', i === 0 && 'col-span-2'), {}, i === 0 ? rowHeight : block))}
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