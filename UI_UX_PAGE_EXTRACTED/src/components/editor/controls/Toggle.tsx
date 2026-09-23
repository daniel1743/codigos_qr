import React from 'react';
import { cx } from '../../../utils/cx';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl py-1.5 text-left">
      
      <span>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && <span className="block text-[12px] text-mute">{description}</span>}
      </span>
      <span className={cx('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150', checked ? 'bg-select' : 'bg-[#D5D8DD]')}>
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )} />
        
      </span>
    </button>);

}