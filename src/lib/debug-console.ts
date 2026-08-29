// Client-side global error capture + F12 debug console state.
// Safe to import on the server: every mutation is guarded by `typeof window`,
// and the actual wiring happens from a client component's useEffect.

export type DebugEntryKind = "error" | "unhandledrejection" | "console.error";

export type DebugEntry = {
  id: number;
  at: string;
  kind: DebugEntryKind;
  message: string;
  stack?: string;
};

type DebugListener = () => void;

const MAX_ENTRIES = 200;

const entries: DebugEntry[] = [];
const listeners = new Set<DebugListener>();
let nextId = 1;
let isCapturing = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function push(entry: { kind: DebugEntryKind; message: string; stack?: string }): void {
  const next: DebugEntry = {
    id: nextId++,
    at: new Date().toISOString(),
    kind: entry.kind,
    message: entry.message,
  };
  if (entry.stack) next.stack = entry.stack;
  entries.push(next);
  if (entries.length > MAX_ENTRIES) entries.shift();
  emit();
}

function describeUnknown(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return value.stack
      ? { message: value.message, stack: value.stack }
      : { message: value.message };
  }
  if (typeof value === "string") return { message: value };
  try {
    const serialized = JSON.stringify(value);
    return { message: serialized ?? String(value) };
  } catch {
    return { message: String(value) };
  }
}

export function startDebugCapture(): void {
  if (isCapturing || typeof window === "undefined") return;
  isCapturing = true;

  window.addEventListener("error", (event) => {
    const error: unknown = (event as ErrorEvent).error;
    const info = describeUnknown(error ?? event.message);
    const location = event.filename
      ? ` (${event.filename}:${event.lineno}:${event.colno})`
      : "";
    push({ kind: "error", message: `${event.message}${location}`, stack: info.stack });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const info = describeUnknown(event.reason);
    push({ kind: "unhandledrejection", message: info.message, stack: info.stack });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    for (const arg of args) {
      const info = describeUnknown(arg);
      push({ kind: "console.error", message: info.message, stack: info.stack });
    }
    originalConsoleError(...args);
  };
}

export function getDebugEntries(): readonly DebugEntry[] {
  return entries;
}

export function clearDebugEntries(): void {
  entries.length = 0;
  emit();
}

export function subscribeDebug(listener: DebugListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
