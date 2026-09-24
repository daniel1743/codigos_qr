import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Editable } from './Editable';
import { EditableText } from './EditableText';
import { cx } from '../../utils/cx';

export interface CtaVariants {
  solid: React.CSSProperties;
  outline: React.CSSProperties;
  soft: React.CSSProperties;
}

export type CtaVariant = keyof CtaVariants;

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
  const variant = p.variant as CtaVariant ?? defaultVariant;
  const full = (p.full ?? (fullDefault ? 'on' : 'off')) === 'on';

  const labelNode =
  <EditableText id={`${id}.label`} value={label} as="span" selectable={false} className={labelClassName} style={labelStyle} />;


  return (
    <Editable
      id={id}
      kind="cta"
      label={elementLabel}
      as="a"
      href={p.href ?? href}
      target={p.newTab === 'off' ? undefined : '_blank'}
      rel="noreferrer"
      data-variant={variant}
      className={cx(
        className,
        full ? 'w-full' : 'w-fit',
        'transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98]'
      )}
      style={variants[variant]}>
      
      {leading}
      {sub !== undefined ?
      <span className="flex min-w-0 flex-1 flex-col">
          {labelNode}
          <EditableText id={`${id}.sub`} value={sub} as="span" label="Descripción" className={subClassName} />
        </span> :

      labelNode
      }
      {trailing}
    </Editable>);

}