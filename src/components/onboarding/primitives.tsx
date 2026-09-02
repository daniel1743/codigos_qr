/**
 * CRIPQER ONBOARDING — local UI primitives.
 * Self-contained: no shared production component is imported or modified.
 * Every visual value comes from Cripqer Brand System V1 tokens.
 */

import { useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const surface: CSSProperties = { backgroundColor: "var(--surface-secondary)" };

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-secondary)]";

export function StepHeading({ title, note }: { title: string; note?: string }) {
  return (
    <header className="mb-[var(--space-6)]">
      <h1
        className="font-brand font-bold"
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-h1-size)",
          lineHeight: "var(--text-h1-leading)",
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h1>
      {note && (
        <p
          className="font-brand mt-[var(--space-2)]"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-body-size)",
            lineHeight: "var(--text-body-leading)",
          }}
        >
          {note}
        </p>
      )}
    </header>
  );
}

/* ------------------------------------------------------------ radio group */

export interface Choice<T extends string> {
  id: T;
  label: string;
  caption?: string;
  visual?: ReactNode;
}

/**
 * WAI-ARIA radiogroup: roving tabindex, Arrow/Home/End navigation,
 * Space/Enter selection. Selection is never signalled by color alone —
 * a border weight change plus an explicit check icon accompany it.
 */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedIndex = options.findIndex((o) => o.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.id);
    refs.current[option.id]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        move(-1, 1);
        break;
      case "End":
        event.preventDefault();
        move(0, -1);
        break;
      case " ":
      case "Enter": {
        event.preventDefault();
        const option = options[index];
        if (option) onChange(option.id);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid gap-[var(--space-3)] sm:grid-cols-2">
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={(el) => {
              refs.current[option.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === activeIndex ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => onChange(option.id)}
            className={cn(
              "font-brand flex w-full items-center gap-[var(--space-3)] border text-left",
              "px-[var(--space-4)] py-[var(--space-4)]",
              focusRing,
            )}
            style={{
              minHeight: "var(--touch-target-min)",
              borderRadius: "var(--brand-radius-lg)",
              borderColor: selected ? "var(--border-strong)" : "var(--border-default)",
              borderWidth: selected ? 2 : 1,
              backgroundColor: selected ? "var(--brand-primary-soft)" : "var(--surface-primary)",
              color: "var(--text-primary)",
              transition:
                "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
            }}
          >
            {option.visual}
            <span className="min-w-0 flex-1">
              <span
                className="block font-semibold"
                style={{ fontSize: "var(--text-ui-size)", lineHeight: "var(--text-ui-leading)" }}
              >
                {option.label}
              </span>
              {option.caption && (
                <span
                  className="mt-[2px] block"
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-caption-size)",
                    lineHeight: "var(--text-caption-leading)",
                  }}
                >
                  {option.caption}
                </span>
              )}
            </span>
            <CheckDot active={selected} />
          </button>
        );
      })}
    </div>
  );
}

function CheckDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center"
      style={{
        width: 22,
        height: 22,
        borderRadius: "var(--brand-radius-pill)",
        border: active ? "none" : "1px solid var(--border-default)",
        backgroundColor: active ? "var(--brand-primary)" : "transparent",
      }}
    >
      {active && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.3 4.8 8.6 9.5 3.9"
            stroke="var(--brand-primary-contrast)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------- button */

export type BtnVariant = "primary" | "secondary" | "ghost" | "premium";

export function BrandButton({
  variant = "primary",
  children,
  className,
  ...rest
}: { variant?: BtnVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: CSSProperties = {
    minHeight: "var(--touch-target-min)",
    borderRadius: "var(--brand-radius-md)",
    fontSize: "var(--text-ui-size)",
    lineHeight: "var(--text-ui-leading)",
    transition:
      "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard)",
  };
  const styles: Record<BtnVariant, CSSProperties> = {
    primary: {
      backgroundColor: "var(--brand-primary)",
      color: "var(--brand-primary-contrast)",
      border: "1px solid var(--brand-primary)",
    },
    secondary: {
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--border-default)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      border: "1px solid transparent",
    },
    premium: {
      backgroundColor: "var(--brand-gold)",
      color: "var(--brand-gold-contrast)",
      border: "1px solid var(--brand-gold)",
    },
  };
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "font-brand inline-flex items-center justify-center gap-2 px-[var(--space-6)] font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-40",
        focusRing,
        className,
      )}
      style={{ ...base, ...styles[variant] }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ field */

export function Field({
  label,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <label className="font-brand block">
      <span className="flex items-baseline justify-between gap-2">
        <span
          className="font-semibold"
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-ui-size)",
            lineHeight: "var(--text-ui-leading)",
          }}
        >
          {label}
        </span>
        {counter && (
          <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption-size)" }}>
            {counter}
          </span>
        )}
      </span>
      <span className="mt-[var(--space-2)] block">{children}</span>
      {error ? (
        <span
          className="mt-[var(--space-2)] block"
          style={{ color: "var(--state-error)", fontSize: "var(--text-caption-size)" }}
        >
          {error}
        </span>
      ) : (
        hint && (
          <span
            className="mt-[var(--space-2)] block"
            style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption-size)" }}
          >
            {hint}
          </span>
        )
      )}
    </label>
  );
}

export const controlStyle = (invalid?: boolean): CSSProperties => ({
  width: "100%",
  minHeight: "var(--touch-target-min)",
  borderRadius: "var(--brand-radius-md)",
  border: `1px solid ${invalid ? "var(--state-error)" : "var(--border-default)"}`,
  backgroundColor: "var(--surface-primary)",
  color: "var(--text-primary)",
  padding: "12px var(--space-4)",
  fontSize: "var(--text-body-size)",
  lineHeight: "var(--text-body-leading)",
});

/** Cross-fade + small vertical translate. No bounce, no spring. */
export function MotionStyles() {
  return (
    <style>{`
      @keyframes cq-enter {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .cq-step {
        animation: cq-enter var(--duration-base) var(--ease-standard) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .cq-step { animation: none; }
      }
    `}</style>
  );
}
