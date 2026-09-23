import React from "react";
import { ArrowRightIcon, BookOpenIcon, CalendarDaysIcon, MailIcon, MessageCircleIcon, BoxIcon } from "lucide-react";
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
import { HeroFrame } from "../blocks/HeroFrame";
import { GalleryGrid } from "../blocks/GalleryGrid";
import { GenericBlock } from "../blocks/GenericBlock";
import { images } from "../../data/images";
import { bioFeatured, bioLinks, bioMoments, bioProfile, bioSocials } from "../../data/bioContent";
import { cx } from "../../utils/cx";
import { blockPrefix } from "../../utils/styles";
import { BlockRef } from "../../types/editor";
const linkIcons: Record<string, BoxIcon> = {
  calendar: CalendarDaysIcon,
  book: BookOpenIcon,
  mail: MailIcon,
  chat: MessageCircleIcon
};
export function BioTemplate() {
  const {
    doc,
    isMobile: m
  } = useEditor();
  const t = useThemeTokens();
  const footerTone = useFooterTone();
  const display: React.CSSProperties = {
    fontFamily: t.displayFont
  };
  const cta: CtaVariants = {
    solid: {
      background: t.accent,
      color: t.accentFg
    },
    outline: {
      boxShadow: 'inset 0 0 0 1px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: 'var(--surface)',
      color: 'var(--fg)',
      boxShadow: '0 0 0 1px var(--line), 0 16px 32px -24px rgba(42,37,33,0.5)'
    }
  };
  const col = cx('mx-auto w-full', m ? 'px-5' : 'px-8');
  const colStyle: React.CSSProperties = {
    maxWidth: 640
  };
  const sectionTitle = cx('cq-fg leading-none', m ? 'text-[30px]' : 'text-[36px]');
  const render = (b: BlockRef) => {
    const p = blockPrefix(b);
    switch (b.type) {
      case 'hero':
        return <Block key={b.key} block={b} defaultSpacing="none">
            <HeroFrame id={`block:${b.key}`} media={images.bioHero} mediaAlt="Costa mediterránea al atardecer" defaultVariant="centered" defaultShape="curve" radius={t.radius} avatarOverlap={m ? 60 : 80} decor={<EditableText id={`${p}hero.script`} value={bioProfile.script} label="Frase" as="span" className={cx('absolute rounded-full bg-white/85 px-3.5 py-1.5 italic text-[#2A2521]', m ? 'right-4 top-4 text-[15px]' : 'right-6 top-6 text-[18px]')} style={display} />} avatar={<EditableAvatar id={`${p}avatar`} src={images.bioAvatar} alt="Marina Solé" sizes={m ? {
            S: 92,
            M: 116,
            L: 140
          } : {
            S: 116,
            M: 148,
            L: 180
          }} ringColor={t.page.color} ringWidth={6} defaultBadge badgeColor={t.accent} />}>
              {({
              align
            }) => <>
                  <EditableText id={`${p}hero.name`} value={bioProfile.name} as="h1" label="Nombre" className={cx('cq-fg leading-[0.95]', m ? 'text-[42px]' : 'text-[54px]')} style={{
                ...display,
                fontWeight: 500
              }} />
                  <EditableText id={`${p}hero.role`} value={bioProfile.role} label="Subtítulo" className="cq-muted mt-3 text-[12.5px] font-medium uppercase tracking-[0.16em]" />
                  <EditableText id={`${p}hero.bio`} value={bioProfile.bio} label="Descripción" multiline className={cx('cq-fg mt-4 max-w-[460px] text-[15px] leading-relaxed', align === 'center' ? 'text-center' : 'text-left')} />
                </>}
            </HeroFrame>
          </Block>;
      case 'social':
        return <Block key={b.key} block={b} defaultSpacing="S">
            <div className={cx(col, 'flex justify-center gap-3')} style={colStyle}>
              {bioSocials.map((s, i) => <EditableSocial key={s.platform} id={`${p}social.${i}`} platform={s.platform} href={s.href} size={m ? 44 : 48} />)}
            </div>
          </Block>;
      case 'links':
        return <Block key={b.key} block={b} defaultSpacing="S">
            <div className={cx(col, 'flex flex-col gap-3.5')} style={colStyle}>
              {bioLinks.map((l, i) => {
              const Icon = linkIcons[l.icon];
              return <EditableCTA key={l.label} id={`${p}links.${i}`} label={l.label} sub={l.sub} href={l.href} variants={cta} defaultVariant={i === 0 ? 'solid' : 'soft'} fullDefault className={cx('flex items-center gap-4 rounded-[26px] text-left', m ? 'min-h-[78px] px-4 py-3' : 'min-h-[86px] px-5 py-4')} labelClassName={cx('leading-tight', m ? 'text-[19px]' : 'text-[22px]')} labelStyle={{
                ...display,
                fontWeight: 600
              }} subClassName="mt-0.5 text-[12.5px] opacity-75" leading={<span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{
                boxShadow: 'inset 0 0 0 1px currentColor'
              }}>
                        <Icon className="h-5 w-5" strokeWidth={1.6} />
                      </span>} trailing={<ArrowRightIcon className="h-5 w-5 shrink-0 opacity-70" strokeWidth={1.6} />} />;
            })}
            </div>
          </Block>;
      case 'collection':
        {
          const layout = doc.props[`block:${b.key}`]?.layout ?? 'grid';
          return <Block key={b.key} block={b}>
            <div className={col} style={colStyle}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <EditableText id={`${p}collection.title`} value="Lo último" as="h2" label="Título" className={sectionTitle} style={display} />
                <EditableText id={`${p}collection.more`} value="Ver todo" as="span" label="Enlace" className="cq-muted whitespace-nowrap text-[13px] font-medium" />
              </div>
              <div data-collection={layout} className={layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                {bioFeatured.map((c, i) => {
                  const cid = `${p}collection.${i}`;
                  if (layout === 'grid') {
                    return <Editable key={c.title} id={cid} kind="card" label="Card" className="relative aspect-[4/5] overflow-hidden" style={{
                      borderRadius: t.radius
                    }}>
                        <EditableImage id={`${cid}.img`} src={c.img} alt={c.title} className="absolute inset-0" />
                        <div className={cx('cq-surface absolute inset-x-2.5 bottom-2.5 rounded-[20px]', m ? 'p-3' : 'p-4')}>
                          <EditableText id={`${cid}.tag`} value={c.tag} as="span" label="Etiqueta" className="cq-muted text-[11px] font-semibold uppercase tracking-[0.12em]" />
                          <EditableText id={`${cid}.title`} value={c.title} as="h3" label="Título" className={cx('cq-fg mt-1 leading-tight', m ? 'text-[18px]' : 'text-[22px]')} style={display} />
                          {!m && <EditableText id={`${cid}.desc`} value={c.desc} label="Descripción" className="cq-muted mt-1 text-[13px] leading-snug" />}
                        </div>
                      </Editable>;
                  }
                  return <Editable key={c.title} id={cid} kind="card" label="Card" className="cq-surface flex items-center gap-4 p-3" style={{
                    borderRadius: t.radius - 6,
                    boxShadow: '0 0 0 1px var(--line)'
                  }}>
                      <EditableImage id={`${cid}.img`} src={c.img} alt={c.title} className="h-20 w-20 shrink-0" style={{
                      borderRadius: 18
                    }} />
                      <div className="min-w-0 flex-1">
                        <EditableText id={`${cid}.tag`} value={c.tag} as="span" label="Etiqueta" className="cq-muted text-[11px] font-semibold uppercase tracking-[0.12em]" />
                        <EditableText id={`${cid}.title`} value={c.title} as="h3" label="Título" className="cq-fg text-[20px] leading-tight" style={display} />
                        <EditableText id={`${cid}.desc`} value={c.desc} label="Descripción" className="cq-muted mt-0.5 text-[13px] leading-snug" />
                      </div>
                      <ArrowRightIcon className="cq-muted mr-2 h-5 w-5 shrink-0" strokeWidth={1.6} />
                    </Editable>;
                })}
              </div>
            </div>
          </Block>;
        }
      case 'gallery':
        return <Block key={b.key} block={b}>
            <div className={col} style={colStyle}>
              <EditableText id={`${p}gallery.title`} value="Momentos" as="h2" label="Título" className={sectionTitle} style={display} />
              <EditableText id={`${p}gallery.sub`} value="Pequeñas cosas de estas semanas." label="Subtítulo" className="cq-muted mt-2 text-[14px]" />
              <GalleryGrid id={`${p}gallery`} items={bioMoments} defaultLayout="fila" radius={20} altPrefix="Momento" className="mt-5" />
            </div>
          </Block>;
      default:
        return <Block key={b.key} block={b} defaultSpacing={b.type === 'hero' ? 'none' : 'M'}>
            <GenericBlock block={b} ctaVariants={cta} maxWidth={640} />
          </Block>;
    }
  };
  return <PageRoot>
      <div className="mx-auto w-full" style={{
      maxWidth: m ? undefined : 760
    }}>
        {doc.blocks.map(render)}
        <AddBlockSlot />
        <Editable id="footer" kind="section" label="Pie de página" as="footer" className="px-6 pb-12 pt-8 text-center" style={footerTone}>
          <EditableText id="footer.name" value="Marina Solé" label="Nombre" className="cq-fg text-[24px]" style={display} />
          <EditableText id="footer.note" value="Hecho con calma · Barcelona, 2026" label="Nota" className="cq-muted mt-1 text-[12.5px]" />
          <EditableText id="footer.brand" value="Hecho con Cripqer" label="Marca" className="cq-muted mt-6 text-[11px] font-medium uppercase tracking-[0.14em]" />
        </Editable>
      </div>
    </PageRoot>;
}