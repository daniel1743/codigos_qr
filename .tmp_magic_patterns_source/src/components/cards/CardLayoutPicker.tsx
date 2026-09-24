import React from 'react';
import { cx } from '../../utils/cx';
import type { CardLayout } from '../../types/editor';

interface CardLayoutPickerProps {
  options: {value: CardLayout;label: string;}[];
  value: CardLayout;
  onChange: (value: CardLayout) => void;
  /** Maps an option value to the thumbnail layout (used when options are family variant ids). */
  thumbFor?: (value: CardLayout) => CardLayout;
}

const img = 'rounded-[3px] bg-[#C9CED6]';
const line = 'block rounded-full bg-[#9AA1AB]';

function Lines({ short = false }: {short?: boolean;}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
      <span className={cx(line, 'h-1.5 w-full')} />
      <span className={cx(line, 'h-1 opacity-60', short ? 'w-1/2' : 'w-3/4')} />
    </span>);

}

export function CardLayoutThumb({ layout }: {layout: CardLayout;}) {
  switch (layout) {
    case 'left':
    case 'right':
      return (
        <span className={cx('flex h-full gap-1.5 p-1.5', layout === 'right' && 'flex-row-reverse')}>
          <span className={cx(img, 'w-1/4')} />
          <Lines />
        </span>);

    case 'balanced':
      return (
        <span className="flex h-full gap-1.5 p-1.5">
          <span className={cx(img, 'w-1/2')} />
          <Lines />
        </span>);

    case 'top':
    case 'bottom':
      return (
        <span className={cx('flex h-full flex-col gap-1 p-1.5', layout === 'bottom' && 'flex-col-reverse')}>
          <span className={cx(img, 'flex-1')} />
          <span className={cx(line, 'h-1.5 w-2/3')} />
        </span>);

    case 'editorial':
      return (
        <span className="flex h-full items-end gap-1.5 p-1.5">
          <span className={cx(img, 'h-full w-3/5')} />
          <span className="flex flex-1 flex-col gap-1 pb-0.5">
            <span className={cx(line, 'h-2 w-full')} />
            <span className={cx(line, 'h-1 w-2/3 opacity-60')} />
          </span>
        </span>);

    case 'compact':
      return (
        <span className="flex h-full items-center gap-1.5 px-1.5">
          <span className={cx(img, 'h-5 w-5 shrink-0')} />
          <Lines short />
        </span>);

    case 'beforeAfter':
      return (
        <span className="flex h-full flex-col gap-1 p-1.5">
          <span className="grid flex-1 grid-cols-2 gap-0.5">
            <span className="rounded-[3px] bg-[#9AA1AB]" />
            <span className={img} />
          </span>
          <span className={cx(line, 'h-1.5 w-2/3')} />
        </span>);

    default:
      return (
        <span className="flex h-full flex-col justify-center gap-1 rounded-[4px] bg-[#15171C] p-2">
          <span className="block h-1.5 w-3/4 rounded-full bg-white" />
          <span className="block h-1 w-1/2 rounded-full bg-white/60" />
        </span>);

  }
}

/** «Diseño»: transforms the same card — never swaps it for a different component. */
export function CardLayoutPicker({ options, value, onChange, thumbFor }: CardLayoutPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cx('rounded-xl border p-1.5 text-left transition-colors duration-150', active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
            
            <span className="block h-12 overflow-hidden rounded-lg border border-black/5 bg-white">
              <CardLayoutThumb layout={thumbFor ? thumbFor(o.value) : o.value} />
            </span>
            <span className="mt-1.5 block px-0.5 text-[11.5px] font-medium leading-tight text-ink">{o.label}</span>
          </button>);

      })}
    </div>);

}