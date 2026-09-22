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
  children: (ctx: HeroContext) => React.ReactNode;
}

const HEIGHTS: Record<HeroHeight, number> = { S: 220, M: 320, L: 460 };

/** One hero structure, four variants. Templates only supply the skin (content, avatar, decor). */
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
  children
}: HeroFrameProps) {
  const { doc, isMobile: m } = useEditor();
  const p = doc.props[id] ?? {};
  const variant = p.variant as HeroVariant ?? defaultVariant;
  const shape = p.shape as HeroShape ?? defaultShape;
  const H = Math.round(HEIGHTS[p.height as HeroHeight ?? defaultHeight] * (m ? 0.68 : 1));
  const curve = m ? 40 : 72;
  const inset = m ? 12 : 20;

  const img =
  <img
    src={p.src ?? media}
    alt={mediaAlt}
    draggable={false}
    className="absolute inset-0 h-full w-full object-cover"
    style={{ objectPosition: p.pos ?? 'center' }} />;



  const bandShape: React.CSSProperties =
  shape === 'curve' ?
  { borderBottomLeftRadius: `50% ${curve}px`, borderBottomRightRadius: `50% ${curve}px` } :
  shape === 'inset' ?
  { borderRadius: radius, margin: inset } :
  {};

  if (variant === 'split') {
    const frameRadius = shape === 'curve' ? `9999px 9999px ${radius}px ${radius}px` : shape === 'inset' ? `${radius}px` : '0px';
    return (
      <div
        data-hero={variant}
        data-shape={shape}
        className={cx('mx-auto grid items-center', m ? 'grid-cols-1 gap-12 px-5 pb-6 pt-5' : 'grid-cols-[1.05fr_1fr] gap-16 px-10 py-16')}
        style={{ maxWidth: 1180 }}>
        
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

  if (variant === 'image') {
    const minHeight = H + (m ? 250 : 210);
    return (
      <div data-hero={variant} data-shape={shape} className="relative overflow-hidden" style={{ minHeight, ...bandShape }}>
        {img}
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,11,0.48)' }} />
        {decor}
        <div
          className="relative flex flex-col items-start justify-end text-left"
          style={
          {
            minHeight,
            padding: m ? '96px 20px 36px' : '140px 56px 60px',
            '--fg': '#F7F4EE',
            '--muted': 'rgba(247,244,238,0.8)',
            '--line': 'rgba(247,244,238,0.35)',
            '--surface': 'rgba(255,255,255,0.14)',
            color: 'var(--fg)'
          } as React.CSSProperties
          }>
          
          {avatar && <div className="mb-6">{avatar}</div>}
          {children({ align: 'left', onMedia: true })}
        </div>
      </div>);

  }

  if (variant === 'simple') {
    return (
      <div
        data-hero={variant}
        data-shape={shape}
        className="flex flex-col items-center text-center"
        style={{ background: 'var(--surface)', padding: m ? '52px 20px' : '84px 40px', ...(shape === 'inset' ? { borderRadius: radius, margin: inset } : {}) }}>
        
        {avatar && <div className="mb-6">{avatar}</div>}
        {children({ align: 'center', onMedia: false })}
      </div>);

  }

  return (
    <div data-hero={variant} data-shape={shape} className="pb-2">
      <div className="relative overflow-hidden" style={{ height: H, ...bandShape }}>
        {img}
        {decor}
      </div>
      <div
        className="relative flex flex-col items-center px-6 text-center"
        style={{ marginTop: avatar ? -avatarOverlap : m ? 28 : 44 }}>
        
        {avatar}
        <div className={cx('flex w-full flex-col items-center', avatar ? 'mt-5' : '')}>{children({ align: 'center', onMedia: false })}</div>
      </div>
    </div>);

}