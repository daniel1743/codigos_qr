import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { images } from '../../data/images';
import { GalleryGrid } from '../blocks/GalleryGrid';
import { Block } from '../editor/Block';
import { EditableText } from '../editor/EditableText';
import { PageRoot } from '../editor/PageRoot';

/** Dedicated Magic renderer for the Mini Galería page family. */
export function MiniGalleryTemplate() {
  const { isMobile } = useEditor();
  const block = { key: 'gallery', type: 'gallery' as const };
  return <PageRoot><Block block={block} defaultSpacing="S"><div className={isMobile ? 'px-5' : 'mx-auto w-full max-w-[960px] px-10'}><EditableText id="gallery.title" value="Galería" as="h1" label="Título" className="cq-fg text-[42px] leading-tight" /><EditableText id="gallery.sub" value="Una selección visual en movimiento." label="Subtítulo" className="cq-muted mt-2 text-[15px]" /><GalleryGrid id="gallery" items={[images.bioStreet, images.bizClinic, images.pfStair, images.pfVilla, images.bioStill]} defaultLayout="mosaico" radius={18} altPrefix="Foto" className="mt-7" /></div></Block></PageRoot>;
}
