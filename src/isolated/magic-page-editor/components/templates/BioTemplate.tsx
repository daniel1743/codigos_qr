import React from "react";
import { ArrowRightIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { SeparatorBlock } from '../blocks/SeparatorBlock';
import { Block } from "../editor/Block";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { EditableImage } from "../editor/EditableImage";
import { EditableAvatar, VerifiedNameCheck } from "../editor/EditableAvatar";
import { CtaVariants } from "../editor/EditableCTA";
import { EditableSocial, EditableSocialGroup } from "../editor/EditableSocial";
import { PageRoot, useFooterTone } from "../editor/PageRoot";
import { AddBlockSlot } from "../editor/AddBlockSlot";
import { HeroFrame } from "../blocks/HeroFrame";
import { GalleryGrid } from "../blocks/GalleryGrid";
import { GenericBlock } from "../blocks/GenericBlock";
import { ButtonGroup } from "../blocks/ButtonGroup";
import { buttonGroupIdentity, readButtonGroup } from '../../utils/buttonGroup';
import { images } from "../../data/images";
import { bioFeatured, bioLinks, bioMoments, bioProfile, bioSocials , singleButtonSeed } from "../../data/bioContent";
import { cx } from "../../utils/cx";
import { blockPrefix } from "../../utils/styles";
import { isBusinessContextContent, sampleUnlessGenerated } from '../../utils/contentOrigin';
import { resolveBrandingTone } from '../../utils/brandingContrast';
import { BlockRef } from "../../types/editor";
import Logo from "../../../../components/brand/Logo";
import { QuickProfileInfo } from '../profile/QuickProfileInfo';
export function BioTemplate() {
  const {
    doc,
    isMobile: m,
    mode
  } = useEditor();
  const t = useThemeTokens();
  const footerTone = useFooterTone();
  // E1.1 — the system branding resolves its OWN contrast token from the surface it
  // sits on, instead of inheriting the page foreground at 60% opacity.
  // `useFooterTone()` returns the tone's CSS variables, hence `--surface`.
  const branding = resolveBrandingTone((footerTone as Record<string, string | undefined>)['--surface']);
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
  /** Microfase 3C · the footer identity above, resolved once for the whole page. */
  const generated = isBusinessContextContent(doc.props.page);
  const footerOwner = generated ? (doc.texts['hero.name'] ?? '').trim() : 'Marina Solé';
  const footerNote = generated ? (doc.texts['hero.bio'] ?? '').trim() : 'Hecho con calma · Barcelona, 2026';
  const colStyle: React.CSSProperties = {
    maxWidth: 640
  };
  const sectionTitle = cx('cq-fg leading-none', m ? 'text-[30px]' : 'text-[36px]');
  const render = (b: BlockRef) => {
    const p = blockPrefix(b);
    switch (b.type) {
      case 'hero': {
        /**
         * Bio's hero carries no CTA or socials — those are separate blocks — so
         * only `title` and `description` have an equivalent here. A composition
         * that asks for a missing piece falls back to `children`, never to an
         * empty box.
         *
         * Microfase 4B · the hero draws the document's own identity.
         *
         * `role` and `script` are this template's demo persona — her profession,
         * her city, her motto — and `hero.bio` falls back to her paragraph. A
         * page generated from the conversational Business Context declares none
         * of them, so drawing them would attribute another person's identity to
         * a real page. `demo()` is the single switch 3A/3B/3C already use: a
         * document that declares no origin resolves to exactly the string it
         * always resolved to, so no page made by hand and nothing already
         * published moves.
         *
         * The slot still renders when empty — the field has to stay reachable
         * from the editor — except `hero.script`, whose pill carries a
         * background and would draw an empty coloured capsule in the public
         * render.
         */
        const demo = (sample: string) => sampleUnlessGenerated(doc.props.page, sample);
        /** A slot's copy: the document's own, or the demo it falls back to. */
        const copy = (id: string, sample: string) => (doc.texts[id] ?? demo(sample)).trim();
        const role = copy(`${p}hero.role`, bioProfile.role);
        const script = copy(`${p}hero.script`, bioProfile.script);
        const heroParts = (align: 'left' | 'center') => ({
          title: <div className="flex items-center"><EditableText id={`${p}hero.name`} value={bioProfile.name} as="h1" label="Nombre" className={cx('cq-fg leading-[0.95]', m ? 'text-[42px]' : 'text-[54px]')} style={{
                ...display,
                fontWeight: 500
              }} /><VerifiedNameCheck avatarId={`${p}avatar`} /></div>,
          description: <>
            {role !== '' || mode === 'edit' ?
            <EditableText id={`${p}hero.role`} value={demo(bioProfile.role)} label="Subtítulo" className="cq-muted mt-3 text-[12.5px] font-medium uppercase tracking-[0.16em]" /> : null}
            <QuickProfileInfo descriptionId={`${p}hero.bio`} legacyDescription={doc.texts[`${p}hero.bio`] ?? demo(bioProfile.bio)} className={align === 'center' ? 'text-center' : 'text-left'} />
          </>,
        });
        const heroSlots = heroParts('left');
        return <Block key={b.key} block={b} defaultSpacing="none">
            <HeroFrame id={`block:${b.key}`} media={images.bioHero} mediaAlt={generated ? '' : 'Costa mediterránea al atardecer'} defaultVariant="centered" defaultShape="curve" radius={t.radius} avatarOverlap={m ? 60 : 80} decor={script !== '' || mode === 'edit' ? <EditableText id={`${p}hero.script`} value={demo(bioProfile.script)} label="Frase" as="span" className={cx('absolute rounded-full px-3.5 py-1.5 italic', m ? 'right-4 top-4 text-[15px]' : 'right-6 top-6 text-[18px]')} style={{ ...display, background: t.page.surface, color: t.page.fg }} /> : null} avatar={<EditableAvatar id={`${p}avatar`} src={images.bioAvatar} alt={generated ? (doc.texts['hero.name'] ?? '').trim() : 'Marina Solé'} sizes={m ? {
            S: 92,
            M: 116,
            L: 140
          } : {
            S: 116,
            M: 148,
            L: 180
          }} ringColor={t.page.color} ringWidth={6} defaultBadge badgeColor={t.accent} />} slots={heroSlots}>
              {({ align }) => {
                const q = heroParts(align);
                return <>{q.title}{q.description}</>;
              }}
            </HeroFrame>
          </Block>;
      }
      case 'separator':
          return <SeparatorBlock key={b.key} block={b} mobile={m} />;
        case 'social':
        return <Block key={b.key} block={b} defaultSpacing="S">
            <div className={cx(col, 'flex justify-center gap-3')} style={colStyle}>
              <EditableSocialGroup className="flex items-center justify-center"><>{bioSocials.map((s, i) => <EditableSocial key={s.platform} id={`${p}social.${i}`} platform={s.platform} href={generated ? undefined : s.href} size={m ? 44 : 48} />)}</></EditableSocialGroup>
            </div>
          </Block>;
            case 'button': {
        return <Block key={b.key} block={b} defaultSpacing="S" label={buttonGroupIdentity(readButtonGroup(doc, b.key, singleButtonSeed).items.length)}>
            <ButtonGroup blockKey={b.key} seeds={singleButtonSeed} variants={cta} maxWidth={colStyle.maxWidth as number} mobile={m} className={cx(col, 'items-stretch')} />
          </Block>;
      }
      case 'links': {
        return <Block key={b.key} block={b} defaultSpacing="S" label={buttonGroupIdentity(readButtonGroup(doc, b.key, bioLinks).items.length)}>
            <ButtonGroup
              blockKey={b.key}
              seeds={bioLinks}
              variants={cta}
              maxWidth={colStyle.maxWidth as number}
              mobile={m}
              semanticContext={doc.texts[`${p}hero.role`] ?? bioProfile.role}
              className={cx(col, 'items-stretch')}
            />
          </Block>;
      }
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
                        <Editable id={`${cid}.surface`} kind="surface" label="Superficie" className={cx('cq-surface absolute inset-x-2.5 bottom-2.5 rounded-[20px]', m ? 'p-3' : 'p-4')} style={{ background: doc.props[cid]?.cardBg, borderRadius: doc.props[cid]?.radius, padding: doc.props[cid]?.spacing === 'S' ? 12 : doc.props[cid]?.spacing === 'L' ? 24 : undefined, boxShadow: doc.props[cid]?.shadow === 'on' ? '0 10px 40px -10px rgba(0,0,0,0.2)' : undefined, border: doc.props[cid]?.cardLine ? `1px solid ${doc.props[cid].cardLine}` : undefined }}>
                          <EditableText id={`${cid}.tag`} value={c.tag} as="span" label="Etiqueta" className="cq-muted text-[11px] font-semibold uppercase tracking-[0.12em]" />
                          <EditableText id={`${cid}.title`} value={c.title} as="h3" label="Título" className={cx('cq-fg mt-1 leading-tight', m ? 'text-[18px]' : 'text-[22px]')} style={display} />
                          {!m && <EditableText id={`${cid}.desc`} value={c.desc} label="Descripción" className="cq-muted mt-1 text-[13px] leading-snug" />}
                        </Editable>
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
      case 'gallery': {
        /**
         * Microfase 3B · a generated page draws its own gallery.
         *
         * The photos come from the document (`props['<id>'].items`, written by
         * the generator from the family's own pack) and the heading from the
         * document's own text; the moments below are this template's demo, and a
         * page generated for a business that declared no gallery must not fall
         * back to them. Each heading is drawn only when it has something to say.
         *
         * A document that declares no origin — every page made by hand — keeps
         * the demo, heading and photos alike, exactly as before.
         */
        const demo = (sample: string) => sampleUnlessGenerated(doc.props.page, sample);
        const heading = (id: string, sample: string) => (doc.texts[id] ?? demo(sample)).trim();
        return <Block key={b.key} block={b}>
            <div className={col} style={colStyle}>
              {heading(`${p}gallery.title`, 'Momentos') !== '' &&
              <EditableText id={`${p}gallery.title`} value={demo('Momentos')} as="h2" label="Título" className={sectionTitle} style={display} />}
              {heading(`${p}gallery.sub`, 'Pequeñas cosas de estas semanas.') !== '' &&
              <EditableText id={`${p}gallery.sub`} value={demo('Pequeñas cosas de estas semanas.')} label="Subtítulo" className="cq-muted mt-2 text-[14px]" />}
              <GalleryGrid id={`${p}gallery`} items={isBusinessContextContent(doc.props.page) ? [] : bioMoments} defaultLayout="fila" radius={20} altPrefix="Momento" className="mt-5" />
            </div>
          </Block>;
      }
      default:
        return <Block key={b.key} block={b} defaultSpacing="M">
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
          {/* Microfase 3C · a generated page signs with the owner's own name,
              from the document (`hero.name`); the demo's name and line stay for
              every page made by hand. Nothing is invented: an owner with no
              description gets an empty, still-editable note. */}
          <EditableText id="footer.name" value={footerOwner} label="Nombre" className="cq-fg text-[24px]" style={display} />
          <EditableText id="footer.note" value={footerNote} label="Nota" className="cq-muted mt-1 text-[12.5px]" />
        </Editable>
        <div
          data-system-branding="cripqer"
          data-branding-tone={branding.logoTheme}
          className="flex items-center justify-center gap-2 px-6 pb-12 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--branding-fg)]"
          style={{ ...footerTone, '--branding-fg': branding.color } as React.CSSProperties}
        >
          <a
            href="/"
            aria-label="Visita Cripqer"
            title="Visita Cripqer"
            onClick={(event) => {
              if (mode === "edit") event.preventDefault();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          >
            <span>Visita</span>
            <Logo
              variant="symbol"
              width={24}
              height={24}
              title="Cripqer"
            />
            <Logo
              variant="wordmark"
              theme={branding.logoTheme}
              showTagline={false}
              title="Cripqer"
              className="origin-left scale-[0.62] -mr-6"
            />
          </a>
        </div>
      </div>
    </PageRoot>;
}
