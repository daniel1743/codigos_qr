import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { EditableText } from './EditableText';
import { cx } from '../../utils/cx';

export interface CtaVariants {
  solid: React.CSSProperties;
  outline: React.CSSProperties;
  soft: React.CSSProperties;
  ghost?: React.CSSProperties;
  glass?: React.CSSProperties;
}

export type CtaVariant = 'solid' | 'outline' | 'soft' | 'ghost' | 'glass';
export type CtaShape = 'square' | 'soft' | 'pill' | 'circle';
export type CtaSize = 'sm' | 'md' | 'lg' | 'full';
export type CtaIconPosition = 'none' | 'left' | 'right';
export type CtaKind = 'standard' | 'card';

interface EditableCTAProps {
  id: string;
  label: string;
  href: string;
  variants: CtaVariants;
  defaultVariant?: CtaVariant;
  elementLabel?: string;
  className?: string;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  sub?: string;
  subClassName?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  fullDefault?: boolean;
}

function treatmentFor(variant: CtaVariant, variants: CtaVariants): React.CSSProperties {
  return variants[variant] ?? (variant === 'ghost'
    ? { color: 'var(--fg)', background: 'transparent' }
    : variant === 'glass'
      ? { color: 'var(--fg)', background: 'color-mix(in srgb, var(--surface) 56%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--fg) 22%, transparent)', backdropFilter: 'blur(12px)' }
      : variants.solid);
}

const shapeRadius: Record<CtaShape, string> = { square: '0px', soft: '12px', pill: '9999px', circle: '9999px' };
const sizeStyle: Record<CtaSize, React.CSSProperties> = {
  sm: { minHeight: 36, paddingInline: 14, fontSize: 12 },
  md: { minHeight: 44, paddingInline: 20, fontSize: 14 },
  lg: { minHeight: 54, paddingInline: 28, fontSize: 15 },
  full: { width: '100%', minHeight: 52, paddingInline: 24, fontSize: 15 }
};

/** A button or long CTA block. Label, destination and style are all edited from the page. */
export function EditableCTA({
  id,
  label,
  href,
  variants,
  defaultVariant = 'solid',
  elementLabel = 'Botón',
  className,
  labelClassName,
  labelStyle,
  sub,
  subClassName,
  leading,
  trailing,
  fullDefault = false
}: EditableCTAProps) {
  const { doc } = useEditor();
  const p = doc.props[id] ?? {};
  const variant = p['variant'] as CtaVariant ?? defaultVariant;
  const full = (p['full'] ?? (fullDefault ? 'on' : 'off')) === 'on';
  const shape = p['shape'] as CtaShape | undefined;
  const size = p['size'] as CtaSize | undefined;
  const iconPosition = (p['iconPosition'] as CtaIconPosition | undefined) ?? 'both';
  const showLeading = iconPosition === 'left' || iconPosition === 'both';
  const showTrailing = iconPosition === 'right' || iconPosition === 'both';
  const kind = (p['kind'] as CtaKind | undefined) ?? 'standard';

  const labelNode =
  <EditableText id={`${id}.label`} value={label} as="span" selectable={false} className={labelClassName} style={labelStyle} />;


  return (
    <Editable
      id={id}
      kind="cta"
      label={elementLabel}
      as="a"
      href={p['href'] ?? href}
      target={p['newTab'] === 'off' ? undefined : '_blank'}
      rel="noreferrer"
      data-variant={variant}
      data-shape={shape}
      data-size={size}
      data-kind={kind}
      className={cx(
        className,
        full ? 'w-full' : 'w-fit',
        'transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98]'
      )}
      style={{
        ...treatmentFor(variant, variants),
        ...(shape ? { borderRadius: shapeRadius[shape] } : {}),
        ...(size ? sizeStyle[size] : {}),
        ...(shape === 'circle' ? { aspectRatio: '1', paddingInline: 0 } : {}),
      }}>
      
      {showLeading && leading}
      {sub !== undefined ?
      <span className="flex min-w-0 flex-1 flex-col">
          {labelNode}
          <EditableText id={`${id}.sub`} value={sub} as="span" label="Descripción" className={subClassName} />
        </span> :

      labelNode
      }
      {showTrailing && trailing}
    </Editable>);

}
