import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CqIconTile } from "./CqIconTile";

/**
 * F6 — Consolidated honest empty state.
 *
 * Same markup/spacing approved for `NoPageCard` in F2
 * (`src/components/home/PageAssetCard.tsx`): white soft panel, blue icon tile,
 * `text-[20px]` bold title, `max-w-[520px]` muted description, action row below.
 * No decorative blobs and no invented counters — callers pass real copy only.
 */
export function CqEmptyState({
  headingId,
  icon,
  title,
  description,
  action,
  className,
}: {
  headingId?: string | undefined;
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 rounded-cq-xl border border-cq-line bg-white p-6 shadow-soft sm:p-8",
        className,
      )}
    >
      <CqIconTile size="md">{icon}</CqIconTile>
      <h2 id={headingId} className="mt-4 text-[20px] font-bold text-cq-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-cq-muted">{description}</p>
      {action ? <div className="mt-5 flex flex-wrap items-center gap-2">{action}</div> : null}
    </section>
  );
}

export default CqEmptyState;
