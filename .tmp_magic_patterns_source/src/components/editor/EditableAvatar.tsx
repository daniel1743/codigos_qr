import React from 'react';
import { CheckIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';

type AvatarSize = 'S' | 'M' | 'L';
type AvatarShape = 'circle' | 'arch' | 'rounded';

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

function radiusFor(shape: AvatarShape, w: number): string {
  if (shape === 'circle') return '9999px';
  if (shape === 'arch') return `${w / 2}px ${w / 2}px ${Math.round(w * 0.12)}px ${Math.round(w * 0.12)}px`;
  return `${Math.round(w * 0.24)}px`;
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
  const size = sizes[p.size as AvatarSize ?? defaultSize];
  const shape = p.shape as AvatarShape ?? defaultShape;
  const ring = (p.ring ?? 'on') === 'on' ? ringWidth : 0;
  const badge = (p.badge ?? (defaultBadge ? 'on' : 'off')) === 'on';
  const w = size + ring * 2;
  const h = (shape === 'arch' ? Math.round(size * 1.25) : size) + ring * 2;

  return (
    <Editable
      id={id}
      kind="avatar"
      label="Avatar"
      data-shape={shape}
      className={cx('relative shrink-0', className)}
      style={{ width: w, height: h, padding: ring, background: ring ? ringColor : 'transparent', borderRadius: radiusFor(shape, w), ...style }}>
      
      <div className="h-full w-full overflow-hidden" style={{ borderRadius: radiusFor(shape, size) }}>
        <img
          src={p.src ?? src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: p.pos ?? 'center', transform: `scale(${p.zoom ?? '1'})` }} />
        
      </div>
      {badge &&
      <span
        className="absolute grid h-7 w-7 place-items-center rounded-full text-white"
        style={{ right: shape === 'circle' ? '6%' : -4, bottom: shape === 'circle' ? '6%' : -4, background: badgeColor, boxShadow: `0 0 0 3px ${ringColor}` }}
        aria-label="Perfil verificado">
        
          <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
        </span>
      }
    </Editable>);

}