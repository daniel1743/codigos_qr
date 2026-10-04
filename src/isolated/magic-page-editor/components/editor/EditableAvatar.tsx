import React from 'react';
import { CheckIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';
import { useFreeImagePan } from './controls/PositionPad';
import { usePageVerification } from '../../contexts/PageVerificationContext';

/**
 * Official (admin) verification treatment for the `official-gold` variant:
 * bright emerald with a very light check mark. The variant id is unchanged.
 */
const GOLD_BADGE_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg,#34D399 0%,#10B981 45%,#047857 100%)',
  color: '#FFFFFF',
  boxShadow: '0 1px 2px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.55)',
};

type AvatarSize = 'S' | 'M' | 'L';
type AvatarShape = 'circle' | 'arch' | 'rounded' | 'square';
export type VerificationPlacement = 'none' | 'name' | 'avatar';

interface EditableAvatarProps {
  id: string;
  src: string;
  alt: string;
  sizes: Record<AvatarSize, number>;
  defaultSize?: AvatarSize;
  defaultShape?: AvatarShape;
  ringColor: string;
  ringWidth?: number;
  defaultBadge?: boolean;
  badgeColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Corner treatment per avatar shape. Exported so the exposure contract can prove the shapes differ. */
export function radiusFor(shape: AvatarShape, w: number): string {
  if (shape === 'circle') return '9999px';
  if (shape === 'square') return '0px';
  if (shape === 'arch') return `${w / 2}px ${w / 2}px ${Math.round(w * 0.12)}px ${Math.round(w * 0.12)}px`;
  return `${Math.round(w * 0.24)}px`;
}

/** Resolves the single badge location while keeping old badge/badgeByName documents readable. */
export function verificationPlacementFromProps(
  props: Record<string, string>,
  defaultPlacement: VerificationPlacement = 'none',
): VerificationPlacement {
  const explicit = props['badgePlacement'];
  if (explicit === 'none' || explicit === 'name' || explicit === 'avatar') return explicit;
  if (props['badgeByName'] === 'on') return 'name';
  if (props['badge'] === 'on') return 'avatar';
  return defaultPlacement;
}

export function EditableAvatar({
  id,
  src,
  alt,
  sizes,
  defaultSize = 'M',
  defaultShape = 'circle',
  ringColor,
  ringWidth = 5,
  defaultBadge = false,
  badgeColor = '#56604A',
  className,
  style
}: EditableAvatarProps) {
  const { doc } = useEditor();
  const p = doc.props[id] ?? {};
  const size = sizes[p['size'] as AvatarSize ?? defaultSize];
  const shape = p['shape'] as AvatarShape ?? defaultShape;
  const ring = (p['ring'] ?? 'on') === 'on' ? ringWidth : 0;
  const badge = (p['badge'] ?? (defaultBadge ? 'on' : 'off')) === 'on';
  const verificationPlacement = verificationPlacementFromProps(p, defaultBadge ? 'name' : 'none');
  const badgeTone = p['badgeColor'] ?? badgeColor;
  const crop = useFreeImagePan(id, p['cropX'], p['cropY']);
  const verificationVariant = usePageVerification();
  const w = size + ring * 2;
  const h = (shape === 'arch' ? Math.round(size * 1.25) : size) + ring * 2;
  const isLocked = p['locked'] === 'true';

  return (
    <Editable
      id={id}
      kind="avatar"
      label="Avatar"
      data-shape={shape}
      className={cx('relative shrink-0', className)}
      style={{ width: w, height: h, padding: ring, background: ring ? ringColor : 'transparent', borderRadius: radiusFor(shape, w), ...style }}>
      
      <div className={cx("relative h-full w-full overflow-hidden", !isLocked && "touch-none")} style={{ borderRadius: radiusFor(shape, size) }} {...(isLocked ? {} : crop.handlers)}>
        <img
          src={p['src'] ?? src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: p['cropX'] || p['cropY'] ? crop.objectPosition : p['pos'] ?? 'center', transform: `scale(${p['zoom'] ?? '1'})` }} />
        {(p['overlay'] ?? 'none') !== 'none' && <span className="pointer-events-none absolute inset-0" style={{ background: p['overlayColor'] ?? '#111318', opacity: { soft: 0.14, medium: 0.3, intense: 0.5 }[p['overlay'] ?? 'none'] ?? 0 }} />}
        
      </div>
      {badge && verificationPlacement === 'avatar' &&
      <span
        className={cx('absolute grid h-7 w-7 place-items-center rounded-full text-white')}
        style={{ right: shape === 'circle' ? '6%' : -4, bottom: shape === 'circle' ? '6%' : -4, boxShadow: `0 0 0 3px ${ringColor}`, ...(verificationVariant === 'official-gold' ? GOLD_BADGE_STYLE : { background: badgeTone }) }}
        aria-label={verificationVariant === 'official-gold' ? 'Perfil verificado oficial' : 'Perfil verificado'}>
        
          <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
        </span>
      }
    </Editable>);

}

export function VerifiedNameCheck({ avatarId, defaultPlacement = 'none' }: { avatarId: string; defaultPlacement?: VerificationPlacement }) {
  const { doc } = useEditor();
  const p = doc.props[avatarId] ?? {};
  const verificationVariant = usePageVerification();
  if (verificationPlacementFromProps(p, defaultPlacement) !== 'name') return null;
  const isGold = verificationVariant === 'official-gold';
  return <span className={`pointer-events-none ml-2 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-white`} style={isGold ? GOLD_BADGE_STYLE : { background: p['badgeColor'] ?? '#56604A' }} aria-label={isGold ? 'Perfil verificado oficial' : 'Nombre verificado'}><CheckIcon className="h-3 w-3" strokeWidth={3} /></span>;
}
