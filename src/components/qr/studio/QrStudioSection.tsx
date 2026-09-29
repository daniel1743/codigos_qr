import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

/**
 * F4 — Soft panel used to group QR controls (Magic "soft panel" treatment).
 *
 * Presentation only: it never owns state, it never gates capabilities. Callers
 * decide which real control goes inside.
 */
export function QrStudioSection({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(actions);
  return (
    <section
      className={cn(
        "min-w-0 rounded-cq-lg border border-cq-line bg-white p-4 shadow-soft sm:rounded-cq-xl sm:p-5",
        className,
      )}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-cq-ink">
                {icon}
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-[12.5px] leading-relaxed text-cq-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className={hasHeader ? "mt-4" : undefined}>{children}</div> : null}
    </section>
  );
}

export default QrStudioSection;
