import React, { useEffect, useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { cx } from '../../../utils/cx';

interface ConfirmButtonProps {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  icon?: boolean;
  className?: string;
}

const BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1';

/** Destructive action that always asks first, and never leaves a hidden one-click delete. */
export function ConfirmButton({ label, confirmLabel = 'Sí, eliminar', onConfirm, icon = true, className }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={cx(BASE, 'border-line bg-white px-3 text-[#C2410C] hover:bg-[#FFF4EE]', className)}>
        {icon && <Trash2Icon className="h-4 w-4" />}
        {label}
      </button>);
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        className={cx(BASE, 'bg-[#C2410C] px-3 text-white hover:opacity-90', className)}>
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className={cx(BASE, 'border-line bg-white px-3 text-ink hover:bg-[#F7F8FA]')}>
        Cancelar
      </button>
    </span>);
}
