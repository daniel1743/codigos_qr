/**
 * F2 — Home / Command Center presentational pill.
 *
 * Maps a REAL publication state to the Magic visual treatment. No mock state:
 * callers pass the real `published` flag from the profile/page row.
 *
 * F6 consolidation: the markup now lives in `cq-ui/CqStatusPill.tsx` (shared with
 * Documents/Account). This module keeps the original F2 public API and renders the
 * identical approved markup, so F2/F3/F4 call sites are unchanged visually.
 */
import { CqPublishPill } from "../cq-ui/CqStatusPill";

export function StatusPill({
  published,
  activeLabel = "Publicada",
  inactiveLabel = "Borrador",
}: {
  published: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return <CqPublishPill published={published} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />;
}

export default StatusPill;
