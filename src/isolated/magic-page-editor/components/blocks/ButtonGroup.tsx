import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { EditableCTA, type CtaVariants } from '../editor/EditableCTA';
import { iconForId } from '../editor/controls/IconPicker';
import { buttonIdentity, normalizeButtonIcon, readButtonGroup, suggestButtonIcon, type LegacyButtonSeed } from '../../utils/buttonGroup';
import { cx } from '../../utils/cx';

interface ButtonGroupProps {
  blockKey: string;
  seeds: LegacyButtonSeed[];
  variants: CtaVariants;
  maxWidth?: number;
  className?: string;
  mobile?: boolean;
  semanticContext?: string;
}

/** Per-size rhythm of the collection. Each size must be visibly different. */
const SIZE_TOKENS = {
  sm: { minHeight: 64, paddingBlock: 12, paddingInline: 16, label: 18, sub: 11.5 },
  md: { minHeight: 78, paddingBlock: 14, paddingInline: 20, label: 22, sub: 12.5 },
  lg: { minHeight: 92, paddingBlock: 18, paddingInline: 26, label: 26, sub: 13.5 },
  full: { minHeight: 84, paddingBlock: 16, paddingInline: 24, label: 22, sub: 12.5 },
} as const;

const PRIMARY_STYLE: React.CSSProperties = {
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: '1px solid transparent',
  boxShadow: '0 12px 26px -18px var(--accent)',
};

/** Shared link/button collection. Legacy links.N are adapted without being rewritten. */
export function ButtonGroup({ blockKey, seeds, variants, maxWidth = 640, className, mobile = false, semanticContext = '' }: ButtonGroupProps) {
  const { doc } = useEditor();
  const group = readButtonGroup(doc, blockKey, seeds);
  const groupVariant = group.groupProps['groupCardCtaVariant'] ?? 'soft';
  const groupShape = group.groupProps['groupCardCtaShape'] ?? 'pill';
  const groupSize = group.groupProps['groupCardCtaSize'] ?? 'md';
  const groupIconPosition = group.groupProps['groupCardCtaIconPosition'] ?? 'left';
  const groupKind = group.groupProps['groupCardCtaKind'] ?? 'standard';
  const gap = group.groupProps['groupSpacing'] === 'tight' ? 'gap-2' : group.groupProps['groupSpacing'] === 'loose' ? 'gap-5' : 'gap-3.5';
  const align = group.groupProps['groupAlignment'] === 'left' ? 'items-start' : group.groupProps['groupAlignment'] === 'right' ? 'items-end' : 'items-center';
  const fullWidth = group.groupProps['groupFullWidth'] === 'off' ? false : true;
  const hover = group.groupProps['groupHover'] ?? 'lift';
  const hoverClass = hover === 'none'
    ? ''
    : hover === 'glow'
      ? 'motion-safe:hover:shadow-[0_10px_28px_-16px_var(--accent)]'
      : 'motion-safe:hover:-translate-y-0.5';
  const groupColors: React.CSSProperties = {
    ...(group.groupProps['groupCardCtaBackground'] ? { background: group.groupProps['groupCardCtaBackground'] } : {}),
    ...(group.groupProps['groupCardCtaText'] ? { color: group.groupProps['groupCardCtaText'] } : {}),
    ...(group.groupProps['groupCardCtaBorder'] ? { border: `1px solid ${group.groupProps['groupCardCtaBorder']}` } : {})
  };
  const groupWeight = group.groupProps['groupTypographyWeight'] === 'bold' ? 700 : group.groupProps['groupTypographyWeight'] === 'medium' ? 600 : 400;
  const groupTracking = group.groupProps['groupTypographyTracking'] === 'wide' ? '0.08em' : group.groupProps['groupTypographyTracking'] === 'tight' ? '-0.01em' : undefined;
  const token = SIZE_TOKENS[(groupSize as keyof typeof SIZE_TOKENS)] ?? SIZE_TOKENS.md;
  const sizeStyle: React.CSSProperties = {
    minHeight: Math.round(token.minHeight * (mobile ? 0.9 : 1)),
    paddingBlock: Math.round(token.paddingBlock * (mobile ? 0.9 : 1)),
    paddingInline: Math.round(token.paddingInline * (mobile ? 0.8 : 1))
  };

  return (
    <div className={cx('mx-auto flex w-full flex-col', gap, align, className)} style={{ maxWidth }} data-button-group={blockKey} data-button-group-canonical={group.canonical ? 'true' : 'false'}>
      {group.items.map((item) => {
        const explicitIcon = normalizeButtonIcon(item.icon);
        const iconId = explicitIcon === 'none' ? undefined : explicitIcon ?? suggestButtonIcon(item.href, item.label, `${item.sub ?? ''} ${semanticContext}`);
        const Icon = iconId ? iconForId(iconId) : null;
        const iconPosition = item.iconPosition ?? groupIconPosition;
        const showIcon = !!Icon && iconPosition !== 'none';
        /* Removing the icon must actually remove it: no implicit arrow afterwards. */
        const showArrow = explicitIcon !== 'none';
        const iconBubble = (content: React.ReactNode) => (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-current/30 bg-black/5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_8%)]">
            {content}
          </span>
        );
        const leading = showIcon && iconPosition === 'left'
          ? iconBubble(<Icon className="h-5 w-5" strokeWidth={1.6} />)
          : undefined;
        const trailing = showIcon && iconPosition === 'right'
          ? iconBubble(<Icon className="h-5 w-5" strokeWidth={1.6} />)
          : showArrow ? <ArrowRightIcon className="h-5 w-5 shrink-0 opacity-70" strokeWidth={1.6} /> : undefined;
        const primary = item.isPrimary === 'on';
        const identity = buttonIdentity(group, item.stableId);
        return (
          <EditableCTA
            key={item.stableId}
            id={item.scope}
            elementLabel={identity.identity}
            label={item.label}
            sub={item.sub}
            href={item.href}
            variants={variants}
            defaultVariant={groupVariant as any}
            defaultProps={{ variant: groupVariant, shape: groupShape, size: groupSize, iconPosition, kind: groupKind }}
            isPrimary={primary}
            customStyle={{ ...groupColors, ...sizeStyle, ...(primary ? PRIMARY_STYLE : {}) }}
            forceGroupStyles={true}
            labelFill
            fullDefault={fullWidth}
            className={cx('flex items-center gap-4', hoverClass)}
            labelClassName={cx('leading-tight', group.groupProps['groupTypographyUppercase'] === 'on' && 'uppercase')}
            labelStyle={{ fontSize: Math.round(token.label * (mobile ? 0.88 : 1)), fontWeight: groupWeight, ...(groupTracking ? { letterSpacing: groupTracking } : {}) }}
            subClassName="mt-0.5 opacity-75"
            subStyle={{ fontSize: Math.round(token.sub * (mobile ? 0.92 : 1)) }}
            leading={leading}
            trailing={trailing}
          />
        );
      })}
    </div>
  );
}
