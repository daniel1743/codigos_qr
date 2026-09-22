import React from 'react';
import { ArrowUpRightIcon, PlayIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from '../editor/Editable';
import { EditableText } from '../editor/EditableText';
import { EditableImage } from '../editor/EditableImage';
import { EditableAvatar } from '../editor/EditableAvatar';
import { EditableCTA, type CtaVariants } from '../editor/EditableCTA';
import { EditableSocial } from '../editor/EditableSocial';
import { HeroFrame } from './HeroFrame';
import { GalleryGrid } from './GalleryGrid';
import { LocationBlock } from './LocationBlock';
import { images } from '../../data/images';
import { cx } from '../../utils/cx';
import { blockPrefix } from '../../utils/styles';
import type { BlockRef, SocialPlatform } from '../../types/editor';

interface GenericBlockProps {
  block: BlockRef;
  ctaVariants: CtaVariants;
  maxWidth?: number;
}

const genericSocials: SocialPlatform[] = ['instagram', 'whatsapp', 'email', 'web'];
const genericCards = [
{ title: 'Elemento destacado', desc: 'Describe brevemente este elemento.', img: images.bioStill },
{ title: 'Segundo elemento', desc: 'Un detalle que lo haga único.', img: images.bizProducts },
{ title: 'Tercer elemento', desc: 'Añade precio, enlace o fecha.', img: images.pfArch }];


/** Block Kit V1 rendered with any template's tokens — so new blocks always inherit the page's look. */
export function GenericBlock({ block, ctaVariants, maxWidth = 1080 }: GenericBlockProps) {
  const { isMobile: m } = useEditor();
  const t = useThemeTokens();
  const p = blockPrefix(block);
  const wrap = cx('mx-auto w-full', m ? 'px-5' : 'px-10');
  const display: React.CSSProperties = { fontFamily: t.displayFont };
  const heading = cx('cq-fg leading-tight', m ? 'text-[28px]' : 'text-[38px]');

  switch (block.type) {
    case 'hero':
      return (
        <HeroFrame id={`block:${block.key}`} media={images.bioStill} mediaAlt="Imagen de portada" defaultVariant="simple" radius={t.radius}>
          {() =>
          <>
              <EditableText id={`${p}hero.title`} value="Nueva portada" as="h2" label="Título" className={heading} style={display} />
              <EditableText id={`${p}hero.sub`} value="Toca este texto para escribir tu mensaje principal." label="Subtítulo" className="cq-muted mt-3 max-w-md text-[15px]" />
            </>
          }
        </HeroFrame>);

    case 'profile':
      return (
        <div className={cx(wrap, 'flex flex-col items-center text-center')} style={{ maxWidth }}>
          <EditableAvatar id={`${p}avatar`} src={images.bioAvatar} alt="Foto de perfil" sizes={{ S: 72, M: 104, L: 136 }} ringColor={t.page.surface} />
          <EditableText id={`${p}profile.name`} value="Tu nombre" as="h2" label="Nombre" className={cx(heading, 'mt-5')} style={display} />
          <EditableText id={`${p}profile.bio`} value="Una línea que explique a qué te dedicas." label="Descripción" className="cq-muted mt-2 text-[15px]" />
        </div>);

    case 'text':
      return (
        <div className={wrap} style={{ maxWidth: Math.min(maxWidth, 760) }}>
          <EditableText id={`${p}text.title`} value="Un título para esta sección" as="h2" label="Título" className={heading} style={display} />
          <EditableText id={`${p}text.body`} value="Escribe aquí un párrafo. Toca el texto para editarlo directamente, igual que cualquier otro elemento de la página." label="Párrafo" multiline className="cq-muted mt-4 text-[16px] leading-relaxed" />
        </div>);

    case 'links':
      return (
        <div className={cx(wrap, 'flex flex-col gap-3')} style={{ maxWidth: Math.min(maxWidth, 640) }}>
          {['Nuevo enlace', 'Otro enlace'].map((label, i) =>
          <EditableCTA
            key={label}
            id={`${p}links.${i}`}
            label={label}
            href="https://"
            variants={ctaVariants}
            defaultVariant={i === 0 ? 'solid' : 'soft'}
            fullDefault
            className="flex h-16 items-center justify-between px-6 text-[15px] font-semibold"
            trailing={<ArrowUpRightIcon className="h-4 w-4" />}
            labelClassName="flex-1" />

          )}
        </div>);

    case 'social':
      return (
        <div className={cx(wrap, 'flex flex-wrap justify-center gap-3')} style={{ maxWidth }}>
          {genericSocials.map((pf, i) =>
          <EditableSocial key={pf} id={`${p}social.${i}`} platform={pf} href="https://" />
          )}
        </div>);

    case 'image':
      return (
        <div className={wrap} style={{ maxWidth }}>
          <EditableImage id={`${p}image`} src={images.bizClinic} alt="Imagen destacada" className="aspect-[16/9] w-full" style={{ borderRadius: t.radius }} />
        </div>);

    case 'gallery':
      return (
        <div className={wrap} style={{ maxWidth }}>
          <GalleryGrid id={`${p}gallery`} items={[images.bioStreet, images.bizClinic, images.pfStair]} defaultLayout="fila" radius={Math.min(t.radius, 20)} altPrefix="Foto" />
        </div>);

    case 'video':
      return (
        <div className={wrap} style={{ maxWidth }}>
          <EditableText id={`${p}video.title`} value="Mira el vídeo" as="h2" label="Título" className={cx(heading, 'mb-6')} style={display} />
          <EditableImage id={`${p}video`} src={images.bioHero} alt="Portada del vídeo" label="Vídeo" className="aspect-video w-full" style={{ borderRadius: t.radius }}>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#15171C] shadow-lg">
                <PlayIcon className="ml-1 h-6 w-6" fill="currentColor" />
              </span>
            </div>
            <span className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-black/60 px-2 py-1 text-[12px] font-medium text-white">1:42</span>
          </EditableImage>
        </div>);

    case 'collection':
      return (
        <div className={wrap} style={{ maxWidth }}>
          <EditableText id={`${p}collection.title`} value="Colección" as="h2" label="Título" className={cx(heading, 'mb-7')} style={display} />
          <div className={cx('grid gap-4', m ? 'grid-cols-1' : 'grid-cols-3')}>
            {genericCards.map((c, i) =>
            <Editable key={c.title} id={`${p}collection.${i}`} kind="card" label="Card" className="cq-surface flex flex-col overflow-hidden" style={{ borderRadius: t.radius }}>
                <EditableImage id={`${p}collection.${i}.img`} src={c.img} alt={c.title} className="aspect-[4/3] w-full" />
                <div className="flex flex-1 flex-col p-5">
                  <EditableText id={`${p}collection.${i}.title`} value={c.title} as="h3" label="Título" className="cq-fg text-[18px] font-semibold" />
                  <EditableText id={`${p}collection.${i}.desc`} value={c.desc} label="Descripción" className="cq-muted mt-1.5 text-[14px]" />
                </div>
              </Editable>
            )}
          </div>
        </div>);

    case 'location':
      return (
        <LocationBlock
          prefix={p}
          title="Dónde estamos"
          name="Nombre del lugar"
          address="Calle, número · Ciudad"
          hours="Horario de atención"
          radius={t.radius}
          accent={t.accent}
          displayFont={t.displayFont}
          ctaVariants={ctaVariants} />);


    default:
      return null;
  }
}