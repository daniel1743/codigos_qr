import React from "react";
import { cx } from "../../../utils/cx";
import { BoxIcon } from "lucide-react";
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: BoxIcon;
}
interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: SegmentedProps<T>) {
  return <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1 rounded-xl bg-[#F2F3F5] p-1">
      {options.map((o) => {
      const active = o.value === value;
      const Icon = o.icon;
      return <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)} className={cx('flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[12.5px] font-medium transition-colors duration-150', active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)]' : 'text-mute hover:text-ink')}>
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
          </button>;
    })}
    </div>;
}