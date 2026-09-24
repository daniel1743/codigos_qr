import React from 'react';
import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Block } from '../editor/Block';
import { Editable } from '../editor/Editable';
import { EditableText } from '../editor/EditableText';
import { EditableImage } from '../editor/EditableImage';
import { EditableAvatar } from '../editor/EditableAvatar';
import { EditableCTA, type CtaVariants } from '../editor/EditableCTA';
import { EditableSocial } from '../editor/EditableSocial';
import { PageRoot, useFooterTone } from '../editor/PageRoot';
import { AddBlockSlot } from '../editor/AddBlockSlot';
import { HeroFrame } from '../blocks/HeroFrame';
import { GalleryGrid } from '../blocks/GalleryGrid';
import { GenericBlock } from '../blocks/GenericBlock';
import { images } from '../../data/images';
import { pfContact, pfGallery, pfProfile, pfProjects, pfSocials, pfStatement } from '../../data/portfolioContent';
import { cx } from '../../utils/cx';
import { blockPrefix } from '../../utils/styles';
import type { BlockRef } from '../../types/editor';

export function PortfolioTemplate() {
  const { doc, isMobile: m } = useEditor();
  const t = useThemeTokens();
  const footerTone = useFooterTone();
  const display: React.CSSProperties = { fontFamily: t.displayFont, fontWeight: 400 };

  const cta: CtaVariants = {
    solid: { background: t.accent, color: t.accentFg },
    outline: { boxShadow: 'inset 0 0 0 1px var(--fg)', color: 'var(--fg)' },
    soft: { background: 'var(--surface)', color: 'var(--fg)' }
  };
  const inkCta: CtaVariants = {
    solid: { background: 'var(--fg)', color: 'var(--surface)' },
    outline: { boxShadow: 'inset 0 0 0 1px var(--fg)', color: 'var(--fg)' },
    soft: { background: 'var(--surface)', color: 'var(--fg)' }
  };
  const btn = 'inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-[4px] px-6 text-[12.5px] font-medium uppercase tracking-[0.16em]';
  const wrap = cx('mx-auto w-full', m ? 'px-5' : 'px-14');
  const wrapStyle: React.CSSProperties = { maxWidth: 1240 };

  const render = (b: BlockRef) => {
    const p = blockPrefix(b);
    switch (b.type) {
      case 'hero':
        return (
          <Block key={b.key} block={b} defaultSpacing="none">
            <HeroFrame
              id={`block:${b.key}`}
              media={images.pfHero}
              mediaAlt="Muro curvo de hormigón iluminado por el sol"
              defaultVariant="image"
              defaultShape="straight"
              defaultHeight="L"
              radius={t.radius}
              decor={
              <div className={cx('absolute inset-x-0 top-0 flex items-center justify-between', m ? 'px-5 pt-5' : 'px-14 pt-8')}>
                  <EditableText id={`${p}hero.studio`} value={pfProfile.studio} as="span" label="Marca" className={cx('italic text-[#F7F4EE]', m ? 'text-[20px]' : 'text-[24px]')} style={display} />
                  <EditableText id={`${p}hero.place`} value={pfProfile.place} as="span" label="Lugar y año" className="text-[11.5px] uppercase tracking-[0.2em] text-[#F7F4EE]/80" />
                </div>
              }
              avatar={
              <EditableAvatar
                id={`${p}avatar`}
                src={images.pfAvatar}
                alt="Andrés Olmo"
                sizes={m ? { S: 44, M: 56, L: 72 } : { S: 52, M: 68, L: 88 }}
                ringColor="#ECE6DB"
                ringWidth={2}
                badgeColor="#121211" />

              }>
              
              {({ align }) =>
              <>
                  <EditableText id={`${p}hero.kicker`} value={pfProfile.kicker} label="Antetítulo" className="cq-muted text-[13.5px] tracking-[0.02em]" />
                  <EditableText
                  id={`${p}hero.title`}
                  value={pfProfile.title}
                  as="h1"
                  label="Título"
                  className={cx('cq-fg mt-4 italic leading-[0.94]', m ? 'text-[54px]' : 'text-[116px]', align === 'center' && 'text-center')}
                  style={display} />
                
                  <div className={cx('mt-9 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
                    <EditableCTA id={`${p}hero.cta`} label={pfProfile.cta} href="#proyectos" variants={cta} defaultVariant="outline" className={btn} trailing={<ArrowDownRightIcon className="h-4 w-4" />} />
                  </div>
                </>
              }
            </HeroFrame>
          </Block>);

      case 'text':
        return (
          <Block key={b.key} block={b} defaultSpacing="L">
            <div className={cx(wrap, 'grid', m ? 'grid-cols-1 gap-5' : 'grid-cols-[220px_1fr] gap-16')} style={wrapStyle}>
              <EditableText id={`${p}text.label`} value={pfStatement.label} label="Etiqueta" className="cq-muted pt-3 text-[12px] uppercase tracking-[0.22em]" />
              <div>
                <EditableText id={`${p}text.body`} value={pfStatement.body} label="Párrafo" multiline className={cx('cq-fg leading-[1.2]', m ? 'text-[27px]' : 'text-[46px]')} style={display} />
                <EditableText id={`${p}text.sub`} value={pfStatement.sub} label="Texto secundario" multiline className="cq-muted mt-8 max-w-[560px] text-[15px] leading-relaxed" />
              </div>
            </div>
          </Block>);

      case 'gallery':
        return (
          <Block key={b.key} block={b}>
            <div className={wrap} style={wrapStyle}>
              <div className="mb-7 flex items-baseline justify-between gap-4">
                <EditableText id={`${p}gallery.title`} value="Selección 2024 — 2026" as="h2" label="Título" className={cx('cq-fg italic', m ? 'text-[28px]' : 'text-[38px]')} style={display} />
                <EditableText id={`${p}gallery.count`} value="Galería" as="span" label="Etiqueta" className="cq-muted whitespace-nowrap text-[12px] uppercase tracking-[0.2em]" />
              </div>
              <GalleryGrid id={`${p}gallery`} items={pfGallery} defaultLayout="mosaico" radius={t.radius} altPrefix="Fotografía" rowHeight={250} />
            </div>
          </Block>);

      case 'collection':{
          const layout = doc.props[`block:${b.key}`]?.layout ?? 'lista';
          return (
            <Block key={b.key} block={b}>
            <div className={wrap} style={wrapStyle}>
              <EditableText id={`${p}collection.title`} value="Proyectos" as="h2" label="Título" className={cx('cq-fg mb-8 italic', m ? 'text-[34px]' : 'text-[52px]')} style={display} />
              {layout === 'lista' ?
                <div data-collection="lista" className="cq-line border-b">
                  {pfProjects.map((pr, i) => {
                    const cid = `${p}collection.${i}`;
                    return (
                      <Editable
                        key={pr.title}
                        id={cid}
                        kind="card"
                        label="Proyecto"
                        className={cx('cq-line grid items-center border-t', m ? 'grid-cols-[88px_1fr] gap-4 py-4' : 'grid-cols-[180px_1fr_auto_auto] gap-10 py-6')}>
                        
                        <EditableImage id={`${cid}.img`} src={pr.img} alt={pr.title} className={m ? 'aspect-square' : 'aspect-[4/3]'} style={{ borderRadius: t.radius }} />
                        <div className="min-w-0">
                          <EditableText id={`${cid}.title`} value={pr.title} as="h3" label="Título" className={cx('cq-fg italic leading-none', m ? 'text-[26px]' : 'text-[44px]')} style={display} />
                          <EditableText id={`${cid}.meta`} value={pr.meta} label="Detalle" className="cq-muted mt-2 text-[13px]" />
                        </div>
                        {!m && <EditableText id={`${cid}.year`} value={pr.year} as="span" label="Año" className="cq-muted text-[13px] tabular-nums" />}
                        {!m && <ArrowUpRightIcon className="cq-fg h-5 w-5" strokeWidth={1.5} />}
                      </Editable>);

                  })}
                </div> :

                <div data-collection="grid" className={cx('grid gap-6', m ? 'grid-cols-1' : 'grid-cols-3')}>
                  {pfProjects.map((pr, i) => {
                    const cid = `${p}collection.${i}`;
                    return (
                      <Editable key={pr.title} id={cid} kind="card" label="Proyecto" className="flex flex-col">
                        <EditableImage id={`${cid}.img`} src={pr.img} alt={pr.title} className="aspect-[4/5] w-full" style={{ borderRadius: t.radius }} />
                        <div className="mt-4 flex items-baseline justify-between gap-3">
                          <EditableText id={`${cid}.title`} value={pr.title} as="h3" label="Título" className="cq-fg text-[28px] italic leading-none" style={display} />
                          <EditableText id={`${cid}.year`} value={pr.year} as="span" label="Año" className="cq-muted text-[13px] tabular-nums" />
                        </div>
                        <EditableText id={`${cid}.meta`} value={pr.meta} label="Detalle" className="cq-muted mt-1.5 text-[13px]" />
                      </Editable>);

                  })}
                </div>
                }
            </div>
          </Block>);

        }
      case 'links':
        return (
          <Block key={b.key} block={b} defaultTone="hueso" defaultSpacing="L">
            <div className={cx(wrap, 'grid', m ? 'grid-cols-1 gap-8' : 'grid-cols-[1.35fr_1fr] items-end gap-16')} style={wrapStyle}>
              <div>
                <EditableText id={`${p}links.title`} value={pfContact.title} as="h2" label="Título" className={cx('cq-fg italic leading-[1]', m ? 'text-[40px]' : 'text-[76px]')} style={display} />
                <EditableText id={`${p}links.sub`} value={pfContact.sub} label="Subtítulo" multiline className="cq-muted mt-6 max-w-[480px] text-[16px] leading-relaxed" />
              </div>
              <div className="flex flex-col gap-3">
                <EditableCTA
                  id={`${p}links.cta`}
                  label={pfContact.cta}
                  href="mailto:estudio@olmo.photo"
                  variants={inkCta}
                  fullDefault
                  className={cx(btn, 'h-16 justify-between')}
                  trailing={<ArrowUpRightIcon className="h-4 w-4" />} />
                
                <EditableCTA
                  id={`${p}links.cta2`}
                  label={pfContact.cta2}
                  href="https://olmo.photo/portfolio.pdf"
                  variants={inkCta}
                  defaultVariant="outline"
                  fullDefault
                  className={cx(btn, 'h-16 justify-between')}
                  trailing={<ArrowDownRightIcon className="h-4 w-4" />} />
                
              </div>
            </div>
          </Block>);

      case 'social':
        return (
          <Block key={b.key} block={b} defaultSpacing="S">
            <div className={cx(wrap, 'flex flex-wrap items-center gap-2')} style={wrapStyle}>
              <EditableText id={`${p}social.label`} value="En otros sitios" as="span" label="Etiqueta" className="cq-muted mr-3 text-[12px] uppercase tracking-[0.2em]" />
              {pfSocials.map((s, i) =>
              <EditableSocial key={s.platform} id={`${p}social.${i}`} platform={s.platform} href={s.href} size={42} defaultStyle="plain" />
              )}
            </div>
          </Block>);

      default:
        return (
          <Block key={b.key} block={b} defaultSpacing={b.type === 'hero' ? 'none' : 'M'}>
            <GenericBlock block={b} ctaVariants={cta} maxWidth={1240} />
          </Block>);

    }
  };

  return (
    <PageRoot>
      {doc.blocks.map(render)}
      <AddBlockSlot />
      <Editable
        id="footer"
        kind="section"
        label="Pie de página"
        as="footer"
        className={cx('cq-line flex border-t', m ? 'flex-col gap-2 px-5 py-8' : 'items-center justify-between px-14 py-8')}
        style={footerTone}>
        
        <EditableText id="footer.name" value="© 2026 Andrés Olmo — Olmo Estudio" label="Aviso" className="cq-muted text-[12.5px]" />
        <EditableText id="footer.brand" value="Hecho con Cripqer" label="Marca" className="cq-muted text-[12.5px]" />
      </Editable>
    </PageRoot>);

}