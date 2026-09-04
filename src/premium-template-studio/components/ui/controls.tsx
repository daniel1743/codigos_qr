import type { ChangeEvent, ReactNode } from "react";
import { cx } from "../../utils";

/** Editor-chrome primitives. Deliberately dependency-free so the module
 *  can be dropped into any host without pulling a UI kit. */

export function Field({
  label,
  hint,
  children,
  inline,
  action,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  inline?: boolean;
  action?: ReactNode;
}) {
  return (
    <label className={cx("block", inline && "flex items-center justify-between gap-3")}>
      {(label || action) && (
        <div className="mb-1 flex items-center justify-between">
          {label && (
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          )}
          {action}
        </div>
      )}
      <div className={cx(inline && "shrink-0")}>{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={inputClass}
      value={value}
      placeholder={placeholder ?? ""}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      className={cx(inputClass, "resize-y leading-relaxed")}
      value={value}
      placeholder={placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberSlider({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-md border border-border bg-transparent p-0"
        aria-label="Pick color"
      />
      <input
        className="w-full bg-transparent text-xs uppercase text-foreground outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title ?? ""}
          onClick={() => onChange(option.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1 rounded-md font-medium transition",
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm text-foreground"
    >
      {label && <span>{label}</span>}
      <span
        className={cx(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-foreground" : "bg-muted",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all",
            checked ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-b-0">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
        {action}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? ""}
      onClick={onClick ?? (() => {})}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
