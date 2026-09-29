import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * F6 — Consolidated "soft panel" (Magic card treatment).
 *
 * Single source of truth for the recipe approved in F4
 * (`src/components/qr/studio/QrStudioSection.tsx`), which is byte-identical to the
 * panels hand-rolled in F2 (`PageAssetCard`, `ActivityPanel`, `PerformancePanel`)
 * and F3 (`IdentityCard`): `rounded-cq-*` + `border-cq-line` + `bg-white` +
 * `shadow-soft`.
 *
 * F4's wrapper now delegates here so the two implementations cannot drift.
 * Presentation only: this component never owns state and never gates capabilities.
 */

const PANEL_BASE = "min-w-0 border border-cq-line bg-white shadow-soft";
const PADDED = "rounded-cq-lg p-4 sm:rounded-cq-xl sm:p-5";
const FLUSH = "overflow-hidden rounded-cq-xl";
const TITLE = "flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-cq-ink";

export function CqPanel({
  title,
  description,
  icon,
  actions,
  headingId,
  variant = "padded",
  as = "section",
  className,
  children,
}: {
  title?: ReactNode | undefined;
  description?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  /** Header-aligned actions (real buttons/links supplied by the caller). */
  actions?: ReactNode | undefined;
  /** When set, the panel is a labelled landmark: title gets this id. */
  headingId?: string | undefined;
  /** "padded" = content panel; "flush" = bordered container with self-padded rows. */
  variant?: "padded" | "flush" | undefined;
  as?: "section" | "div" | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
}) {
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(actions);

  const heading =
    title && headingId ? (
      <h2 id={headingId} className={TITLE}>
        {icon}
        {title}
      </h2>
    ) : title ? (
      <h3 className={TITLE}>
        {icon}
        {title}
      </h3>
    ) : null;

  const header = hasHeader ? (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        variant === "flush" ? "border-b border-cq-line px-5 py-4 sm:px-6" : undefined,
      )}
    >
      <div className="min-w-0">
        {heading}
        {description ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-cq-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  ) : null;

  const body = children ? (
    <div className={hasHeader && variant === "padded" ? "mt-4" : undefined}>{children}</div>
  ) : null;

  const shellClass = cn(PANEL_BASE, variant === "padded" ? PADDED : FLUSH, className);

  return as === "div" ? (
    <div className={shellClass}>
      {header}
      {body}
    </div>
  ) : (
    <section aria-labelledby={headingId} className={shellClass}>
      {header}
      {body}
    </section>
  );
}

export default CqPanel;
