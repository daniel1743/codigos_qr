import React from "react";
import { cx } from "../../utils/cx";
import type { LucideIcon } from "lucide-react";
interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: (() => void) | undefined;
  active?: boolean | undefined;
  danger?: boolean | undefined;
  disabled?: boolean | undefined;
  showLabel?: boolean | undefined;
  swatch?: string | undefined;
}
export function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
  danger,
  disabled,
  showLabel,
  swatch
}: ToolButtonProps) {
  return <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active} className={cx('inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-35', active ? 'bg-select-soft text-select' : danger ? 'text-[#C2410C] hover:bg-[#FFF1EA]' : 'text-ink hover:bg-[#F2F3F5]')}>
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      {swatch && <span className="h-3 w-3 rounded-full border border-black/15" style={{
      background: swatch
    }} />}
      {showLabel && <span>{label}</span>}
    </button>;
}