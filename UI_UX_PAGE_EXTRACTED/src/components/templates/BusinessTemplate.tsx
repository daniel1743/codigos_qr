import React from "react";
import { ArrowRightIcon, CalendarDaysIcon, DropletIcon, HomeIcon, MailIcon, PhoneIcon, SparklesIcon, BoxIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { Block } from "../editor/Block";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { EditableImage } from "../editor/EditableImage";
import { EditableAvatar } from "../editor/EditableAvatar";
import { EditableCTA, CtaVariants } from "../editor/EditableCTA";
import { EditableSocial } from "../editor/EditableSocial";
import { PageRoot, useFooterTone } from "../editor/PageRoot";
import { AddBlockSlot } from "../editor/AddBlockSlot";
import { SocialIcon } from "../icons/SocialIcon";
import { HeroFrame } from "../blocks/HeroFrame";
import { GalleryGrid } from "../blocks/GalleryGrid";
import { LocationBlock } from "../blocks/LocationBlock";
import { GenericBlock } from "../blocks/GenericBlock";
import { images } from "../../data/images";
import { bizCta, bizLocation, bizProfile, bizResults, bizServices, bizSocials } from "../../data/businessContent";
import { cx } from "../../utils/cx";
import { blockPrefix, toneVars } from "../../utils/styles";
import { BlockRef } from "../../types/editor";
const serviceIcons: Record<string, BoxIcon> = {
  calendar: CalendarDaysIcon,
  sparkles: SparklesIcon,
  home: HomeIcon,
  droplet: DropletIcon,
  phone: PhoneIcon,
  mail: MailIcon
};
export function BusinessTemplate() {
  const {
    doc,
    isMobile: m
  } = useEditor();
  const t = useThemeTokens();
  const footerTone = useFooterTone();
  const display: React.CSSProperties = {
    fontFamily: t.displayFont
  };
  const petrol = t.tones.find((x) => x.id === 'petroleo') ?? t.tones[0];
  const night = t.tones.find((x) => x.id === 'noche') ?? t.tones[0];
  const cta: CtaVariants = {
    solid: {
      background: t.accent,
      color: t.accentFg
    },
    outline: {
      boxShadow: 'inset 0 0 0 1.5px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: '#E9DCC8',
      color: '#1C2F33'
    }
  };
  const cardCta: CtaVariants = {
    solid: {
      background: '#F4EEE8',
      color: '#1F4E55'
    },
    outline: {
      boxShadow: 'inset 0 0 0 1px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: '#E9DCC8',
      color: '#1C2F33'
    }
  };
  const surfaceCta: CtaVariants = {
    solid: {
      background: t.accent,
      color: t.accentFg
    },
    outline: {
      boxShadow: 'inset 0 0 0 1.5px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: 'var(--surface)',
      color: 'var(--fg)',
      boxShadow: '0 0 0 1px var(--line)'
    }
  };
  const bigCta: CtaVariants = {
    solid: {
      background: night.color,
      color: night.fg
    },
    outline: {
      boxShadow: 'inset 0 0 0 1.5px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: '#E9DCC8',
      color: '#1C2F33'
    }
  };
  const wrap = cx('mx-auto w-full', m ? 'px-5' : 'px-10');
  const wrapStyle: React.CSSProperties = {
    maxWidth: 1180
  };
  const h2 = cx('cq-fg leading-[1.05]', m ? 'text-[32px]' : 'text-[46px]');
  const render = (b: BlockRef) => {
    const p = blockPrefix(b);
    switch (b.type) {
      case 'hero':
        return <Block key={b.key} block={b} defaultSpacing="none">
            <HeroFrame id={`block:${b.key}`} media={images.bizClinic} mediaAlt="Recepción de Clínica Áurea" defaultVariant="split" defaultShape="curve" radius={t.radius} avatar={<EditableAvatar id={`${p}avatar`} src={images.bizPortrait} alt="Dra. Carmen Vidal" sizes={m ? {
            S: 88,
            M: 112,
            L: 140
          } : {
            S: 128,
            M: 168,
            L: 204
          }} defaultShape="arch" ringColor={t.page.color} ringWidth={6} badgeColor={t.accent} />}>
              {({
              align
            }) => <>
                  <EditableText id={`${p}hero.brand`} value={bizProfile.brand} label="Marca" className="cq-fg text-[13px] uppercase tracking-[0.26em]" style={display} />
                  <EditableText id={`${p}hero.title`} value={bizProfile.title} as="h1" label="Título" className={cx('cq-fg mt-5 leading-[1.04]', m ? 'text-[38px]' : 'text-[62px]')} style={display} />
                  <EditableText id={`${p}hero.text`} value={bizProfile.text} label="Descripción" multiline className={cx('cq-muted mt-5 max-w-[480px] leading-relaxed', m ? 'text-[15px]' : 'text-[17px]')} />
                  <div className={cx('mt-8 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
                    <EditableCTA id={`${p}hero.cta`} label={bizProfile.cta} href="https://wa.me/34910000000" variants={cta} className="inline-flex h-[54px] items-center gap-2.5 whitespace-nowrap rounded-full px-7 text-[15px] font-semibold" leading={<CalendarDaysIcon className="h-[18px] w-[18px]" />} />
                    <EditableCTA id={`${p}hero.cta2`} label={bizProfile.cta2} href="#tratamientos" variants={cta} defaultVariant="outline" className="inline-flex h-[54px] items-center whitespace-nowrap rounded-full px-7 text-[15px] font-semibold" />
                  </div>
                  <div className={cx('mt-9 flex flex-wrap items-center gap-2.5', align === 'center' && 'justify-center')}>
                    {bizSocials.map((s, i) => <EditableSocial key={s.platform} id={`${p}hero.social.${i}`} platform={s.platform} href={s.href} size={40} defaultStyle="square" />)}
                    <EditableText id={`${p}hero.byline`} value={bizProfile.byline} label="Firma" className="cq-muted ml-2 text-[13px]" />
                  </div>
                </>}
            </HeroFrame>
          </Block>;
      case 'collection':
        {
          const layout = doc.props[`block:${b.key}`]?.layout ?? 'lista';
          return <Block key={b.key} block={b} defaultTone="blanco">
            <div className={wrap} style={wrapStyle}>
              <div className={cx('mb-9 flex gap-4', m ? 'flex-col' : 'items-end justify-between')}>
                <EditableText id={`${p}collection.title`} value="Tratamientos" as="h2" label="Título" className={h2} style={display} />
                <EditableText id={`${p}collection.sub`} value="Cada piel es distinta. Empezamos siempre por conocer la tuya." label="Subtítulo" className="cq-muted max-w-[360px] text-[15px] leading-relaxed" />
              </div>
              <div data-collection={layout} className={cx('grid gap-5', layout === 'lista' ? m ? 'grid-cols-1' : 'grid-cols-2' : m ? 'grid-cols-1' : 'grid-cols-4')}>
                {bizServices.map((s, i) => {
                  const cid = `${p}collection.${i}`;
                  const Icon = serviceIcons[s.icon];
                  if (layout === 'lista') {
                    return <Editable key={s.title} id={cid} kind="card" label="Card de servicio" className="relative grid overflow-hidden" style={{
                      ...toneVars(petrol),
                      background: petrol.color,
                      borderRadius: t.radius,
                      gridTemplateColumns: m ? '1fr 36%' : '1fr 40%',
                      minHeight: m ? 176 : 214
                    }}>
                        <div className={cx('flex flex-col items-start', m ? 'p-4' : 'p-6')}>
                          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{
                          background: 'rgba(244,238,232,0.12)',
                          color: '#E9DCC8'
                        }}>
                            <Icon className="h-5 w-5" strokeWidth={1.7} />
                          </span>
                          <EditableText id={`${cid}.title`} value={s.title} as="h3" label="Título" className={cx('cq-fg mt-4 uppercase leading-tight tracking-[0.03em]', m ? 'text-[17px]' : 'text-[21px]')} style={display} />
                          <EditableText id={`${cid}.desc`} value={s.desc} label="Descripción" className="cq-muted mt-1.5 text-[13.5px] leading-snug" />
                          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                            <EditableCTA id={`${cid}.cta`} label={s.cta} href="https://wa.me/34910000000" variants={cardCta} defaultVariant="soft" className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[12px] font-bold uppercase tracking-[0.08em]" />
                            {!m && <EditableText id={`${cid}.price`} value={s.price} as="span" label="Precio" className="cq-muted text-[13px]" />}
                          </div>
                        </div>
                        <EditableImage id={`${cid}.img`} src={s.img} alt={s.title} className="h-full" />
                      </Editable>;
                  }
                  return <Editable key={s.title} id={cid} kind="card" label="Card de servicio" className="cq-surface flex flex-col overflow-hidden" style={{
                    borderRadius: t.radius,
                    boxShadow: '0 0 0 1px var(--line)'
                  }}>
                      <EditableImage id={`${cid}.img`} src={s.img} alt={s.title} className="aspect-[4/3] w-full" />
                      <div className="flex flex-1 flex-col p-5">
                        <EditableText id={`${cid}.title`} value={s.title} as="h3" label="Título" className="cq-fg text-[19px] leading-tight" style={display} />
                        <EditableText id={`${cid}.desc`} value={s.desc} label="Descripción" className="cq-muted mt-2 text-[13.5px] leading-snug" />
                        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                          <EditableText id={`${cid}.price`} value={s.price} as="span" label="Precio" className="cq-fg text-[14px] font-semibold" />
                          <EditableCTA id={`${cid}.cta`} label={s.cta} href="https://wa.me/34910000000" variants={surfaceCta} className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[12.5px] font-semibold" />
                        </div>
                      </div>
                    </Editable>;
                })}
              </div>
            </div>
          </Block>;
        }
      case 'links':
        return <Block key={b.key} block={b}>
            <div className={wrap} style={{
            maxWidth: 1100
          }}>
              <EditableText id={`${p}links.title`} value="¿Hablamos?" as="h2" label="Título" className={h2} style={display} />
              <EditableCTA id={`${p}links.cta`} elementLabel="Bloque CTA" label={bizCta.title} sub={bizCta.sub} href="https://wa.me/34910000000" variants={bigCta} fullDefault className={cx('mt-7 flex items-center gap-5 rounded-[28px] text-left', m ? 'px-5 py-6' : 'px-9 py-9')} labelClassName={cx('leading-tight', m ? 'text-[23px]' : 'text-[34px]')} labelStyle={display} subClassName="mt-2 text-[14px] opacity-75" leading={<span className={cx('grid shrink-0 place-items-center rounded-2xl', m ? 'h-12 w-12' : 'h-16 w-16')} style={{
              background: '#C3A274',
              color: '#13272B'
            }}>
                    <SocialIcon platform="whatsapp" className={m ? 'h-6 w-6' : 'h-8 w-8'} />
                  </span>} trailing={m ? undefined : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{
              boxShadow: 'inset 0 0 0 1px currentColor'
            }}>
                      <ArrowRightIcon className="h-5 w-5" />
                    </span>} />
              <div className={cx('mt-3 grid gap-3', m ? 'grid-cols-1' : 'grid-cols-2')}>
                {bizCta.secondary.map((s, i) => {
                const Icon = serviceIcons[s.icon];
                return <EditableCTA key={s.label} id={`${p}links.${i + 1}`} label={s.label} sub={s.sub} href={i === 0 ? 'tel:+34910000000' : 'mailto:hola@clinicaaurea.es'} variants={surfaceCta} defaultVariant="soft" fullDefault className="flex min-h-[80px] items-center gap-4 rounded-[22px] px-5 py-4 text-left" labelClassName="text-[16px] font-semibold" subClassName="cq-muted mt-0.5 text-[13px]" leading={<span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{
                  background: 'var(--surface)',
                  boxShadow: '0 0 0 1px var(--line)'
                }}>
                          <Icon className="h-5 w-5" strokeWidth={1.7} />
                        </span>} trailing={<ArrowRightIcon className="h-5 w-5 shrink-0 opacity-60" />} />;
              })}
              </div>
            </div>
          </Block>;
      case 'gallery':
        return <Block key={b.key} block={b} defaultTone="blanco">
            <div className={cx(wrap, 'grid items-center', m ? 'grid-cols-1 gap-7' : 'grid-cols-[0.75fr_1.6fr] gap-14')} style={wrapStyle}>
              <div>
                <EditableText id={`${p}gallery.title`} value="Resultados reales" as="h2" label="Título" className={h2} style={display} />
                <EditableText id={`${p}gallery.sub`} value="Piel más luminosa, hidratada y uniforme. Siempre natural, siempre con seguimiento." label="Subtítulo" multiline className="cq-muted mt-4 text-[15px] leading-relaxed" />
              </div>
              <GalleryGrid id={`${p}gallery`} items={bizResults} defaultLayout="mosaico" radius={t.radius} altPrefix="Resultado" rowHeight={190} />
            </div>
          </Block>;
      case 'location':
        return <Block key={b.key} block={b}>
            <LocationBlock prefix={p} title={bizLocation.title} name={bizLocation.name} address={bizLocation.address} hours={bizLocation.hours} radius={t.radius} accent={t.accent} displayFont={t.displayFont} ctaVariants={cta} />
          </Block>;
      default:
        return <Block key={b.key} block={b} defaultSpacing={b.type === 'hero' ? 'none' : 'M'}>
            <GenericBlock block={b} ctaVariants={cta} />
          </Block>;
    }
  };
  return <PageRoot>
      {doc.blocks.map(render)}
      <AddBlockSlot />
      <Editable id="footer" kind="section" label="Pie de página" as="footer" className={cx('flex gap-6', m ? 'flex-col px-5 py-10' : 'items-center justify-between px-10 py-12')} style={{
      ...toneVars(night),
      background: night.color,
      ...footerTone
    }}>
        <div>
          <EditableText id="footer.brand" value="Áurea" label="Marca" className="cq-fg text-[30px] tracking-[0.08em]" style={display} />
          <EditableText id="footer.note" value="Estética avanzada · Calle de Serrano 48, Madrid" label="Nota" className="cq-muted mt-1 text-[13px]" />
        </div>
        <div className="flex items-center gap-2.5">
          {bizSocials.map((s, i) => <EditableSocial key={s.platform} id={`footer.social.${i}`} platform={s.platform} href={s.href} size={40} />)}
        </div>
        <EditableText id="footer.legal" value="© 2026 Clínica Áurea · Hecho con Cripqer" label="Aviso" className="cq-muted text-[12px]" />
      </Editable>
    </PageRoot>;
}