import type { ReactNode } from "react";
import { CqPanel } from "../../cq-ui/CqPanel";

/**
 * F4 — Soft panel used to group QR controls (Magic "soft panel" treatment).
 *
 * Presentation only: it never owns state, it never gates capabilities. Callers
 * decide which real control goes inside.
 *
 * F6 consolidation: this now delegates to `cq-ui/CqPanel`, which carries the
 * byte-identical approved markup (`rounded-cq-lg sm:rounded-cq-xl`,
 * `border-cq-line`, `bg-white`, `shadow-soft`, `p-4 sm:p-5`, same header block).
 * QR Studio keeps its public API while Documents/Account reuse the same source.
 */
export function QrStudioSection({
  title,
  description,
  icon,
  actions,
  children,
  className,
  visual = "default",
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  visual?: "default" | "magic";
}) {
  return (
    <CqPanel
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      className={className}
      visual={visual}
    >
      {children}
    </CqPanel>
  );
}

export default QrStudioSection;
