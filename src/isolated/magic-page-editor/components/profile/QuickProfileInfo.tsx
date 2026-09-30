import React from 'react';
import { BriefcaseBusinessIcon, InfoIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { cx } from '../../utils/cx';

export interface QuickProfileInfoValues {
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  profession?: string;
}

export const QUICK_PROFILE_INFO_KEY = 'profileInfo';

export function readQuickProfileInfo(props: Record<string, Record<string, string>>): QuickProfileInfoValues {
  const value = props[QUICK_PROFILE_INFO_KEY] ?? {};
  return {
    description: value.description?.trim() || undefined,
    phone: value.phone?.trim() || undefined,
    email: value.email?.trim() || undefined,
    address: value.address?.trim() || undefined,
    profession: value.profession?.trim() || undefined,
  };
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return `${hasPlus ? '+' : ''}${digits}`;
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

interface QuickProfileInfoProps {
  legacyDescription?: string;
  className?: string;
}

/** Canonical identity metadata renderer shared by the editor and its preview/public output. */
export function QuickProfileInfo({ legacyDescription, className }: QuickProfileInfoProps) {
  const { doc, isMobile, mode } = useEditor();
  const info = readQuickProfileInfo(doc.props);
  const description = info.description ?? legacyDescription?.trim();
  const rows = [
    info.address && { key: 'address', icon: MapPinIcon, value: info.address, href: mapsSearchUrl(info.address), label: 'Abrir ubicación en mapas' },
    info.phone && { key: 'phone', icon: PhoneIcon, value: info.phone, href: `tel:${normalizePhone(info.phone)}`, label: `Llamar al ${info.phone}` },
    info.email && { key: 'email', icon: MailIcon, value: info.email, href: `mailto:${info.email}`, label: `Enviar correo a ${info.email}` },
    info.profession && { key: 'profession', icon: BriefcaseBusinessIcon, value: info.profession, label: undefined },
  ].filter(Boolean) as Array<{ key: string; icon: typeof InfoIcon; value: string; href?: string; label?: string }>;

  if (!description && rows.length === 0) {
    return mode === 'edit' ? <div className={cx('mt-4 text-center text-[11px] text-mute/70', className)}>+ Agregar información</div> : null;
  }

  return (
    <div className={cx('mx-auto mt-4 w-full max-w-[560px]', className)}>
      {description && <p className="text-[15px] leading-relaxed text-[color:var(--fg)]">{description}</p>}
      {rows.length > 0 && (
        <div className={cx('mt-3 flex gap-x-4 gap-y-2 text-[13px] text-[color:var(--fg-dim)]', isMobile ? 'flex-col items-stretch' : 'flex-wrap justify-center')}>
          {rows.map(({ key, icon: Icon, value, href, label }) => {
            const content = <><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{value}</span></>;
            return href ? <a key={key} href={href} target={key === 'address' ? '_blank' : undefined} rel={key === 'address' ? 'noreferrer' : undefined} aria-label={label} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 py-1 text-left transition-colors hover:text-[color:var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/40">{content}</a> : <span key={key} className="inline-flex min-h-8 items-center gap-1.5 px-1 py-1">{content}</span>;
          })}
        </div>
      )}
    </div>
  );
}
