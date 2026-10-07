import React, { type CSSProperties } from 'react';
import { ArrowUpRightIcon, MapPinIcon, MessageCircleIcon } from 'lucide-react';
import { headingStyle } from '../../utils/templateStyle';
import type { HeroSpec, PageContent, TemplateFamily } from '../../types/cripqer';

interface TemplateHeroProps {
  template: TemplateFamily;
  content: PageContent;
}

/* Contract hero controls → rendered values */
const HEIGHT: Record<HeroSpec['height'], number> = { S: 380, M: 470, L: 580 };
const OVERLAY: Record<HeroSpec['overlay'], number> = { none: 0, soft: 0.28, medium: 0.45, intense: 0.62 };

function fusionMask(fusion: HeroSpec['fusion'], direction: 'bottom' | 'left'): CSSProperties | undefined {
  if (fusion !== 'fade') return undefined;
  const g =
  direction === 'bottom' ?
  'linear-gradient(to bottom, #000 55%, transparent 100%)' :
  'linear-gradient(to left, #000 50%, transparent 100%)';
  return { WebkitMaskImage: g, maskImage: g };
}

const accentBtn =
'inline-flex h-11 items-center justify-center gap-2 px-5 text-[13.5px] font-semibold bg-[var(--t-accent)] text-[color:var(--t-accent-text)]';

