import React from 'react';
import { SocialIcon } from '../../icons/SocialIcon';
import { socialPlatforms } from '../../../data/socialPlatforms';
import { cx } from '../../../utils/cx';
import type { SocialPlatform } from '../../../types/editor';

interface PlatformPickerProps {
  value: SocialPlatform;
  onChange: (value: SocialPlatform) => void;
}

export function PlatformPicker({ value, onChange }: PlatformPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {socialPlatforms.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p.id)}
            className={cx(
              'flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-medium transition-colors duration-150',
              active ? 'border-select bg-select-soft text-select' : 'border-line text-ink hover:border-[#CDD1D7]'
            )}>
            
            <SocialIcon platform={p.id} className="h-5 w-5" />
            {p.label}
          </button>);

      })}
    </div>);

}