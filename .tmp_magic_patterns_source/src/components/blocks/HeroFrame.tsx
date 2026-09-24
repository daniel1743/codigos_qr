import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { cx } from '../../utils/cx';
import type { HeroVariant } from '../../types/editor';

export type HeroShape = 'curve' | 'straight' | 'inset';
type HeroHeight = 'S' | 'M' | 'L';

interface HeroContext {
  align: 'center' | 'left';
  onMedia: boolean;
}

interface HeroFrameProps {
  id: string;
  media: string;
  mediaAlt: string;
  defaultVariant: HeroVariant;
  defaultShape?: HeroShape;
  defaultHeight?: HeroHeight;
  avatar?: React.ReactNode;
  avatarOverlap?: number;
  decor?: React.ReactNode;
  radius: number;
  /** Optional extra photos for the mosaic variant; falls back to alternate crops of the main image. */
  extraMedia?: string[];
  children: (ctx: HeroContext) => React.ReactNode;
}

const HEIGHTS: Record<HeroHeight, number> = { S: 220, M: 320, L: 460 };
const SCALE: Record<HeroHeight, number> = { S: 0.85, M: 1, L: 1.2 };

/** One hero structure, ten variants. Templates only supply the skin (content, avatar, decor). */
export function HeroFrame({
  id,
  media,
  mediaAlt,
  defaultVariant,
  defaultShape = 'curve',
  defaultHeight = 'M',
  avatar,
  avatarOverlap = 64,
  decor,
  radius,
  extraMedia,
  children
}: HeroFrameProps) {
  const { doc, isMobile: m } = useEditor();
  const p = doc.props[id] ?? {};
  const variant = p.variant as HeroVariant ?? defaultVariant;
  const shape = p.shape as HeroShape ?? defaultShape;
  const heightKey = p.height as HeroHeight ?? defaultHeight;
  const H = Math.round(HEIGHTS[heightKey] * (m ? 0.68 : 1));
  const curve = m ? 40 : 72;
  const inset = m ? 12 : 20;
  const src = p.src ?? media;
  const data = { 'data-hero': variant, 'data-shape': shape };

  const photo = (url: string, position: string) =>
  <img src={url} alt={mediaAlt} draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />;

  const img = photo(src, p.pos ?? 'center');

  const bandShape: React.CSSProperties =
  shape === 'curve' ?
  { borderBottomLeftRadius: `50% ${curve}px`, borderBottomRightRadius: `50% ${curve}px` } :
  shape === 'inset' ?
  { borderRadius: radius, margin: inset } :
  {};

  const onMediaVars = {
    '--fg': '#F7F4EE',
    '--muted': 'rgba(247,244,238,0.8)',
    '--line': 'rgba(247,244,238,0.35)',
    '--surface': 'rgba(255,255,255,0.14)',
    color: 'var(--fg)'
  } as React.CSSProperties;

  switch (variant) {
    case 'split':{
        const frameRadius = shape === 'curve' ? `9999px 9999px ${radius}px ${radius}px` : shape === 'inset' ? `${radius}px` : '0px';
        return (
          <div {...data} className={cx('mx-auto grid items-center', m ? 'grid-cols-1 gap-12 px-5 pb-6 pt-5' : 'grid-cols-[1.05fr_1fr] gap-16 px-10 py-16')} style={{ maxWidth: 1180 }}>
          <div className={cx('flex flex-col items-start text-left', m && 'order-2')}>{children({ align: 'left', onMedia: false })}</div>
          <div className={cx('relative', m && 'order-1')}>
            <div className="relative overflow-hidden" style={{ borderRadius: frameRadius, aspectRatio: m ? '1 / 1' : '4 / 5' }}>
              {img}
              {decor}
            </div>
            {avatar && <div className={cx('absolute', m ? '-bottom-8 left-4' : '-bottom-10 -left-10')}>{avatar}</div>}
          </div>
        </div>);

      }

    case 'image':{
        const minHeight = H + (m ? 250 : 210);
        return (
          <div {...data} className="relative overflow-hidden" style={{ minHeight, ...bandShape }}>
          {img}
          <div className="absolute inset-0" style={{ background: 'rgba(12,12,11,0.48)' }} />
          {decor}
          <div className="relative flex flex-col items-start justify-end text-left" style={{ minHeight, padding: m ? '96px 20px 36px' : '140px 56px 60px', ...onMediaVars }}>
            {avatar && <div className="mb-6">{avatar}</div>}
            {children({ align: 'left', onMedia: true })}
          </div>
        </div>);

      }

    case 'simple':
      return (
        <div
          {...data}
          className="flex flex-col items-center text-center"
          style={{ background: 'var(--surface)', padding: m ? '52px 20px' : '84px 40px', ...(shape === 'inset' ? { borderRadius: radius, margin: inset } : {}) }}>
          
          {avatar && <div className="mb-6">{avatar}</div>}
          {children({ align: 'center', onMedia: false })}
        </div>);


    case 'arch':{
        const w = Math.round((m ? 220 : 300) * SCALE[heightKey]);
        return (
          <div {...data} className="flex flex-col items-center px-6 text-center" style={{ paddingTop: m ? 28 : 52 }}>
          <div className="relative overflow-hidden" style={{ width: w, height: Math.round(w * 1.22), borderRadius: `${w / 2}px ${w / 2}px ${radius}px ${radius}px` }}>
            {img}
            {decor}
          </div>
          {avatar &&
            <div className="relative" style={{ marginTop: -Math.round(avatarOverlap * 0.8) }}>
              {avatar}
            </div>
            }
          <div className={cx('flex w-full flex-col items-center', avatar ? 'mt-5' : 'mt-8')}>{children({ align: 'center', onMedia: false })}</div>
        </div>);

      }

    case 'floating':
      return (
        <div {...data} className="relative flex items-end overflow-hidden" style={{ minHeight: H + (m ? 220 : 200), ...bandShape }}>
          {img}
          {decor}
          <div className="relative w-full" style={{ padding: m ? '130px 14px 18px' : '170px 32px 40px' }}>
            <div
              className="mx-auto flex max-w-[560px] flex-col items-center text-center"
              style={{ background: 'var(--surface)', borderRadius: radius, padding: m ? '26px 18px' : '40px 44px', boxShadow: '0 28px 60px -28px rgba(0,0,0,0.5)' }}>
              
              {avatar && <div className={m ? '-mt-16 mb-4' : '-mt-20 mb-5'}>{avatar}</div>}
              {children({ align: 'center', onMedia: false })}
            </div>
          </div>
        </div>);


    case 'banner':
      return (
        <div {...data} className={cx('mx-auto', m ? 'px-3 pb-2 pt-3' : 'px-6 pb-4 pt-6')} style={{ maxWidth: 1180 }}>
          <div className="relative overflow-hidden" style={{ height: Math.round(H * 0.66), borderRadius: radius }}>
            {img}
            {decor}
          </div>
          <div className={cx('relative flex', m ? 'flex-col items-start px-3' : 'items-end gap-7 px-8')}>
            {avatar && <div style={{ marginTop: -avatarOverlap }}>{avatar}</div>}
            <div className={cx('flex min-w-0 flex-1 flex-col items-start text-left', m ? 'mt-5' : 'pb-1 pt-6')}>{children({ align: 'left', onMedia: false })}</div>
          </div>
        </div>);


    case 'mosaic':{
        const extras = extraMedia && extraMedia.length >= 2 ? extraMedia : [src, src];
        return (
          <div {...data} className={cx('mx-auto grid items-center', m ? 'grid-cols-1 gap-9 px-5 py-6' : 'grid-cols-[1fr_1.1fr] gap-14 px-10 py-14')} style={{ maxWidth: 1180 }}>
          <div className={cx('flex flex-col items-start text-left', m && 'order-2')}>
            {avatar && <div className="mb-6">{avatar}</div>}
            {children({ align: 'left', onMedia: false })}
          </div>
          <div className={cx('grid grid-cols-[1.4fr_1fr] grid-rows-2', m && 'order-1')} style={{ gap: m ? 8 : 12, height: Math.round((m ? 300 : 460) * SCALE[heightKey]) }}>
            <div className="relative row-span-2 overflow-hidden" style={{ borderRadius: radius }}>
              {img}
              {decor}
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: radius }}>
              {photo(extras[0], extraMedia ? 'center' : 'left center')}
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: radius }}>
              {photo(extras[1], extraMedia ? 'center' : 'right bottom')}
            </div>
          </div>
        </div>);

      }

    case 'frame':
      return (
        <div {...data} className={cx('mx-auto', m ? 'p-3' : 'p-8')} style={{ maxWidth: 1240 }}>
          <div style={{ background: 'var(--surface)', padding: m ? 10 : 18, borderRadius: radius + (m ? 10 : 18), boxShadow: '0 0 0 1px var(--line)' }}>
            <div className="relative overflow-hidden" style={{ height: H + (m ? 30 : 90), borderRadius: radius }}>
              {img}
              {decor}
            </div>
            <div className={cx('flex', m ? 'flex-col gap-5 px-2 pb-3 pt-6' : 'items-end justify-between gap-10 px-4 pb-4 pt-9')}>
              <div className="flex min-w-0 flex-col items-start text-left">{children({ align: 'left', onMedia: false })}</div>
              {avatar && <div className="shrink-0">{avatar}</div>}
            </div>
          </div>
        </div>);


    case 'bleed':{
        const edge = m ? 0 : shape === 'curve' ? 200 : shape === 'inset' ? radius : 0;
        return (
          <div {...data} className={cx('grid', m ? 'grid-cols-1' : 'grid-cols-2')} style={{ minHeight: m ? undefined : H + 280 }}>
          <div
              className={cx('relative overflow-hidden', m && 'aspect-[4/5]')}
              style={{ borderTopRightRadius: edge, borderBottomRightRadius: edge, margin: shape === 'inset' && !m ? inset : 0 }}>
              
            {img}
            {decor}
          </div>
          <div className={cx('flex flex-col items-start justify-center text-left', m ? 'px-5 py-10' : 'px-16 py-16')}>
            {avatar && <div className="mb-6">{avatar}</div>}
            {children({ align: 'left', onMedia: false })}
          </div>
        </div>);

      }

    default:
      return (
        <div {...data} className="pb-2">
          <div className="relative overflow-hidden" style={{ height: H, ...bandShape }}>
            {img}
            {decor}
          </div>
          <div className="relative flex flex-col items-center px-6 text-center" style={{ marginTop: avatar ? -avatarOverlap : m ? 28 : 44 }}>
            {avatar}
            <div className={cx('flex w-full flex-col items-center', avatar ? 'mt-5' : '')}>{children({ align: 'center', onMedia: false })}</div>
          </div>
        </div>);

  }
}