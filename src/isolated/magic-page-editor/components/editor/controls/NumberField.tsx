import React from 'react';
import { cx } from '../../../utils/cx';

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  /** Receives `undefined` when the field is emptied, which clears the override. */
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Shown inside the field, to the right of the number. */
  suffix?: string;
  placeholder?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Decimal-friendly numeric input.
 *
 * Empty is a real state: it means "no override", so the template's own value
 * survives. Rounding/clamping happens on commit, so the user can still type
 * `0.` on the way to `0.18`.
 */
export function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  min = 0,
  max = 10,
  suffix,
  placeholder,
}: NumberFieldProps) {
  const [draft, setDraft] = React.useState<string>(value === undefined ? '' : String(value));
  const [focused, setFocused] = React.useState(false);

  // Follow external changes, but never fight the user mid-edit.
  React.useEffect(() => {
    if (!focused) setDraft(value === undefined ? '' : String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(undefined);
      return;
    }
    const parsed = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setDraft(value === undefined ? '' : String(value));
      return;
    }
    onChange(clamp(parsed, min, max));
  };

  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-mute">{label}</span>
      <span className="relative flex items-center">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={draft}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => {
            setFocused(false);
            commit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit((event.target as HTMLInputElement).value);
          }}
          className={cx(
            'h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px] tabular-nums text-ink outline-none',
            'focus:border-select focus:ring-2 focus:ring-select/20',
            suffix && 'pr-9',
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 text-[11.5px] text-mute">{suffix}</span>
        )}
      </span>
    </label>
  );
}
