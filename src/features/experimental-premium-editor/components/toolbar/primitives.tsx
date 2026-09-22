import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "../../utils/cn";

export function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-hairline" aria-hidden="true" />;
}

interface ToolButtonProps {
  onClick?: () => void;
  label: string;
  showLabel?: boolean;
  icon?: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  dense?: boolean;
  trailingChevron?: boolean;
}

export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  { onClick, label, showLabel = true, icon, active, danger, dense = true, trailingChevron },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg font-medium transition-[background-color,color] duration-150 ease-premium",
        dense ? "h-9 px-2 text-[13px]" : "h-11 min-w-[44px] px-3 text-[14px]",
        active ? "bg-selSoft text-sel" : "text-body hover:bg-[#F2EFEA] hover:text-ink",
        danger && "text-danger hover:bg-[#FDF2F1] hover:text-danger",
      )}
    >
      {icon}
      {showLabel && <span className="whitespace-nowrap">{label}</span>}
      {trailingChevron && <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />}
    </button>
  );
});

interface PopoverProps {
  label: string;
  icon?: React.ReactNode;
  showLabel?: boolean;
  dense?: boolean;
  active?: boolean;
  align?: "start" | "end";
  children: (close: () => void) => React.ReactNode;
  width?: number;
}

export function Popover({
  label,
  icon,
  showLabel = true,
  dense = true,
  active,
  align = "start",
  children,
  width = 236,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: PopoverProps & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  // Recalculate collision when opening or on scroll/resize
  React.useLayoutEffect(() => {
    if (!open || !wrapRef.current || !popoverRef.current) return;
    const calculate = () => {
      const wrapRect = wrapRef.current!.getBoundingClientRect();
      const popRect = popoverRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const margin = 12;
      let top: string | number = "100%";
      let bottom: string | number = "auto";
      let left: string | number = align === "end" ? "auto" : 0;
      let right: string | number = align === "end" ? 0 : "auto";
      let marginTop = "8px";
      let marginBottom = "0";

      // Vertical flip
      if (dense) {
        // Preferred downward
        const spaceBelow = viewportHeight - wrapRect.bottom;
        if (spaceBelow < popRect.height + margin && wrapRect.top > popRect.height + margin) {
          top = "auto";
          bottom = "100%";
          marginTop = "0";
          marginBottom = "8px";
        }
      } else {
        // Preferred upward
        const spaceAbove = wrapRect.top;
        if (
          spaceAbove < popRect.height + margin &&
          viewportHeight - wrapRect.bottom > popRect.height + margin
        ) {
          top = "100%";
          bottom = "auto";
          marginTop = "8px";
          marginBottom = "0";
        } else {
          top = "auto";
          bottom = "100%";
          marginTop = "0";
          marginBottom = "8px";
        }
      }

      // Horizontal clamp
      // We first calculate absolute screen positions for the popover
      const preferredAbsoluteLeft = align === "end" ? wrapRect.right - width : wrapRect.left;
      const preferredAbsoluteRight = preferredAbsoluteLeft + width;

      if (preferredAbsoluteLeft < margin) {
        left = -wrapRect.left + margin;
        right = "auto";
      } else if (preferredAbsoluteRight > viewportWidth - margin) {
        right = -(viewportWidth - wrapRect.right) + margin;
        left = "auto";
      }

      setStyle({ width, top, bottom, left, right, marginTop, marginBottom });
    };

    calculate();
    window.addEventListener("scroll", calculate, true);
    window.addEventListener("resize", calculate);
    return () => {
      window.removeEventListener("scroll", calculate, true);
      window.removeEventListener("resize", calculate);
    };
  }, [open, align, width, dense]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      {trigger ? (
        trigger
      ) : (
        <ToolButton
          label={label}
          icon={icon}
          showLabel={showLabel}
          dense={dense}
          active={open || active}
          trailingChevron
          onClick={() => setOpen(!open)}
        />
      )}

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={label}
          style={{ ...style, position: "absolute", zIndex: 50 }}
          className="rounded-2xl border border-[#D6CFC5] bg-white p-3 shadow-[0_8px_30px_rgb(23,20,15,0.18)]"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function PopoverTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11.5px] font-medium text-muted">{children}</p>;
}

interface SwatchGridProps {
  colors: string[];
  value: string;
  onPick: (color: string) => void;
  allowNone?: boolean;
  onNone?: () => void;
}

export function SwatchGrid({ colors, value, onPick, allowNone, onNone }: SwatchGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Color ${color}`}
          onClick={() => onPick(color)}
          style={{ background: color }}
          className={cn(
            "h-7 w-7 rounded-full border border-black/10 transition-transform duration-150 ease-premium hover:scale-[1.06]",
            value.toLowerCase() === color.toLowerCase() && "ring-2 ring-sel ring-offset-2",
          )}
        />
      ))}
      {allowNone && (
        <button
          type="button"
          onClick={onNone}
          className="flex h-7 items-center rounded-full border border-hairline px-2.5 text-[12px] font-medium text-body transition-colors duration-150 ease-premium hover:bg-[#F2EFEA]"
        >
          Sin borde
        </button>
      )}
    </div>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  dense?: boolean;
  min?: number;
  max?: number;
  ariaLabel: string;
}

export function Stepper({
  value,
  onChange,
  suffix,
  dense = true,
  min = 0,
  max = 64,
  ariaLabel,
}: StepperProps) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <div
      className={cn("flex shrink-0 items-center rounded-lg bg-[#F5F2ED]", dense ? "h-9" : "h-11")}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Reducir"
        onClick={() => onChange(clamp(value - 1))}
        className={cn(
          "grid place-items-center rounded-lg text-body transition-colors duration-150 ease-premium hover:bg-[#EAE5DE]",
          dense ? "h-9 w-8" : "h-11 w-11",
        )}
      >
        −
      </button>
      <span
        className={cn(
          "min-w-[30px] text-center text-[13px] font-medium tabular-nums text-ink",
          !dense && "text-[14px]",
        )}
      >
        {value}
        {suffix}
      </span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + 1))}
        className={cn(
          "grid place-items-center rounded-lg text-body transition-colors duration-150 ease-premium hover:bg-[#EAE5DE]",
          dense ? "h-9 w-8" : "h-11 w-11",
        )}
      >
        +
      </button>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-[13.5px] text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-premium placeholder:text-muted/70 focus:border-sel focus:shadow-[0_0_0_3px_rgba(47,111,237,0.15)]"
      />
    </label>
  );
}

export function MenuItem({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13.5px] transition-colors duration-150 ease-premium",
        danger ? "text-danger hover:bg-[#FDF2F1]" : "text-body hover:bg-[#F5F2ED] hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
