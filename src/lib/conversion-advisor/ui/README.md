# CA-7.4-B — the isolated conversational surface

An advisor conversation a visitor can actually use — transcript, six states, an
input, a cancel, an explicit retry — that reaches the advisor **only** through a
`transport` prop the host injects. **CA-11 mounted it** on the approved
conversational landing (review route `/landing-chat-parity`) through
`useCripqerSession`; no public entry point reaches it, and nothing in this
directory can create a page, call a service or navigate.

## What is here

| File | What it is |
| --- | --- |
| `types.ts` | The surface's own vocabulary: entries, roles, the six state labels, and the `AdvisorTransport` seam. |
| `conversation-controller.ts` | **All** the logic, React-free: a pure reducer, plus the stateful controller that validates responses, enforces one request at a time, manages aborts and drops out-of-order results. |
| `useAdvisorConversation.ts` | The React binding. Creates one controller per mount, subscribes with `useSyncExternalStore`, aborts the turn in flight on unmount. |
| `AdvisorConversation.tsx` | The composed surface: transcript, empty state, form, cancel, retry. |
| `AdvisorMessage.tsx` | One message. A role and a string, and nothing else. |
| `AdvisorStatus.tsx` | The state indicator — and the only live region in the directory. |

## Using it

```tsx
import { AdvisorConversation } from "@/lib/conversion-advisor/ui/AdvisorConversation";

<AdvisorConversation transport={transport} ariaLabel="Conversación con el asesor" />
```

The host supplies the transport. That is the entire integration:

```ts
const transport: AdvisorTransport = async ({ text, signal }) => {
  const response = await fetch("/api/advisor/turn", {
    method: "POST",
    body: JSON.stringify({ text }),
    signal,
  });
  return response.json(); // returns `unknown` — the surface validates it
};
```

### Why the transport returns `unknown`

The brief's contract says a transport's output is an `AdvisorUiResponse`.
Declaring it that way would be a lie in the types: a transport is an **untrusted
boundary** — whatever the host injected, possibly a `fetch` wrapper, possibly a
mistake — and typing its result as valid would make
`validateAdvisorUiResponse` unreachable for every real input. So the interface
publishes `Promise<unknown>`, and the controller is the one place that narrows
it. The semantic contract is enforced, and enforced where it can actually fail.

### The transport is read once, at mount

A surface is given its transport when it is created. Swapping it requires a
remount (a changed `key`), because a mid-flight turn belongs to the transport
that started it. Two different transports are not interchangeable mid-turn, and
a ref that pretended otherwise would hide that.

### The transport owns the conversation's identity

A surface never sees a session id, never generates one and never sends one.
"Don't generate real session identifiers inside the interface" is satisfied by
there being no field in which one could travel. Entry ids (`visitor-3`,
`advisor-4`) are a deterministic counter that names a message **on screen**; they
are never sent, never persisted, and authorise nothing.

## The six states

`PROCESSING` · `ANSWERED` · `DEGRADED` · `FALLBACK` · `REFUSED` · `ERROR` — from
CA-7.4-A's `ui-contract.ts`, which is the only definition of what a turn's public
response is. This directory never redefines it; `types.ts` imports from it
**type-only**.

Each state gets its own label, and the six are asserted distinct. A label that
read the same for two states would undo, at the last step, the entire reason for
having six of them.

`PROCESSING` is client-local by construction: `pendingAdvisorTurn()` takes **no
input**, so a turn in flight can be produced before any request exists and can
never be produced *from* a response.

## What it will not do

- **No action is ever rendered.** `AdvisorUiAction` is `never` and
  `AUTHORISED_UI_ACTION_CATEGORIES` is empty, so the action slot is closed by
  contract rather than empty by convention.
- **No HTML, ever.** The text is a React child, so React escapes it. There is no
  `dangerouslySetInnerHTML` anywhere here, and a test reads the source of every
  file to prove it.
- **No navigation.** `AdvisorMessage` renders no anchor, no button and no form,
  so a URL the model wrote is text and never a destination.
- **No automatic retry.** A failed turn is retried only when the visitor presses
  the button. A retry can consume budget, and a spend is a person's decision.
- **No raw diagnostics.** `AdvisorStatus` takes a status and a notice, and
  nothing else: there is no prop a session id, a usage number, a budget detail or
  a guard reason could arrive in. The notice text is the contract's own table
  entry, and the validator that admitted the response already refused any
  response whose notice text was not the table's.
- **No distributed persistence.** Session scope is component-local. Nothing is
  written to storage, and nothing here promises continuity between devices or
  between instances.

## Concurrency

One request at a time per instance, and **every** accepted turn takes the next
token. When a transport settles, its token is compared against the current one.
That single comparison makes three separate requirements true at once:

- a late answer after a **cancel** — dropped;
- a slow answer after a **newer send** — dropped;
- an answer that lands after the component **unmounted** — dropped.

Cancellation has no seventh state. A cancelled turn and a transport that failed
are the same fact on the surface — there is no confirmed answer — so a cancel
settles as `ERROR`, and "don't present a cancellation as a success" needs no
special case.

`abort()` and `dispose()` are different on purpose. `abort()` is the unmount
path: it invalidates the token and aborts the transport but writes no state, so
React's StrictMode simulated unmount does not leave the remounted surface unable
to send. `dispose()` is final teardown: it also refuses every further action and
releases the listeners.

## Accessibility

- The transcript is an ordered list with an accessible name, and it is focusable
  because it can overflow — a scrollable region a keyboard user cannot reach is a
  region they cannot read.
- `AdvisorStatus` is the **only** live region. Announcing a turn twice is the
  common defect in a chat surface: a live transcript container plus a live status
  line both fire, and a screen-reader user hears the same turn spoken over
  itself. So the container is not live, and the status line — whose content
  changes exactly once per turn — is the single announcement. The message text is
  read on demand, not pushed.
- The textarea has a real label (`useId`, so two surfaces side by side never
  collide) and a `describedby` hint with the character count. Enter inserts a
  newline; Ctrl/Cmd+Enter sends.
- After a message is accepted, focus returns to the textarea. Focus is never
  moved anywhere else: a surface that steals focus when an answer arrives is
  unusable with a screen reader.

## Tests

```
npx vitest run src/lib/conversion-advisor/ui
```

- `conversation-controller.test.ts` — the rules, in plain Node: the bounds, the
  single-flight rule, the validation boundary, ordering, cancellation, retry.
- `ui-vocabulary.test.ts` — the labels are complete and distinct; `isRetryable`
  narrows.
- `isolation.test.ts` — the transport rules read off the **source** of every
  production file, with comments stripped first (the doc comments name `fetch`,
  `process.env` and `dangerouslySetInnerHTML` in order to explain why they are
  absent, and a naive scan would report a violation that does not exist).
- `AdvisorConversation.test.tsx` — the rendered surface driven by the **real**
  pipeline. The only thing simulated is the provider transport; CA-7.1B,
  CA-8, CA-3, CA-4 and CA-6 all really run.

There is no Testing Library and no jsdom in this repository, and this phase may
install nothing. The `.test.tsx` file uses the repo's own idiom: happy-dom,
`createRoot` and React's `act`.
