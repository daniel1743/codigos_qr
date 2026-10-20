import { App } from "./App";
import type { ConversionAdvisorClient } from "./assistant/advisors/contract";
import type { StartAt } from "./types/cripqer";
import "./styles/landing.css";

interface ApprovedChatLandingProps {
  /** Which state of the approved experience to render (review/parity helper). */
  startAt?: StartAt;
  /**
   * CONV-03 · optional transport seam. Production omits it and the session
   * builds the canonical server-function client; a test or an isolated host
   * injects a scripted one so the real landing can run with zero network.
   */
  advisorTransport?: ConversionAdvisorClient | undefined;
}

/**
 * Host entry point of the approved conversational landing.
 *
 * This is a THIN WRAPPER: it only imports the approved stylesheet and adds the
 * ".cripqer-chat-landing" root class that carries the reference design tokens
 * (see styles/landing.css). Every component below it is the approved Magic
 * Patterns implementation, copied unchanged.
 */
export function ApprovedChatLanding({ startAt = "discover", advisorTransport }: ApprovedChatLandingProps) {
  return (
    <div className="cripqer-chat-landing">
      <App key={startAt} startAt={startAt} advisorTransport={advisorTransport} />
    </div>
  );
}

export { CripqerExperience } from "./components/CripqerExperience";
export type { StartAt } from "./types/cripqer";
