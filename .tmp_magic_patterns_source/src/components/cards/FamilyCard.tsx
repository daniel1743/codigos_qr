import React from 'react';
import { EyeOffIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from '../editor/Editable';
import { EditableImage } from '../editor/EditableImage';
import { EditableText } from '../editor/EditableText';
import { EditableBadge } from './EditableBadge';
import { CardBody, type BodySize } from './CardBody';
import { resolveCard } from '../../utils/cardLayout';
import { cx } from '../../utils/cx';
import type { CardFamilyDef, CardItem } from '../../types/editor';

export type CardDemo = 'card' | 'image' | 'cta' | 'title';

interface FamilyCardProps {
  id: string;
  family: CardFamilyDef;
  item: CardItem;
  blockProps: Record<string, string>;
  className?: string;
  demo?: CardDemo;
}

const SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 1px 2px rgba(16,24,40,0.06), 0 14px 30px -18px rgba(16,24,40,0.28)',
  lifted: '0 30px 60px -26px rgba(16,24,40,0.45)'
};

/** One reusable card shell. Layout, image position, surface and optional fields are all per-card props. */
export function FamilyCard({ id, family, item, blockProps, className, demo }: FamilyCardProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const m = ed.isMobile;
  const cp = ed.doc.props[id] ?? {};
  const { layout, ratio, dense, sale } = resolveCard(family, blockProps, cp);
  const hidden = cp.hidden === 'on';
  if (hidden && ed.mode === 'preview') return null;

  const on = (key: string, has: boolean) => has && (cp[key] ?? 'on') === 'on';
  const show = {
    price: on('showPrice', !!item.price),
    prev: on('showPrev', !!item.previousPrice),
    badge: on('showBadge', !!item.badge),
    cta: on('showCta', !!item.cta)
  };

  const surface = cp.surface ?? (layout === 'highlight' ? 'accent' : 'surface');
  const onAccent = surface === 'accent';
  const radius = { none: 0, S: 8, M: t.radius, L: t.radius + 14 }[cp.radius ?? 'M'] ?? t.radius;
  const pad = ({ S: 12, M: 20, L: 28 }[cp.spacing ?? (layout === 'compact' ? 'S' : 'M')] ?? 20) - (m ? 4 : 0);
  const border = (cp.border ?? (surface === 'plain' ? 'off' : 'on')) === 'on' || surface === 'outline';
  const inner = Math.max(0, Math.round(radius - pad * 0.6));

  const surfaceCss: React.CSSProperties =
  surface === 'accent' ?
  {
    background: t.accent,
    '--fg': t.accentFg,
    '--muted': `color-mix(in srgb, ${t.accentFg} 74%, transparent)`,
    '--surface': 'rgba(255,255,255,0.14)',
    '--line': 'rgba(255,255,255,0.24)'
  } as React.CSSProperties :
  surface === 'surface' ?
  { background: 'var(--surface)' } :
  { background: 'transparent' };

  const badgeOnImage = family.badgeOnImage && layout !== 'compact' && layout !== 'highlight';
  const badgeOver =
  badgeOnImage && show.badge && item.badge ?
  <EditableBadge id={`${id}.badge`} label={item.badge} onMedia defaultStyle={sale ? 'solid' : 'soft'} className="absolute left-3 top-3 z-[1]" /> :
  null;

  const media = (cls: string, style?: React.CSSProperties, imgRadius = inner) =>
  <div data-slot="image" className={cx('relative shrink-0', cls)} style={style}>
      <EditableImage id={`${id}.img`} src={item.image} alt={item.title} className="h-full w-full" style={{ borderRadius: imgRadius }} />
      {badgeOver}
    </div>;


  const body = (size: BodySize, cls?: string) =>
  <CardBody id={id} family={family} item={item} size={size} show={show} inlineBadge={!badgeOnImage} sale={sale} onAccent={onAccent} className={cls} />;


  let content: React.ReactNode;
  const horizontal = layout === 'left' || layout === 'right' || layout === 'balanced';
  const stackOnMobile = m && (layout === 'balanced' || ratio !== '25');

  if (horizontal && !stackOnMobile) {
    const r = layout === 'balanced' ? '50' : ratio;
    content =
    <div className={cx('flex flex-1 items-stretch', layout === 'right' && 'flex-row-reverse')} style={{ gap: m ? 14 : pad }}>
        {media('', { width: `${r}%`, minWidth: m ? 96 : 120, minHeight: m ? 104 : r === '25' ? 150 : 210 })}
        {body('md', 'flex-1 py-0.5')}
      </div>;

  } else if (horizontal || layout === 'top') {
    content =
    <div className="flex flex-1 flex-col" style={{ gap: m ? 14 : 16 }}>
        {media(cx('w-full', dense ? 'aspect-square' : layout === 'top' ? 'aspect-[4/3]' : 'aspect-[16/10]'))}
        {body(dense ? 'sm' : 'md', 'flex-1')}
      </div>;

  } else if (layout === 'bottom') {
    content =
    <div className="flex flex-1 flex-col" style={{ gap: 16 }}>
        {body('md', 'flex-1')}
        {media('aspect-[4/3] w-full')}
      </div>;

  } else if (layout === 'editorial') {
    content = m ?
    <div className="flex flex-1 flex-col gap-5">
        {media('aspect-[4/5] w-full')}
        {body('lg')}
      </div> :

    <div className="grid flex-1 grid-cols-[1.25fr_1fr] items-stretch" style={{ gap: pad * 1.6 }}>
        {media('min-h-[380px]')}
        {body('lg', 'justify-end py-3 pr-2')}
      </div>;

  } else if (layout === 'compact') {
    content =
    <div className="flex flex-1 items-center gap-3.5">
        {media(m ? 'h-16 w-16' : 'h-[76px] w-[76px]', undefined, Math.min(inner, 14))}
        {body('sm', 'flex-1')}
      </div>;

  } else if (layout === 'beforeAfter') {
    const pane = (imgId: string, src: string, labelId: string, label: string) =>
    <div className="relative overflow-hidden" style={{ borderRadius: inner }}>
        <EditableImage id={imgId} src={src} alt={`${item.title} · ${label}`} className="h-full w-full" />
        <EditableText
        id={labelId}
        value={label}
        as="span"
        label="Etiqueta"
        className="absolute bottom-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#15171C]" />
      
      </div>;

    content =
    <div className="flex flex-1 flex-col" style={{ gap: 16 }}>
        <div data-slot="image" className={cx('grid grid-cols-2 gap-1.5', m ? 'aspect-[4/3]' : 'aspect-[21/9]')}>
          {pane(`${id}.img2`, item.imageBefore ?? item.image, `${id}.beforeLabel`, 'Antes')}
          {pane(`${id}.img`, item.image, `${id}.afterLabel`, 'Después')}
        </div>
        {body('md')}
      </div>;

  } else {
    content = body('lg', cx('flex-1', m ? 'py-2' : 'py-4 pr-10'));
  }

  return (
    <Editable
      id={id}
      kind="familyCard"
      label="Tarjeta"
      data-layout={layout}
      data-demo={demo}
      className={cx('relative flex flex-col', hidden && 'opacity-40', className)}
      style={{
        ...surfaceCss,
        padding: layout === 'highlight' ? pad + 8 : pad,
        borderRadius: radius,
        boxShadow: [border ? 'inset 0 0 0 1px var(--line)' : '', SHADOWS[cp.shadow ?? 'none'] !== 'none' ? SHADOWS[cp.shadow ?? 'none'] : ''].
        filter(Boolean).
        join(', ') || undefined,
        color: 'var(--fg)'
      }}>
      
      {hidden && ed.mode === 'edit' &&
      <span className="pointer-events-none absolute right-3 top-3 z-[2] inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
          <EyeOffIcon className="h-3 w-3" /> Oculta
        </span>
      }
      {content}
    </Editable>);

}