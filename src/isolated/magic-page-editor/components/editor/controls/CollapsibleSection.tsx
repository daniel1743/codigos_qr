import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

interface CollapsibleSectionProps {
  title: string;
  hint?: string;
  /** Advanced groups start closed so the common options stay above the fold. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Panel section that keeps advanced controls behind one explicit disclosure. */
export function CollapsibleSection({ title, hint, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="[&+&]:mt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-left transition-colors duration-150 hover:bg-[#F7F8FA]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1',
          open && 'bg-[#F7F8FA]'
        )}>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
          {hint && !open && <span className="mt-0.5 block truncate text-[11.5px] text-mute">{hint}</span>}
        </span>
        <ChevronDownIcon className={cx('h-4 w-4 shrink-0 text-mute transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </section>
  );
}
