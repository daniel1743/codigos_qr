import type { ReactNode } from "react";
import { StatusPill } from "../../home/StatusPill";

/**
 * F4 — QR Studio header.
 *
 * Mirrors the Magic QR Studio header hierarchy (title + real publication state
 * + short explanation + context). `published` MUST come from the real row
 * (`profiles.published` / `pages.published`) — no fabricated state.
 */
export function QrStudioHeader({
  title,
  description,
  published,
  activeLabel,
  inactiveLabel,
  context,
  actions,
}: {
  title: string;
  description: string;
  published?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  context?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[26px] font-bold leading-none tracking-[-0.035em] text-cq-ink sm:text-[36px]">
          {title}
        </h1>
        {typeof published === "boolean" ? (
          <StatusPill
            published={published}
            activeLabel={activeLabel ?? "Publicada"}
            inactiveLabel={inactiveLabel ?? "Borrador"}
          />
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-cq-muted">{description}</p>
      {context ? <div className="mt-3 text-[13px] leading-relaxed text-cq-subtle">{context}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export default QrStudioHeader;
