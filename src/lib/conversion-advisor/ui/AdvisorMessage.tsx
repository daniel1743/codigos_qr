/**
 * CRIPQER Conversion Advisor — CA-7.4-B · one message.
 *
 * The narrowest component in this directory, and the one that carries the
 * rendering guarantees. It knows a role and a string, and nothing about the
 * advisor contract — so there is no field here through which a status, a
 * limitation or a diagnostic could reach the DOM.
 *
 * WHAT IT DOES NOT DO, each of them a brief requirement made structural:
 *  · It never sets HTML. The text is a React child, so React escapes it; there
 *    is no `dangerouslySetInnerHTML` anywhere in this directory and a test reads
 *    the source of every file to prove it. Model text that looks like markup
 *    renders as the characters the model wrote.
 *  · It renders no anchor, no button and no form. A URL the model wrote is TEXT,
 *    never a destination — "no convertir texto IA en navegación automática" holds
 *    because this component has no element capable of navigating.
 *  · It never distinguishes participants by colour alone: the label is real text
 *    and the role is a data attribute, so the distinction survives a screen
 *    reader, a monochrome display and a stylesheet that failed to load.
 */

import { ROLE_LABEL, type ConversationRole } from "./types";

export interface AdvisorMessageProps {
  readonly role: ConversationRole;
  readonly text: string;
}

export function AdvisorMessage({ role, text }: AdvisorMessageProps) {
  return (
    <div className="flex flex-col gap-1" data-role={role}>
      <span className="text-xs font-semibold">{ROLE_LABEL[role]}</span>
      {/* `whitespace-pre-wrap` so a reply's own line breaks survive, and
          `break-words` so an unbroken token cannot force the page to scroll
          sideways at phone width. */}
      <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}
