import React from 'react';
import { LayersIcon, SquarePenIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

/** Always-visible scope signal: the user must know the blast radius before changing anything. */
export function ScopeNote({ scope, count }: { scope: 'group' | 'item'; count?: number }) {
  const group = scope === 'group';
  const Icon = group ? LayersIcon : SquarePenIcon;
  return (
    <p
      role="note"
      className={cx(
        'flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] font-medium leading-snug',
        group ? 'bg-select-soft text-select-ink' : 'bg-[#F4F5F7] text-ink-soft'
      )}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {group
          ? `Este cambio se aplicará a todos los botones${count ? ` (${count})` : ''}.`
          : 'Solo afecta a este botón.'}
      </span>
    </p>);
}
