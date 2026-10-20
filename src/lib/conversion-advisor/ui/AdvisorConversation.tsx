/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the isolated conversational surface.
 *
 * A complete conversation — history, current state, an input, an explicit
 * retry — that reaches the advisor ONLY through the `transport` prop it is
 * given. CA-11 mounted it on the approved conversational landing
 * (`/landing-chat-parity`) through `useCripqerSession`; no public entry point
 * reaches it, and nothing in this file can create a page or call a service.
 *
 * CA-10B adds the ONE execution boundary: an authorised `OPEN_HELP` action
 * renders a button, and ONLY an explicit click invokes the host's injected
 * `onNavigate` callback with the contract's own `/help`. The surface never
 * navigates on render, on response projection, on a timer or on model text;
 * with no callback injected the button is disabled. The destination is
 * re-checked against the contract's literal before the callback runs, so a
 * tampered object that somehow reached the transcript still cannot navigate.
 *
 * WHAT IT OWNS: the draft text, and focus. Everything else — the transcript, the
 * single-flight rule, validation, aborting, ordering — belongs to the controller
 * behind `useAdvisorConversation`, so there is one implementation of each rule
 * rather than two that can disagree.
 *
 * THE DOUBLE-SUBMIT DEFENCE IS TWO LAYERS, on purpose. The submit button is
 * disabled while a turn is in flight, which is what a person sees; and the
 * controller refuses a second send regardless, which is what actually holds —
 * the DOM can be bypassed (a scripted click, a second form submit, a keyboard
 * repeat) and a disabled attribute cannot. The tests exercise both, and the
 * controller's test proves the guarantee without a DOM at all.
 *
 * ACCESSIBILITY, and the choices behind it:
 *  · The transcript is an ordered list with an accessible name, and it is
 *    focusable because it can overflow — a scrollable region a keyboard user
 *    cannot reach is a region they cannot read.
 *  · The transcript container is NOT a live region; `AdvisorStatus` inside each
 *    turn is. See that file for why: one announcement per turn, never two.
 *  · The textarea has a real label, and Enter inserts a newline while
 *    Ctrl/Cmd+Enter sends — the behaviour a person expects of a message box that
 *    is allowed to hold more than one line.
 *  · After a message is accepted, focus returns to the textarea so the visitor
 *    can keep typing. Focus is never moved anywhere else: a surface that steals
 *    focus when an answer arrives is unusable with a screen reader.
 */

import { useId, useRef, useState, type KeyboardEvent } from "react";

import {
  OPEN_HELP_DESTINATION,
  type AdvisorUiAction,
} from "../integration/ui-contract";
import { AdvisorMessage } from "./AdvisorMessage";
import { AdvisorStatus } from "./AdvisorStatus";
import { useAdvisorConversation } from "./useAdvisorConversation";
import {
  ADVISOR_ACTION_LABEL,
  DEFAULT_CONVERSATION_LABEL,
  isRetryable,
  type AdvisorTransport,
  type ConversationEntry,
} from "./types";

export interface AdvisorConversationProps {
  /** The only way this surface reaches a turn. Injected, never imported. */
  readonly transport: AdvisorTransport;
  /** The transcript's accessible name. Neutral by default, never branded. */
  readonly ariaLabel?: string;
  /**
   * The host's trusted internal-navigation mechanism. CA-10B's execution
   * boundary: it is called ONLY from an explicit click on an authorised
   * OPEN_HELP button. Absent means no action executes — the button is rendered
   * disabled, never wired to a fallback of our own.
   */
  readonly onNavigate?: (destination: "/help") => void;
}

/**
 * The runtime half of the closed action contract.
 *
 * The type already says an `AdvisorUiAction` is exactly `OPEN_HELP → /help`.
 * This guard restates it against values that crossed an untrusted boundary and
 * could have been tampered with despite the type, so the callback is reached
 * only for the canonical shape.
 */
function isExecutableOpenHelp(action: AdvisorUiAction): boolean {
  return (
    action.kind === "NAVIGATE_INTERNAL" &&
    action.action_id === "OPEN_HELP" &&
    action.destination === OPEN_HELP_DESTINATION
  );
}

