import type { ReactNode } from "react";
import { CqPageHeader } from "../../cq-ui/CqPageHeader";
import { CqPublishPill } from "../../cq-ui/CqStatusPill";

/**
 * F4 — QR Studio header.
 *
 * Mirrors the Magic QR Studio header hierarchy (title + real publication state
 * + short explanation + context). `published` MUST come from the real row
 * (`profiles.published` / `pages.published`) — no fabricated state.
 *
 * F6 consolidation: delegates to `cq-ui/CqPageHeader` + `cq-ui/CqStatusPill`,
 * keeping the exact approved markup and the original public API.
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
    <CqPageHeader
      title={title}
      description={description}
      pill={
        typeof published === "boolean" ? (
          <CqPublishPill
            published={published}
            activeLabel={activeLabel ?? "Publicada"}
            inactiveLabel={inactiveLabel ?? "Borrador"}
          />
        ) : undefined
      }
      context={context}
      actions={actions}
    />
  );
}

export default QrStudioHeader;
