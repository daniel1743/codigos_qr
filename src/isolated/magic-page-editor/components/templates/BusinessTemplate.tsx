import React from "react";
import { ArrowRightIcon, CalendarDaysIcon, DropletIcon, HomeIcon, MailIcon, PhoneIcon, SparklesIcon, BoxIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { ButtonGroup } from "../blocks/ButtonGroup";
import { buttonGroupIdentity, normalizeDestination, readButtonGroup } from "../../utils/buttonGroup";
import { singleButtonSeed } from "../../data/bioContent";
import { SeparatorBlock } from '../blocks/SeparatorBlock';
import { Block } from "../editor/Block";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { EditableImage } from "../editor/EditableImage";
import { EditableAvatar, VerifiedNameCheck } from "../editor/EditableAvatar";
import { EditableCTA, CtaVariants } from "../editor/EditableCTA";
import { EditableSocial, EditableSocialGroup } from "../editor/EditableSocial";
import { QuickProfileInfo } from '../profile/QuickProfileInfo';
import { PageRoot, useFooterTone } from "../editor/PageRoot";
import { AddBlockSlot } from "../editor/AddBlockSlot";
import { SocialIcon } from "../icons/SocialIcon";
import { HeroFrame } from "../blocks/HeroFrame";
import { GalleryGrid } from "../blocks/GalleryGrid";
import { LocationBlock } from "../blocks/LocationBlock";
import { GenericBlock } from "../blocks/GenericBlock";
import { iconForId } from "../editor/controls/IconPicker";
import { images } from "../../data/images";
import { bizCta, bizLocation, bizProfile, bizResults, bizServices, bizSocials } from "../../data/businessContent";
import { cx } from "../../utils/cx";
import { blockPrefix, toneVars } from "../../utils/styles";
import { isBusinessContextContent, sampleUnlessGenerated } from "../../utils/contentOrigin";
import { BlockRef } from "../../types/editor";
const serviceIcons: Record<string, LucideIcon> = {
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
    isMobile: m,
    mode
  } = useEditor();
  const t = useThemeTokens();
  const footerTone = useFooterTone();
  const display: React.CSSProperties = {
    fontFamily: t.displayFont
  };
  const petrol = t.tones.find((x) => x.id === 'petroleo') ?? t.tones[0];
  const night = t.tones.find((x) => x.id === 'noche') ?? t.tones[0];
  const serviceTone = doc.props.page?.palette ? t.page : petrol;
  const footerBase = doc.props.page?.palette ? t.page : night;
  /**
   * Microfase 3C · the page-level origin switch, read once for the sections that
   * live outside the hero's own `generated` scope: the location section and the
   * footer. Same declaration as everywhere else — a document that declares no
   * origin behaves exactly as it did before.
   */
  const generated = isBusinessContextContent(doc.props.page);
  /**
   * A generated page's owner identity, from the document itself.
   *
   * The generator writes the business name into `hero.title` and its
   * description into `hero.text`; the footer reuses those rather than the
   * clinic demo's brand, note and legal line. Nothing is invented: an owner who
   * gave no description gets an empty, still-editable note, and the only
   * non-owner string left is the product's own branding, which is legitimate on
   * every plan. A hand-made page keeps its demo footer untouched.
   */
  const ownerName = generated ? (doc.texts['hero.title'] ?? '').trim() : 'Áurea';
  const ownerNote = generated ? (doc.texts['hero.text'] ?? '').trim() : 'Estética avanzada · Calle de Serrano 48, Madrid';
  const footerLegal = generated ? 'Hecho con Cripqer' : '© 2026 Clínica Áurea · Hecho con Cripqer';
  /** Generated documents link only to explicitly stored, valid destinations. */
  const actionHref = (id: string, sample: string) => {
    if (!generated) return sample;
    const raw = doc.props[id]?.['href'];
    const resolved = normalizeDestination(raw ?? '');
    return resolved.valid ? resolved.href : undefined;
  };
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
      background: t.page.surface,
      color: t.page.fg
    }
  };
  const cardCta: CtaVariants = {
    solid: {
      background: t.accent,
      color: t.accentFg
    },
    outline: {
      boxShadow: 'inset 0 0 0 1px var(--fg)',
      color: 'var(--fg)'
    },
    soft: {
      background: t.page.surface,
      color: t.page.fg
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
      background: t.page.surface,
      color: t.page.fg
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
      case 'hero': {
        /**
         * Microfase 3A · the hero draws the document's own content.
         *
         * A page generated from the conversational Business Context declares its
         * copy and its media in the document (`contentOrigin`, written by the
         * generator), so its hero draws *that*: the business's name and
         * description, the family's own cover photo, and an empty — explicitly
         * defined — state for every slot the business has not filled. The clinic
         * sample this template ships with is the editor's demo: it belongs to
         * pages made by hand, and it must never appear on a generated page of
         * another industry.
         *
         * `demo()` is the single switch between the two. A document that declares
         * no origin — every page made by hand in the editor, and every page
         * published before this change — resolves to exactly the string it
         * resolved to before, so nothing already published moves.
         */
        const generated = isBusinessContextContent(doc.props.page);
        const demo = (sample: string) => sampleUnlessGenerated(doc.props.page, sample);
        /** A slot's copy: the document's own, or the demo it falls back to. */
        const copy = (id: string, sample: string) => (doc.texts[id] ?? demo(sample)).trim();
        /**
         * A generated page's action links only once its destination is known:
         * the document declares the channel, never a URL. The stored `href` is
         * read here rather than passing `undefined` — which the CTA contract
         * makes win over anything stored — so the moment the owner attaches a
         * URL in the editor it is the one that renders.
         */
        /**
         * Built once, handed over twice: `children` keeps the exact fragment it
         * always returned, and `slots` exposes the same pieces by name for the
         * L2.1 compositions. Only one of the two is ever rendered — a variant
         * that reads `slots` does not also call `children` — so nothing renders
         * twice and no existing variant changes.
         */
        const heroParts = (align: 'left' | 'center') => {
          const brand = copy(`${p}hero.brand`, bizProfile.brand);
          const ctaLabel = copy(`${p}hero.cta.label`, bizProfile.cta);
          const cta2Label = copy(`${p}hero.cta2.label`, bizProfile.cta2);
          const byline = copy(`${p}hero.byline`, bizProfile.byline);
          /* The social row is the demo's own handles. The Business Context
             declares none, and an icon with no destination is not a link. */
          const socials = generated ? [] : bizSocials;
          return {
            brand: brand !== '' ?
              <EditableText id={`${p}hero.brand`} value={demo(bizProfile.brand)} label="Marca" className="cq-fg text-[13px] uppercase tracking-[0.26em]" style={display} /> : null,
            /* L2.5 · the second label of the header row, opposite the brand.
               Opt-in: it is handed over only once it has been written, so a page
               that already renders this header cannot sprout a label on load. The
               compositions with no header row ignore the slot entirely. */
            eyebrow: (doc.texts[`${p}hero.eyebrow`] ?? '').trim() !== '' ?
              <EditableText id={`${p}hero.eyebrow`} value={bizProfile.eyebrow} label="Etiqueta" className="text-[11px] uppercase tracking-[0.24em]" /> : null,
            /* The trailing label of the caption row, under the media. Opt-in too. */
            meta: (doc.texts[`${p}hero.meta`] ?? '').trim() !== '' ?
              <EditableText id={`${p}hero.meta`} value={bizProfile.meta} label="Pie" className="cq-muted text-[11px] uppercase tracking-[0.2em]" /> : null,
            title: <div className="flex items-center"><EditableText id={`${p}hero.title`} value={demo(bizProfile.title)} as="h1" label="Título" className={cx('cq-fg mt-5 leading-[1.04]', m ? 'text-[38px]' : 'text-[62px]')} style={display} /><VerifiedNameCheck avatarId={`${p}avatar`} /></div>,
            /* The business's own description, under the engine's canonical
               `hero.text` id — so it is a text run like the title, not a
               paragraph nothing can select or style. `QuickProfileInfo` only
               falls back to a plain paragraph while the "Información" panel
               owns the line. */
            description: <QuickProfileInfo descriptionId={`${p}hero.text`} legacyDescription={doc.texts[`${p}hero.text`] ?? demo(bizProfile.text)} />,
            cta: ctaLabel !== '' || cta2Label !== '' ?
              <div className={cx('mt-8 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
                {ctaLabel !== '' && <EditableCTA id={`${p}hero.cta`} label={demo(bizProfile.cta)} href={actionHref(`${p}hero.cta`, 'https://wa.me/34910000000')} variants={cta} className="inline-flex h-[54px] items-center gap-2.5 whitespace-nowrap rounded-full px-7 text-[15px] font-semibold" leading={<CalendarDaysIcon className="h-[18px] w-[18px]" />} />}
                {cta2Label !== '' && <EditableCTA id={`${p}hero.cta2`} label={demo(bizProfile.cta2)} href={actionHref(`${p}hero.cta2`, '#tratamientos')} variants={cta} defaultVariant="outline" className="inline-flex h-[54px] items-center whitespace-nowrap rounded-full px-7 text-[15px] font-semibold" />}
              </div> : null,
            social: socials.length > 0 || byline !== '' ?
              <div className={cx('mt-9 flex flex-wrap items-center gap-2.5', align === 'center' && 'justify-center')}>
                {socials.length > 0 && <EditableSocialGroup className="flex flex-wrap items-center"><>{socials.map((s, i) => <EditableSocial key={s.platform} id={`${p}hero.social.${i}`} platform={s.platform} href={s.href} size={40} defaultStyle="square" />)}</></EditableSocialGroup>}
                {byline !== '' && <span><EditableText id={`${p}hero.byline`} value={demo(bizProfile.byline)} label="Firma" className="cq-muted ml-2 text-[13px]" /></span>}
              </div> : null,
          };
        };
        const heroSlots = heroParts('left');
        return <Block key={b.key} block={b} defaultSpacing="none">
            {/* The template's own photo is only what a page that declares none
                falls back to: both renderers prefer the document's media channel
                (`HeroFrame`: `p['src'] ?? media`; `EditableAvatar`: `p['src'] ?? src`),
                which is what a generated page declares. The alt text, which the
                document does not carry, follows the same switch as the copy. */}
            <HeroFrame id={`block:${b.key}`} media={images.bizClinic} mediaAlt={generated ? '' : 'Recepción de Clínica Áurea'} defaultVariant="split" defaultShape="curve" radius={t.radius} avatar={<EditableAvatar id={`${p}avatar`} src={images.bizPortrait} alt={generated ? '' : 'Dra. Carmen Vidal'} sizes={m ? {
            S: 88,
            M: 112,
            L: 140
          } : {
            S: 128,
            M: 168,
            L: 204
          }} defaultShape="arch" ringColor={t.page.color} ringWidth={6} badgeColor={t.accent} />} slots={heroSlots}>
              {({ align }) => {
                const q = heroParts(align);
                return <>{q.brand}{q.title}{q.description}{q.cta}{q.social}</>;
              }}
            </HeroFrame>
          </Block>;
      }
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
                  const Icon = iconForId(doc.props[`${p}collection.${i}.icon`]?.icon ?? s.icon);
                  if (layout === 'lista') {
                    return <Editable key={s.title} id={cid} kind="card" label="Card de servicio" className="relative grid overflow-hidden" style={{
                      ...toneVars(serviceTone),
                      background: serviceTone.color,
                      borderRadius: t.radius,
                      gridTemplateColumns: m ? '1fr 36%' : '1fr 40%',
                      minHeight: m ? 176 : 214
                    }}>
                        <div className={cx('flex flex-col items-start', m ? 'p-4' : 'p-6')}>
                          <Editable id={`${cid}.icon`} kind="icon" label="Icono" className="grid h-10 w-10 place-items-center rounded-xl" style={{
                          background: t.media.surface,
                          color: t.accent
                        }}>
                            <Icon className="h-5 w-5" strokeWidth={1.7} />
                          </Editable>
                          <EditableText id={`${cid}.title`} value={s.title} as="h3" label="Título" className={cx('cq-fg mt-4 uppercase leading-tight tracking-[0.03em]', m ? 'text-[17px]' : 'text-[21px]')} style={display} />
                          <EditableText id={`${cid}.desc`} value={s.desc} label="Descripción" className="cq-muted mt-1.5 text-[13.5px] leading-snug" />
                          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                            <EditableCTA id={`${cid}.cta`} label={s.cta} href={actionHref(`${cid}.cta`, 'https://wa.me/34910000000')} variants={cardCta} defaultVariant="soft" className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[12px] font-bold uppercase tracking-[0.08em]" />
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
                          <EditableCTA id={`${cid}.cta`} label={s.cta} href={actionHref(`${cid}.cta`, 'https://wa.me/34910000000')} variants={surfaceCta} className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[12.5px] font-semibold" />
                        </div>
                      </div>
                    </Editable>;
                })}
              </div>
            </div>
          </Block>;
        }
            case 'button': {
        return <Block key={b.key} block={b} defaultSpacing="S" label={buttonGroupIdentity(readButtonGroup(doc, b.key, singleButtonSeed).items.length)}>
            <ButtonGroup blockKey={b.key} seeds={singleButtonSeed} variants={cta} maxWidth={wrapStyle.maxWidth as number} mobile={m} className={cx(wrap, 'items-stretch')} />
          </Block>;
      }
      case 'links':
        return <Block key={b.key} block={b}>
            <div className={wrap} style={{
            maxWidth: 1100
          }}>
              <EditableText id={`${p}links.title`} value="¿Hablamos?" as="h2" label="Título" className={h2} style={display} />
              <EditableCTA id={`${p}links.cta`} elementLabel="Bloque CTA" label={bizCta.title} sub={bizCta.sub} href={actionHref(`${p}links.cta`, 'https://wa.me/34910000000')} variants={bigCta} fullDefault className={cx('mt-7 flex items-center gap-5 rounded-[28px] text-left', m ? 'px-5 py-6' : 'px-9 py-9')} labelClassName={cx('leading-tight', m ? 'text-[23px]' : 'text-[34px]')} labelStyle={display} subClassName="mt-2 text-[14px] opacity-75" leading={<span className={cx('grid shrink-0 place-items-center rounded-2xl', m ? 'h-12 w-12' : 'h-16 w-16')} style={{
              background: t.accent,
              color: t.accentFg
            }}>
                    <SocialIcon platform="whatsapp" className={m ? 'h-6 w-6' : 'h-8 w-8'} />
                  </span>} trailing={m ? undefined : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{
              boxShadow: 'inset 0 0 0 1px currentColor'
            }}>
                      <ArrowRightIcon className="h-5 w-5" />
                    </span>} />
              <div className={cx('mt-3 grid gap-3', m ? 'grid-cols-1' : 'grid-cols-2')}>
                {bizCta.secondary.map((s, i) => {
                const Icon = iconForId(doc.props[`${p}links.${i + 1}.icon`]?.icon ?? s.icon);
                return <EditableCTA key={s.label} id={`${p}links.${i + 1}`} label={s.label} sub={s.sub} href={actionHref(`${p}links.${i + 1}`, i === 0 ? 'tel:+34910000000' : 'mailto:hola@clinicaaurea.es')} variants={surfaceCta} defaultVariant="soft" fullDefault className="flex min-h-[80px] items-center gap-4 rounded-[22px] px-5 py-4 text-left" labelClassName="text-[16px] font-semibold" subClassName="cq-muted mt-0.5 text-[13px]" leading={<Editable id={`${p}links.${i + 1}.icon`} kind="icon" label="Icono" className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{
                  background: 'var(--surface)',
                  boxShadow: '0 0 0 1px var(--line)'
                }}>
                          <Icon className="h-5 w-5" strokeWidth={1.7} />
                        </Editable>} trailing={<ArrowRightIcon className="h-5 w-5 shrink-0 opacity-60" />} />;
              })}
              </div>
            </div>
          </Block>;
      case 'gallery': {
        /**
         * Microfase 3B · a generated page draws its own gallery.
         *
         * The photos come from the document (`props['gallery'].items`, written by
         * the generator from the family's own pack) and the heading from the
         * document's own text; the clinic results and the results copy below are
         * this template's demo, and a page generated for another industry must
         * never fall back to them. The heading column is drawn only when it has
         * something to say, so a generated page whose document declares no
         * heading shows the gallery alone instead of an empty column beside it —
         * which is the composition the approved preview draws for this family's
         * `row` gallery, where the photos carry no heading at all.
         *
         * A document that declares no origin — every page made by hand — keeps
         * the demo, heading and photos alike, exactly as before.
         */
        const demo = (sample: string) => sampleUnlessGenerated(doc.props.page, sample);
        const heading = (id: string, sample: string) => (doc.texts[id] ?? demo(sample)).trim();
        const title = heading(`${p}gallery.title`, 'Resultados reales');
        const sub = heading(`${p}gallery.sub`, 'Piel más luminosa, hidratada y uniforme. Siempre natural, siempre con seguimiento.');
        const hasHeading = title !== '' || sub !== '';
        return <Block key={b.key} block={b} defaultTone="blanco">
            <div className={cx(wrap, 'grid items-center', m ? 'grid-cols-1 gap-7' : hasHeading ? 'grid-cols-[0.75fr_1.6fr] gap-14' : 'grid-cols-1')} style={wrapStyle}>
              {hasHeading &&
              <div>
                <EditableText id={`${p}gallery.title`} value={demo('Resultados reales')} as="h2" label="Título" className={h2} style={display} />
                <EditableText id={`${p}gallery.sub`} value={demo('Piel más luminosa, hidratada y uniforme. Siempre natural, siempre con seguimiento.')} label="Subtítulo" multiline className="cq-muted mt-4 text-[15px] leading-relaxed" />
              </div>}
              <GalleryGrid id={`${p}gallery`} items={isBusinessContextContent(doc.props.page) ? [] : bizResults} defaultLayout="mosaico" radius={t.radius} altPrefix="Resultado" rowHeight={190} />
            </div>
          </Block>;
      }
      case 'location': {
        /**
         * Microfase 3C · a generated page shows a location only when one was
         * declared.
         *
         * The Business Context carries no address, city, hours or phone — the
         * `bizLocation` below is the clinic's demo — so drawing it would put an
         * invented address and opening hours on a real business's page. The
         * section is therefore not visible on a published generated page until
         * the owner writes `location.address`, while in the editor it stays as
         * an empty, selectable shell whose fields can be filled in place (and a
         * fresh Location block can also be added from the block kit). A page made
         * by hand keeps the demo exactly as before.
         */
        if (generated && (doc.texts[`${p}location.address`] ?? '').trim() === '') {
          if (mode === 'preview') return null;
          return <Block key={b.key} block={b}>
              <LocationBlock prefix={p} title="" name="" address="" hours="" radius={t.radius} accent={t.accent} displayFont={t.displayFont} ctaVariants={cta} />
            </Block>;
        }
        return <Block key={b.key} block={b}>
            <LocationBlock prefix={p} title={bizLocation.title} name={bizLocation.name} address={bizLocation.address} hours={bizLocation.hours} radius={t.radius} accent={t.accent} displayFont={t.displayFont} ctaVariants={cta} />
          </Block>;
      }
      default:
        return <Block key={b.key} block={b} defaultSpacing="M">
            <GenericBlock block={b} ctaVariants={cta} />
          </Block>;
    }
  };
  return <PageRoot>
      {doc.blocks.map(render)}
      <AddBlockSlot />
      <Editable id="footer" kind="section" label="Pie de página" as="footer" className={cx('flex gap-6', m ? 'flex-col px-5 py-10' : 'items-center justify-between px-10 py-12')} style={{
      ...toneVars(footerBase),
      background: footerBase.color,
      ...footerTone
    }}>
        <div>
          <EditableText id="footer.brand" value={ownerName} label="Marca" className="cq-fg text-[30px] tracking-[0.08em]" style={display} />
          <EditableText id="footer.note" value={ownerNote} label="Nota" className="cq-muted mt-1 text-[13px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <EditableSocialGroup className="flex items-center"><>{generated ? null : bizSocials.map((s, i) => <EditableSocial key={s.platform} id={`footer.social.${i}`} platform={s.platform} href={s.href} size={40} />)}</></EditableSocialGroup>
        </div>
        <EditableText id="footer.legal" value={footerLegal} label="Aviso" className="cq-muted text-[12px]" />
      </Editable>
    </PageRoot>;
}
