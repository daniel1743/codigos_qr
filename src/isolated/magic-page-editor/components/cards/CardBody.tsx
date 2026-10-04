import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { EditableText } from '../editor/EditableText';
import { EditableCTA, type CtaVariants } from '../editor/EditableCTA';
import { Editable } from '../editor/Editable';
import { EditableBadge } from './EditableBadge';
import { cx } from '../../utils/cx';
import type { CardFamilyDef, CardItem } from '../../types/editor';

export type BodySize = 'sm' | 'md' | 'lg';

interface CardBodyProps {
  id: string;
  family: CardFamilyDef;
  item: CardItem;
  size: BodySize;
  show: {price: boolean;prev: boolean;badge: boolean;cta: boolean;};
  inlineBadge: boolean;
  sale: boolean;
  onAccent: boolean;
  className?: string;
  cardProps?: Record<string, string>;
  /**
   * E1.3 — `false` when the card ships its own palette (card.0 style): its
   * persisted per-element colours are NOT overridden by "Unificar color".
   */
  unifyEligible?: boolean;
}

const justify: Record<string, string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end', full: '' };

/** Content column shared by every family: eyebrow → title → description → price / CTA footer. */
export function CardBody({ id, family, item, size, show, inlineBadge, sale, onAccent, className, cardProps = {}, unifyEligible = true }: CardBodyProps) {
  const { doc, isMobile: m } = useEditor();
  const t = useThemeTokens();
  const display: React.CSSProperties = { fontFamily: t.displayFont };
  const isMenu = family.id === 'menu';
  const pill = t.radius < 8 ? 'rounded-[4px]' : 'rounded-full';

  const titleSize =
  size === 'lg' ? m ? 'text-[26px]' : 'text-[38px]' : size === 'sm' ? 'text-[15.5px] font-semibold' : m ? 'text-[19px]' : 'text-[22px]';
  const ctaVariants: CtaVariants = {
    solid: onAccent ? { background: 'var(--fg)', color: 'var(--accent)' } : { background: 'var(--accent)', color: 'var(--accent-fg)' },
    outline: { boxShadow: 'inset 0 0 0 1px var(--fg)', color: 'var(--fg)' },
    soft: { background: 'var(--surface)', color: 'var(--fg)', boxShadow: '0 0 0 1px var(--line)' }
  };
  const ctaProps = doc.props[`${id}.cta`] ?? {};
  const ctaAlign = ctaProps.align ?? 'left';
  const surfaceId = `${id}.surface`;
  const surfaceProps = doc.props[surfaceId] ?? {};
  const surfacePadding = { S: 8, M: 16, L: 24 }[surfaceProps.padding ?? 'M'] ?? 16;
  const surfaceStyle: React.CSSProperties | undefined = Object.keys(surfaceProps).length ? {
    background: surfaceProps.bg || undefined,
    border: `${Number(surfaceProps.borderWidth ?? 0)}px solid ${surfaceProps.borderColor || 'transparent'}`,
    borderRadius: surfaceProps.radius === 'none' ? 0 : surfaceProps.radius === 'round' ? 24 : 14,
    padding: surfaceProps.padding ? surfacePadding : undefined,
    boxShadow: surfaceProps.shadow === 'soft' ? '0 8px 22px rgba(16,24,40,.08)' : surfaceProps.shadow === 'lifted' ? '0 16px 34px rgba(16,24,40,.14)' : undefined,
  } : undefined;

  const price = show.price && item.price &&
  <EditableText
    id={`${id}.price`}
    value={item.price}
    as="span"
    kind="price"
    label="Precio"
    unifyEligible={unifyEligible}
    className={cx('cq-fg font-semibold tabular-nums', sale ? 'text-[20px]' : size === 'sm' ? 'text-[14.5px]' : 'text-[17px]')}
    style={sale && !onAccent ? { color: 'var(--accent)' } : undefined} />;


  const prev = show.prev && item.previousPrice &&
  <EditableText id={`${id}.prev`} value={item.previousPrice} as="span" kind="price" label="Precio anterior" unifyEligible={unifyEligible} className="cq-muted text-[13.5px] tabular-nums line-through" />;

  // E1.2 — product rule: a card may render ONLY its image. Presence must be
  // decided on the EFFECTIVE text and on the element's own visibility:
  //   - `EditableText` renders `doc.texts[id] ?? value`, so owner text lives in
  //     `doc.texts`; checking the seed item alone would hide written content.
  //   - a text that exists but is HIDDEN (`doc.removed[id]`) is not visible
  //     content and must not keep an otherwise empty bottom zone alive.
  // FINAL CONTRACT: the surface exists ONLY while there is visible content, in the
  // editor too — an image-only card never shows a white patch. Restoring a title or
  // a description does NOT depend on an empty surface: it goes through the existing
  // card controls / Inspector (visibility + title/description editors).
  const effectiveTitle = doc.texts[`${id}.title`] ?? item.title;
  const effectiveDescription = doc.texts[`${id}.desc`] ?? item.description;
  const effectiveBadge = doc.texts[`${id}.badge`] ?? item.badge;
  const effectiveEyebrow = doc.texts[`${id}.eyebrow`] ?? item.eyebrow;
  const effectiveMeta = doc.texts[`${id}.meta`] ?? item.meta;
  const hidden = (key: string) => doc.removed[`${id}.${key}`] === true;
  const hasTitle = !hidden('title') && !!effectiveTitle?.trim();
  const hasDescription = !hidden('desc') && !!effectiveDescription?.trim();
  const hasBadge = !hidden('badge') && !!effectiveBadge?.trim();
  const hasEyebrow = !hidden('eyebrow') && !!effectiveEyebrow?.trim();
  const hasMeta = !hidden('meta') && !!effectiveMeta?.trim();
  const hasFooter = !!((!isMenu && (price || prev)) || (show.cta && item.cta));
  const hasBodyContent = hasTitle || hasDescription || hasFooter || (inlineBadge && show.badge && hasBadge) || hasEyebrow || hasMeta;
  if (!hasBodyContent) return null;

  return (
    <Editable id={surfaceId} kind="surface" label="Superficie de contenido" data-slot="body" className={cx('flex min-w-0 flex-col', className)} style={surfaceStyle}>
      {inlineBadge && show.badge && hasBadge &&
      <EditableBadge id={`${id}.badge`} label={effectiveBadge} defaultStyle={sale ? 'solid' : 'soft'} className="mb-2.5" />
      }
      {(hasEyebrow || hasMeta) &&
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {hasEyebrow &&
        <EditableText id={`${id}.eyebrow`} value={item.eyebrow} as="span" label={family.id === 'portfolio' ? 'Categoría' : 'Antetítulo'} unifyEligible={unifyEligible} className="cq-muted text-[11.5px] font-semibold uppercase tracking-[0.12em]" />
        }
          {hasMeta &&
        <>
              <span className="cq-muted text-[11px]" aria-hidden>
                ·
              </span>
              <EditableText id={`${id}.meta`} value={item.meta} as="span" label="Fecha" unifyEligible={unifyEligible} className="cq-muted text-[12px] tabular-nums" />
            </>
        }
        </div>
      }

      {hasTitle &&
      <div data-slot="title" className={cx(isMenu && 'flex items-baseline justify-between gap-3')}>
        <EditableText id={`${id}.title`} value={item.title} as="h3" label="Título" unifyEligible={unifyEligible} className={cx('cq-fg leading-tight', titleSize, isMenu && 'min-w-0 flex-1')} style={size === 'sm' ? undefined : display} />
        {isMenu && price && <span className="shrink-0">{price}</span>}
      </div>
      }

      {hasDescription &&
      <EditableText
        id={`${id}.desc`}
        value={item.description}
        label="Descripción"
        multiline
        unifyEligible={unifyEligible}
        className={cx('cq-muted mt-1.5 leading-relaxed', size === 'sm' ? 'line-clamp-2 text-[13px]' : size === 'lg' ? 'text-[15.5px]' : 'text-[14px]')} />
      }


      {(!isMenu && (price || prev) || show.cta && item.cta) &&
      <div className={cx('mt-auto flex flex-wrap items-center gap-x-4 gap-y-3', size === 'sm' ? 'pt-2.5' : 'pt-4')}>
          {!isMenu && (price || prev) &&
        <span className="flex items-baseline gap-2">
              {price}
              {prev}
            </span>
        }
          {show.cta && item.cta &&
        <div data-slot="cta" className={cx('flex', ctaAlign === 'full' ? 'w-full' : 'flex-1', justify[ctaAlign])}>
              <EditableCTA
            id={`${id}.cta`}
            label={item.cta}
            href="https://"
            variants={ctaVariants}
            defaultVariant={size === 'sm' ? 'soft' : 'solid'}
            fullDefault={ctaAlign === 'full'}
            defaultProps={{ variant: cardProps.ctaVariant, shape: cardProps.ctaShape, size: cardProps.ctaSize, iconPosition: cardProps.ctaIconPosition, kind: cardProps.ctaKind }}
            className={cx('inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold', pill, size === 'sm' ? 'h-8 px-3.5 text-[12.5px]' : 'h-10 px-4 text-[13px]')}
            trailing={<ArrowRightIcon className="h-3.5 w-3.5" />} />

            </div>
        }
        </div>
      }
    </Editable>);

}
