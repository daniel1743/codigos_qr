import { App } from "./App";
import type { StartAt } from "./types/cripqer";
import "./styles/landing.css";

interface ApprovedChatLandingProps {
  /** Which state of the approved experience to render (review/parity helper). */
  startAt?: StartAt;
}

/**
 * Host entry point of the approved conversational landing.
 *
 * This is a THIN WRAPPER: it only imports the approved stylesheet and adds the
 * ".cripqer-chat-landing" root class that carries the reference design tokens
 * (see styles/landing.css). Every component below it is the approved Magic
 * Patterns implementation, copied unchanged.
 */
export function ApprovedChatLanding({ startAt = "discover" }: ApprovedChatLandingProps) {
  return (
    <div className="cripqer-chat-landing">
      <App key={startAt} startAt={startAt} />
    </div>
  );
}

export { CripqerExperience } from "./components/CripqerExperience";
export type { StartAt } from "./types/cripqer";