export function AdvisorConversation({
  transport,
  ariaLabel,
  onNavigate,
}: AdvisorConversationProps) {
  const { entries, pending, maxMessageChars, send, retry, cancel } =
    useAdvisorConversation(transport);

  const [draft, setDraft] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // `useId`, so two surfaces mounted side by side never collide on `id`/`htmlFor`
  // and the label always points at its own field.
  const fieldId = useId();
  const hintId = useId();

  function submit(): void {
    const outcome = send(draft);
    // The draft is cleared ONLY when the text was accepted. A refusal is either
    // a bound the visitor can fix (too long) or a race — and in both cases
    // throwing away what they typed would be the worst possible response to it.
    if (outcome.accepted) {
      setDraft("");
      fieldRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex w-full flex-col gap-3" data-advisor-conversation="">
      <ol
        className="flex max-h-[60vh] list-none flex-col gap-4 overflow-y-auto p-0"
        tabIndex={0}
        aria-label={ariaLabel ?? DEFAULT_CONVERSATION_LABEL}
        aria-busy={pending}
        data-entry-count={entries.length}
      >
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1" data-entry-id={entry.id}>
            <EntryBody entry={entry} onRetry={retry} onNavigate={onNavigate} />
          </li>
        ))}
      </ol>

      {entries.length === 0 && (
        <p className="text-muted-foreground text-sm">Escribe un mensaje para empezar.</p>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor={fieldId}>
          Escribe tu mensaje
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          className="min-h-16 w-full resize-y rounded-md border p-2 text-sm"
          value={draft}
          rows={2}
          maxLength={maxMessageChars}
          aria-describedby={hintId}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <p id={hintId} className="text-muted-foreground text-xs">
          {draft.length}/{maxMessageChars} caracteres. Ctrl+Enter para enviar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={pending}
          >
            Enviar
          </button>
          {pending && (
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={cancel}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * One transcript entry, as the canonical surface renders it.
 *
 * Exported so a host that already owns an input (the real landing's large
 * composer) can render the Advisor's turns with the SAME status text, retry
 * button and CA-10B execution boundary, instead of re-implementing them. The
 * component is presentational: it reads the entry and calls only the callbacks
 * it is given.
 */
export interface AdvisorEntryViewProps {
  readonly entry: ConversationEntry;
  readonly onRetry: (entryId: string) => unknown;
  /** Absent means the OPEN_HELP button is disabled and nothing executes. */
  readonly onNavigate?: ((destination: "/help") => void) | undefined;
}

export function AdvisorEntryView({ entry, onRetry, onNavigate }: AdvisorEntryViewProps) {
  return <EntryBody entry={entry} onRetry={onRetry} onNavigate={onNavigate} />;
}

/**
 * One transcript entry.
 *
 * A visitor's entry shows its text and stops. An advisor's shows its text, its
 * state, and — only when the turn produced no confirmed response — a retry the
 * visitor has to press. Nothing here is derived from a status the contract did
 * not publish, and nothing is added to the text.
 */
function EntryBody({
  entry,
  onRetry,
  onNavigate,
}: {
  readonly entry: ConversationEntry;
  readonly onRetry: (entryId: string) => unknown;
  readonly onNavigate: ((destination: "/help") => void) | undefined;
}) {
  if (entry.role === "VISITOR") {
    return <AdvisorMessage role="VISITOR" text={entry.text} />;
  }

  return (
    <>
      <AdvisorMessage role="ADVISOR" text={entry.response.message} />
      <AdvisorStatus status={entry.response.status} notice={entry.response.notice} />
      {entry.response.actions.map((action) =>
        isExecutableOpenHelp(action) ? (
          <button
            key={action.action_id}
            type="button"
            data-action-id={action.action_id}
            data-action-destination={action.destination}
            className="self-start rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            // The execution boundary: no callback, no execution. A disabled
            // button still shows the visitor that the action exists.
            disabled={onNavigate === undefined}
            onClick={() => onNavigate?.(action.destination)}
          >
            {ADVISOR_ACTION_LABEL[action.action_id]}
          </button>
        ) : null,
      )}
      {isRetryable(entry) && (
        <button
          type="button"
          className="self-start rounded-md border px-3 py-1.5 text-sm"
          onClick={() => onRetry(entry.id)}
        >
          Reintentar
        </button>
      )}
    </>
  );
}
