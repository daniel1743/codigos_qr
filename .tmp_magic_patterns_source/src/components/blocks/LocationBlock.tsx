import React from 'react';
import { NavigationIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { EditableText } from '../editor/EditableText';
import { EditableCTA, type CtaVariants } from '../editor/EditableCTA';
import { MapIllustration } from './MapIllustration';
import { cx } from '../../utils/cx';

interface LocationBlockProps {
  prefix: string;
  title: string;
  name: string;
  address: string;
  hours: string;
  radius: number;
  accent: string;
  displayFont: string;
  ctaVariants: CtaVariants;
}

export function LocationBlock({ prefix: p, title, name, address, hours, radius, accent, displayFont, ctaVariants }: LocationBlockProps) {
  const { isMobile: m } = useEditor();
  return (
    <div className={cx('mx-auto grid w-full max-w-[1100px] items-center', m ? 'grid-cols-1 gap-8 px-5' : 'grid-cols-[0.9fr_1.1fr] gap-14 px-10')}>
      <div className="flex flex-col items-start">
        <EditableText id={`${p}location.title`} value={title} as="h2" label="Título" className={cx('cq-fg leading-tight', m ? 'text-[30px]' : 'text-[42px]')} style={{ fontFamily: displayFont }} />
        <EditableText id={`${p}location.name`} value={name} as="p" label="Nombre" className="cq-fg mt-5 text-[16px] font-semibold" />
        <EditableText id={`${p}location.address`} value={address} as="p" label="Dirección" className="cq-fg mt-1 text-[15px]" />
        <EditableText id={`${p}location.hours`} value={hours} as="p" label="Horario" className="cq-muted mt-3 text-[14px] leading-relaxed" />
        <EditableCTA
          id={`${p}location.cta`}
          label="Cómo llegar"
          href="https://maps.google.com"
          variants={ctaVariants}
          defaultVariant="outline"
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14px] font-semibold"
          leading={<NavigationIcon className="h-4 w-4" />} />
        
      </div>
      <MapIllustration accent={accent} radius={radius} />
    </div>);

}