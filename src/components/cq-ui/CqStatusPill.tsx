import { cn } from "../../lib/utils";

/**
 * F6 — Consolidated status pill.
 *
 * Geometry and the two approved tones (published / draft) are copied verbatim
 * from `src/components/home/StatusPill.tsx` (F2), so re-pointing F2 at this file
 * changes nothing visually. The extra tones use only color families that already
 * exist in the authenticated app (emerald = active, amber = expiring/expired,
 * red = exhausted/destructive) so no new palette is introduced.
 */
export type CqStatusTone = "positive" | "neutral" | "warning" | "danger" | "info";

const toneClasses: Record<CqStatusTone, string> = {
  positive: "bg-emerald-50 text-emerald-700",
  neutral: "bg-cq-canvas text-cq-muted ring-1 ring-cq-line",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-cq-blue-50 text-cq-blue",
};

const dotClasses: Record<CqStatusTone, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-cq-subtle",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-cq-blue",
};

export function CqStatusPill({
  tone = "neutral",
  label,
  className,
}: {
  tone?: CqStatusTone | undefined;
  label: string;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Back-compatible wrapper used by F2/F3 call sites: `published` maps to the
 * exact approved positive/neutral pair.
 */
export function CqPublishPill({
  published,
  activeLabel = "Publicada",
  inactiveLabel = "Borrador",
  className,
}: {
  published: boolean;
  activeLabel?: string | undefined;
  inactiveLabel?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <CqStatusPill
      tone={published ? "positive" : "neutral"}
      label={published ? activeLabel : inactiveLabel}
      className={className}
    />
  );
}

export default CqStatusPill;
