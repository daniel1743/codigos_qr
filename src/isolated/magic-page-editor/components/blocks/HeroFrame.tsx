import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { cx } from '../../utils/cx';
import type { HeroVariant } from '../../types/editor';
import { useFreeImagePan } from '../editor/controls/PositionPad';
import { Editable } from '../editor/Editable';
import { mediaShapeStyle } from '../../utils/styles';

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
  const variant = p['variant'] as HeroVariant ?? defaultVariant;
  const shape = p['shape'] as HeroShape ?? defaultShape;
  const heightKey = p['height'] as HeroHeight ?? defaultHeight;
  const H = Math.round(HEIGHTS[heightKey] * (m ? 0.68 : 1));
  const curve = m ? 40 : 72;
  const inset = m ? 12 : 20;
  const src = p['src'] ?? media;
  const crop = useFreeImagePan(id, p['cropX'], p['cropY']);
  const data = { 'data-hero': variant, 'data-shape': shape };
  const overlayOpacity = { none: 0, soft: 0.16, medium: 0.32, intense: 0.52 }[p['overlay'] ?? 'none'] ?? 0;
  const overlay = overlayOpacity > 0 ? <span className="pointer-events-none absolute inset-0 z-[1]" style={{ background: p['overlayColor'] ?? '#111318', opacity: overlayOpacity }} /> : null;
  const fusion = p['fusion'] ?? 'none';
  const fusionLayer = fusion !== 'none' ? <span className={cx('pointer-events-none absolute z-[2]', fusion === 'halo' ? '-inset-x-12 -bottom-20 h-64' : fusion === 'organic' ? '-inset-x-8 bottom-0 h-48' : 'inset-x-0 bottom-0', fusion === 'fade' ? 'h-48' : 'h-32')} style={{ background: fusion === 'halo' ? 'radial-gradient(ellipse at 50% 100%, var(--surface) 0%, color-mix(in oklab, var(--surface) 72%, transparent) 38%, transparent 72%)' : fusion === 'dominant' ? 'linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--surface) 72%, transparent) 45%, var(--surface) 100%)' : fusion === 'organic' ? 'linear-gradient(160deg, transparent 30%, color-mix(in oklab, var(--surface) 42%, transparent) 48%, var(--surface) 92%)' : 'linear-gradient(to bottom, transparent 0%, transparent 15%, var(--surface) 96%)' }} /> : null;

  const photo = (url: string, position: string, interactive = false) =>
  <img src={url} alt={mediaAlt} draggable={false} {...(interactive ? crop.handlers : {})} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: p['cropX'] || p['cropY'] ? crop.objectPosition : position, transform: `scale(${p['zoom'] ?? '1'})` }} />;

  const img =
  <Editable id={`${id}:hero-image`} kind="image" label="Imagen de portada" aria-label="Imagen de portada" className="pointer-events-auto absolute inset-0 z-0" style={{ ...mediaShapeStyle(p['mediaShape']) }}>
    {photo(src, p['pos'] ?? 'center', true)}{overlay}{fusionLayer}
  </Editable>;

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
    case 'editorialCenter':
      return <div {...data} {...crop.handlers} className="mx-auto flex max-w-[940px] touch-none flex-col items-center px-8 py-14 text-center"><div className="relative mb-8 aspect-[3/1] w-full overflow-hidden" style={{ borderRadius: radius }}>{img}{decor}</div>{avatar && <div className="relative z-[3] -mt-20 mb-5">{avatar}</div>}<div className="relative z-[3] flex max-w-[590px] flex-col items-center">{children({ align: 'center', onMedia: false })}</div></div>;
    case 'splitHorizontal':
      return <div {...data} {...crop.handlers} className="mx-auto grid max-w-[1160px] touch-none grid-rows-[minmax(260px,1fr)_auto]"><div className="relative overflow-hidden">{img}{decor}</div><div className="flex items-start gap-8 px-10 py-8">{avatar}<div className="relative z-[3] flex flex-1 flex-col items-start">{children({ align: 'left', onMedia: false })}</div></div></div>;
    case 'splitVertical':
      return <div {...data} {...crop.handlers} className={cx('mx-auto grid max-w-[1180px] touch-none', m ? 'grid-cols-1' : 'grid-cols-2')}><div className="relative min-h-[480px] overflow-hidden">{img}{decor}</div><div className="relative z-[3] flex flex-col items-start justify-center border-y border-line p-12">{avatar && <div className="mb-7">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'fullBleed':
      return <div {...data} {...crop.handlers} className="relative flex min-h-[640px] touch-none items-end overflow-hidden">{img}{decor}<div className="relative z-[3] flex w-full max-w-[760px] flex-col items-start p-12" style={onMediaVars}>{avatar && <div className="mb-6">{avatar}</div>}{children({ align: 'left', onMedia: true })}</div></div>;
    case 'photoCard':
      return <div {...data} {...crop.handlers} className="relative mx-auto min-h-[590px] max-w-[1120px] touch-none overflow-hidden p-8">{img}<div className="cq-surface relative z-[3] mt-56 max-w-[500px] p-9 shadow-xl" style={{ borderRadius: radius }}>{avatar && <div className="mb-5">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'avatarBand':
      return <div {...data} {...crop.handlers} className="mx-auto max-w-[1180px] touch-none"><div className="relative h-[260px] overflow-hidden">{img}{decor}</div><div className="flex items-center gap-8 border-b border-line px-10 py-6">{avatar}<div className="relative z-[3] flex flex-1 flex-col items-start">{children({ align: 'left', onMedia: false })}</div></div></div>;
    case 'photoGrid': {
      const extras = extraMedia?.length ? extraMedia : [src, src, src];
      return <div {...data} {...crop.handlers} className="mx-auto grid max-w-[1180px] touch-none gap-3 p-6 md:grid-cols-[1.35fr_1fr]"><div className="relative min-h-[520px] overflow-hidden">{img}</div><div className="grid grid-rows-2 gap-3"><div className="relative overflow-hidden">{photo(extras[0] ?? src, 'left')}</div><div className="relative grid grid-cols-2 gap-3 overflow-hidden"><span className="relative">{photo(extras[1] ?? src, 'center')}</span><span className="relative">{photo(extras[2] ?? src, 'right')}</span></div></div><div className="cq-surface z-[3] p-7 md:absolute md:bottom-10 md:left-10 md:max-w-[480px]" style={{ borderRadius: radius }}>{avatar && <div className="mb-4">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    }
    case 'quote':
      return <div {...data} {...crop.handlers} className="relative flex min-h-[570px] touch-none items-center justify-center overflow-hidden">{img}<div className="pointer-events-none absolute inset-0 bg-black/40" />{decor}<div className="relative z-[3] flex max-w-[760px] flex-col items-center px-8 text-center" style={onMediaVars}>{avatar && <div className="mb-8">{avatar}</div>}{children({ align: 'center', onMedia: true })}</div></div>;
    case 'collage':
      return <div {...data} {...crop.handlers} className="relative mx-auto min-h-[620px] max-w-[1100px] touch-none overflow-hidden px-8 py-14"><div className="absolute left-[5%] top-[8%] h-[68%] w-[58%] rotate-[-3deg] overflow-hidden shadow-xl">{img}</div><div className="absolute right-[7%] top-[18%] h-[52%] w-[38%] rotate-[4deg] overflow-hidden shadow-xl">{photo(extraMedia?.[0] ?? src, 'right')}</div><div className="cq-surface absolute bottom-10 left-[20%] z-[3] max-w-[560px] p-8 shadow-xl" style={{ borderRadius: radius }}>{avatar && <div className="mb-4">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'lowerBlock':
      return <div {...data} {...crop.handlers} className="mx-auto max-w-[1120px] touch-none p-5"><div className="relative h-[400px] overflow-hidden">{img}{decor}</div><div className="cq-surface relative z-[3] mx-auto -mt-16 flex max-w-[820px] flex-col items-center p-9 text-center shadow-xl" style={{ borderRadius: radius }}>{avatar && <div className="mb-5">{avatar}</div>}{children({ align: 'center', onMedia: false })}</div></div>;
    case 'galleryFrame':
      return <div {...data} {...crop.handlers} className="mx-auto max-w-[1080px] touch-none px-8 py-12"><div className="border border-line p-4"><div className="relative aspect-[16/9] overflow-hidden">{img}{decor}</div></div><div className="flex items-start justify-between gap-10 pt-7"><div className="relative z-[3] flex max-w-[700px] flex-col items-start">{children({ align: 'left', onMedia: false })}</div>{avatar}</div></div>;
    case 'sideBleed':
      return <div {...data} {...crop.handlers} className={cx('grid min-h-[620px] touch-none', m ? 'grid-cols-1' : 'grid-cols-[58%_42%]')}><div className="relative overflow-hidden">{img}{decor}</div><div className="relative z-[3] flex flex-col items-start justify-end p-12">{avatar && <div className="mb-7">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'magazine':
      return <div {...data} {...crop.handlers} className="mx-auto max-w-[1180px] touch-none border-y border-line px-8 py-8"><div className="grid gap-8 md:grid-cols-[1fr_1.4fr]"><div className="relative z-[3] flex flex-col items-start justify-between py-3">{avatar}{children({ align: 'left', onMedia: false })}</div><div className="relative min-h-[520px] overflow-hidden">{img}{decor}</div></div></div>;
    case 'elegantOverlay':
      return <div {...data} {...crop.handlers} className="relative mx-auto flex min-h-[590px] max-w-[1180px] touch-none items-center overflow-hidden p-10">{img}<div className="pointer-events-none absolute inset-0 bg-black/25" />{decor}<div className="relative z-[3] max-w-[600px] border border-white/50 bg-black/20 p-9 backdrop-blur-sm" style={onMediaVars}>{avatar && <div className="mb-6">{avatar}</div>}{children({ align: 'left', onMedia: true })}</div></div>;
    case 'backgroundFade':
      return <div {...data} {...crop.handlers} className="relative mx-auto min-h-[620px] max-w-[1180px] touch-none overflow-hidden">{img}{decor}<div className="absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center bg-gradient-to-b from-transparent to-[var(--surface)] px-10 pb-12 pt-40 text-center">{avatar && <div className="mb-5">{avatar}</div>}{children({ align: 'center', onMedia: false })}</div></div>;
    case 'minimalPremium':
      return <div {...data} {...crop.handlers} className="mx-auto grid max-w-[980px] touch-none gap-12 px-10 py-20 md:grid-cols-[220px_1fr]"><div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: radius }}>{img}</div><div className="relative z-[3] flex flex-col items-start justify-center">{avatar && <div className="mb-8">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'sideInfo':
      return <div {...data} {...crop.handlers} className="mx-auto grid max-w-[1180px] touch-none gap-0 md:grid-cols-[180px_1fr_1fr]"><div className="flex items-end border-r border-line p-6">{avatar}</div><div className="relative min-h-[560px] overflow-hidden">{img}{decor}</div><div className="relative z-[3] flex flex-col items-start justify-center p-10">{children({ align: 'left', onMedia: false })}</div></div>;
    case 'descriptionCard':
      return <div {...data} {...crop.handlers} className="mx-auto grid max-w-[1140px] touch-none gap-6 p-7 md:grid-cols-[1.4fr_0.8fr]"><div className="relative min-h-[540px] overflow-hidden" style={{ borderRadius: radius }}>{img}{decor}</div><div className="cq-surface flex flex-col items-start justify-center p-8" style={{ borderRadius: radius }}>{avatar && <div className="mb-6">{avatar}</div>}{children({ align: 'left', onMedia: false })}</div></div>;
    case 'cinematic':
      return <div {...data} {...crop.handlers} className="relative mx-auto flex aspect-[21/9] min-h-[400px] max-w-[1280px] touch-none items-end overflow-hidden">{img}<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />{decor}<div className="relative z-[3] max-w-[650px] p-12" style={onMediaVars}>{avatar && <div className="mb-5">{avatar}</div>}{children({ align: 'left', onMedia: true })}</div></div>;
    case 'brandIdentity':
      return <div {...data} {...crop.handlers} className="mx-auto max-w-[1120px] touch-none px-7 py-10"><div className="grid border-y-2 border-current py-6 md:grid-cols-[1fr_260px]"><div className="relative z-[3] flex flex-col items-start justify-center pr-10">{children({ align: 'left', onMedia: false })}</div><div className="relative aspect-square overflow-hidden rounded-full">{img}{decor}</div></div><div className="flex items-center justify-between pt-5">{avatar}<span className="text-xs uppercase tracking-[0.2em]">Identidad visual</span></div></div>;
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
            {avatar && <div className={cx('absolute z-[3]', m ? '-bottom-8 left-4' : '-bottom-10 -left-10')}>{avatar}</div>}
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
          <div className="relative z-[3] flex flex-col items-start justify-end text-left" style={{ minHeight, padding: m ? '96px 20px 36px' : '140px 56px 60px', ...onMediaVars }}>
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
            <div className="relative z-[3]" style={{ marginTop: -Math.round(avatarOverlap * 0.8) }}>
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
          <div className="relative z-[3] w-full" style={{ padding: m ? '130px 14px 18px' : '170px 32px 40px' }}>
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
             {avatar && <div className="relative z-[3]" style={{ marginTop: -avatarOverlap }}>{avatar}</div>}
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
              {photo(extras[0] ?? src, extraMedia ? 'center' : 'left center')}
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: radius }}>
              {photo(extras[1] ?? src, extraMedia ? 'center' : 'right bottom')}
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
           <div className="relative z-[3] flex flex-col items-center px-6 text-center" style={{ marginTop: avatar ? -avatarOverlap : m ? 28 : 44 }}>
            {avatar}
            <div className={cx('flex w-full flex-col items-center', avatar ? 'mt-5' : '')}>{children({ align: 'center', onMedia: false })}</div>
          </div>
        </div>);

  }
}
