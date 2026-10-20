/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the state indicator.
 *
 * The one component that tells a visitor WHICH of the six states they are
 * looking at, and the one place a notice is rendered. It takes exactly the two
 * public fields CA-7.4-A publishes — a status and a notice — and has no access
 * to anything else: no `TurnOutcome`, no reason string, no counter, no session
 * id. A diagnostic cannot be shown here because there is no prop it could arrive
 * in.
 *
 * WHY IT IS THE ONLY LIVE REGION. Announcing a turn twice is the common
 * accessibility defect in a chat surface: a live transcript container plus a
 * live status line both fire, and a screen-reader user hears the same turn
 * spoken over itself. So the transcript container is NOT a live region, and this
 * element — whose content changes exactly once per turn, from the in-flight
 * label to the settled one — is the single announcement. The message text itself
 * is read on demand, not pushed.
 *
 * WHY `FALLBACK` CANNOT PASS FOR AN ANSWER. The label comes from an exhaustive
 * table over the six states, and the notice comes from the contract's own
 * deterministic table; the validator that admitted this response already refused
 * any response whose notice text was not the table's. So a fallback always shows
 * its own label AND its own sentence, and there is no code path in this
 * component that could render one without the other.
 */

import type { AdvisorUiNotice, AdvisorUiStatus } from "../integration/ui-contract";
import { ADVISOR_STATUS_LABEL } from "./types";

export interface AdvisorStatusProps {
  readonly status: AdvisorUiStatus;
  /** Present exactly when the state requires it. The contract's table decides. */
  readonly notice: AdvisorUiNotice | null;
}

export function AdvisorStatus({ status, notice }: AdvisorStatusProps) {
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs"
      // `role="status"` implies `aria-live="polite"`; both are written so the
      // behaviour does not depend on an assistive technology inferring it.
      role="status"
      aria-live="polite"
      data-status={status}
    >
      <span className="font-medium">{ADVISOR_STATUS_LABEL[status]}</span>
      {notice !== null && <span className="text-muted-foreground">{notice.text}</span>}
    </div>
  );
}