export function TemplateHero({ template: t, content: c }: TemplateHeroProps) {
  const h = (extra?: CSSProperties) => headingStyle(t, extra);
  const height = HEIGHT[t.hero.height];
  const overlay = OVERLAY[t.hero.overlay];
  const img = c.images.hero;

  switch (t.hero.variant) {
    case 'backgroundFade':
      return (
        <section>
          <div className="relative" style={{ height: height - 150 }}>
            <img src={img} alt="" className="h-full w-full object-cover object-[50%_35%]" style={fusionMask(t.hero.fusion, 'bottom')} />
            <span className="absolute left-5 top-5 rounded-full bg-[var(--t-surface)] px-3.5 py-1.5 text-[13px] font-semibold shadow-sm" style={{ fontFamily: t.font.heading }}>
              {c.name}
            </span>
          </div>
          <div className="relative -mt-12 px-6">
            <h1 className="text-[33px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--t-muted)]">{c.about}</p>
            <span className={`${accentBtn} mt-5 rounded-full`}>
              <MessageCircleIcon className="h-4 w-4" />
              {c.cta}
            </span>
          </div>
        </section>);


    case 'cinematic':
      return (
        <section className="relative overflow-hidden" style={{ height }}>
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
          <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
          <div className="absolute inset-x-0 top-0 p-6">
            <p className="text-[22px] uppercase tracking-[0.12em]" style={{ fontFamily: t.font.heading }}>
              {c.name}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.4em] text-[color:var(--t-muted)]">{c.role}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="mb-5 h-px w-12 bg-[var(--t-accent)]" />
            <h1 className="text-[38px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--t-muted)]">{c.about}</p>
            <span className="mt-6 inline-flex h-11 items-center rounded-full border border-[color:var(--t-accent)] px-6 text-[13px] font-semibold text-[color:var(--t-accent)]">
              {c.cta}
            </span>
          </div>
        </section>);


    case 'elegantOverlay':
      return (
        <section className="relative overflow-hidden" style={{ height }}>
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#3B2A2C]" style={{ opacity: overlay }} />
          <div className="absolute inset-0 flex flex-col items-center justify-end px-8 pb-14 text-center text-white">
            <span className="text-[34px]" style={{ fontFamily: t.font.script }}>
              {c.eyebrow}
            </span>
            <h1 className="mt-1 text-[46px] leading-tight" style={h({ fontWeight: 500 })}>
              {c.name}
            </h1>
            <p className="mt-2 text-[15px] text-white/90">{c.tagline}</p>
            <span className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-7 text-[13px] font-semibold tracking-wide text-[#3B2A2C]">
              {c.cta}
            </span>
          </div>
        </section>);


    case 'fullBleed':
      return (
        <section className="relative overflow-hidden text-white" style={{ height }}>
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#1A100A]" style={{ opacity: overlay }} />
          <div className="absolute inset-x-0 top-0 pt-7 text-center">
            <p className="text-[22px] uppercase tracking-[0.14em]" style={{ fontFamily: t.font.heading }}>
              {c.name}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.4em] text-white/80">{c.role}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-[36px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <p className="mt-2 text-[14px] text-white/90">{c.about}</p>
            <div className="mt-5 flex gap-2">
              <span className={`${accentBtn} flex-1 rounded-full`}>{c.links[0] ?? 'Ver más'}</span>
              <span className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-[13.5px] font-semibold text-[#2B1D14]">
                <MessageCircleIcon className="h-4 w-4" />
                WhatsApp
              </span>
            </div>
          </div>
        </section>);


    case 'editorialCenter':
      return (
        <section className="px-7 pt-10 text-center">
          <img src={c.images.portrait} alt="" className="mx-auto h-24 w-24 rounded-full object-cover object-top" />
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.3em] text-[color:var(--t-muted)]">{c.name}</p>
          <div className="mx-auto mt-4 h-px w-16 bg-[var(--t-accent)]" />
          <h1 className="mt-7 text-[36px] leading-tight" style={h()}>
            {c.tagline}
          </h1>
          <p className="mt-4 text-[14px] text-[color:var(--t-muted)]">{c.role}</p>
          <span className={`${accentBtn} mt-7 rounded-[6px]`}>{c.cta}</span>
          <div className="mt-10 h-[240px] overflow-hidden rounded-[6px]">
            <img src={c.images.gallery[0] ?? img} alt="" className="h-full w-full object-cover" />
          </div>
        </section>);


    case 'sideBleed':
      return (
        <section className="relative overflow-hidden" style={{ height }}>
          <img
            src={img}
            alt=""
            className="absolute right-0 top-0 h-[70%] w-[72%] object-cover object-top"
            style={fusionMask(t.hero.fusion, 'left')} />
          
          <div className="absolute left-6 top-7">
            <p className="text-[24px] leading-tight" style={h()}>
              {c.name}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-[color:var(--t-muted)]">{c.role}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-8">
            <h1 className="max-w-[280px] text-[34px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <p className="mt-3 max-w-[300px] text-[13.5px] leading-relaxed text-[color:var(--t-muted)]">{c.about}</p>
            <span className={`${accentBtn} mt-5 rounded-full`}>{c.cta}</span>
          </div>
        </section>);


    case 'splitHorizontal':
      return (
        <section>
          <div className="overflow-hidden bg-[var(--t-accent)]" style={{ height: height - 240 }}>
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--t-accent)]">{c.eyebrow}</span>
              <span className="text-[12px] font-semibold">{c.name}</span>
            </div>
            <h1 className="mt-3 text-[32px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <div className="mt-5 flex items-center justify-between rounded-[14px] bg-[var(--t-surface)] p-3 pl-4">
              <div>
                <p className="text-[11px] text-[color:var(--t-muted)]">{c.services[0]?.title}</p>
                <p className="text-[20px] font-bold">{c.services[0]?.price}</p>
              </div>
              <span className={`${accentBtn} rounded-[10px]`}>{c.cta}</span>
            </div>
          </div>
        </section>);


    case 'minimalPremium':
      return (
        <section className="px-7 pt-8">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
            <span>{c.name}</span>
            <span className="text-[color:var(--t-muted)]">{c.eyebrow}</span>
          </div>
          <h1 className="mt-20 text-[30px] leading-snug" style={h()}>
            {c.tagline}
          </h1>
          <div className="mt-12 h-[340px] overflow-hidden">
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-[color:var(--t-muted)]">
            <span>{c.imageCards[0]?.title}</span>
            <span>{c.imageCards[0]?.detail}</span>
          </div>
        </section>);


    case 'collage':
      return (
        <section className="px-5 pt-6">
          <div className="grid grid-cols-5 grid-rows-2 gap-2" style={{ height: 320 }}>
            <img src={img} alt="" className="col-span-3 row-span-2 h-full w-full object-cover" />
            <div className="col-span-2 flex flex-col justify-end bg-[var(--t-accent)] p-3 text-[color:var(--t-accent-text)]">
              <span className="text-[11px] font-bold uppercase tracking-wide">{c.eyebrow}</span>
            </div>
            <img src={c.images.gallery[1] ?? img} alt="" className="col-span-2 h-full w-full object-cover" />
          </div>
          <h1 className="mt-6 text-[48px] leading-none" style={h()}>
            {c.name}
          </h1>
          <p className="mt-3 text-[16px] font-medium">
            {c.role} — {c.tagline}
          </p>
          <span className={`${accentBtn} mt-5 border-2 border-[color:var(--t-text)]`}>
            {c.cta}
            <ArrowUpRightIcon className="h-4 w-4" />
          </span>
        </section>);


    case 'avatarBand':
      return (
        <section>
          <div className="h-[170px] overflow-hidden bg-[var(--t-accent)]">
            <img src={c.images.gallery[0] ?? img} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="px-6">
            <img src={c.images.portrait} alt="" className="-mt-14 h-28 w-28 rounded-full border-4 border-[color:var(--t-bg)] object-cover object-top" />
            <h1 className="mt-4 text-[30px] leading-tight" style={h()}>
              {c.name}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--t-muted)]">{c.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F2E6] px-3 py-1 font-medium text-[#24603A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2F8A4C]" />
                {c.eyebrow}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--t-border)] bg-[var(--t-surface)] px-3 py-1 text-[color:var(--t-muted)]">
                <MapPinIcon className="h-3 w-3" />
                {c.location.address.split(',')[0]}
              </span>
            </div>
            <span className={`${accentBtn} mt-5 w-full rounded-[14px]`}>
              <MessageCircleIcon className="h-4 w-4" />
              {c.cta}
            </span>
          </div>
        </section>);


    case 'magazine':
      return (
        <section className="relative overflow-hidden text-white" style={{ height }}>
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
          <div className="absolute inset-0 bg-[#1E140A]" style={{ opacity: overlay }} />
          <div className="absolute inset-x-0 top-0 p-6">
            <p className="text-[34px] uppercase leading-none tracking-[0.22em]" style={{ fontFamily: t.font.heading, fontWeight: 500 }}>
              {c.name}
            </p>
            <p className="mt-2 text-[9px] uppercase tracking-[0.45em] text-white/80">{c.role}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/75">{c.eyebrow}</p>
            <h1 className="mt-2 text-[40px] leading-tight" style={h()}>
              {c.tagline}
            </h1>
            <p className="mt-2 text-[13.5px] text-white/85">{c.about}</p>
            <span className="mt-5 inline-flex h-11 items-center rounded-full bg-[#FFFDF8] px-6 text-[13px] font-semibold text-[#1E1A15]">
              {c.cta}
            </span>
          </div>
        </section>);


    case 'galleryFrame':
      return (
        <section className="px-5 pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">{c.name}</span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--t-muted)]">{c.eyebrow}</span>
          </div>
          <div className="mt-5 bg-[var(--t-surface)] p-3">
            <img src={img} alt="" className="w-full object-cover" style={{ height: height - 180 }} />
            <div className="flex justify-between pt-3 text-[11px] text-[color:var(--t-muted)]">
              <span>{c.imageCards[0]?.title}</span>
              <span>01 / 24</span>
            </div>
          </div>
          <h1 className="mt-7 text-[26px] leading-snug" style={h()}>
            {c.tagline}
          </h1>
        </section>);

  }
}