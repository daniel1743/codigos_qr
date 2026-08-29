import { useEffect, useState, type CSSProperties } from "react";
import {
  clearDebugEntries,
  getDebugEntries,
  startDebugCapture,
  subscribeDebug,
  type DebugEntry,
} from "../lib/debug-console";

const KIND_LABEL: Record<DebugEntry["kind"], string> = {
  error: "window.onerror",
  unhandledrejection: "promesa no controlada",
  "console.error": "console.error",
};

const KIND_COLOR: Record<DebugEntry["kind"], string> = {
  error: "#f87171",
  unhandledrejection: "#fb923c",
  "console.error": "#fbbf24",
};

const buttonStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #3f3f46",
  background: "#18181b",
  color: "#e5e7eb",
  cursor: "pointer",
  font: "inherit",
};

// Hidden overlay that appears when the user presses F12 (or opens #f12 / #debug).
// It captures client-side errors so production debugging does not depend on the
// browser DevTools being available (e.g. mobile, or environments where F12 is reserved).
export function DebugConsole() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<readonly DebugEntry[]>([]);

  useEffect(() => {
    startDebugCapture();
    setEntries(getDebugEntries());
    const unsubscribe = subscribeDebug(() => setEntries([...getDebugEntries()]));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const openIfRequested = () => {
      const hash = window.location.hash;
      if (hash === "#f12" || hash === "#debug") setOpen(true);
    };
    openIfRequested();
    window.addEventListener("hashchange", openIfRequested);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F12") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("hashchange", openIfRequested);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const copyAll = async () => {
    const text = entries
      .map(
        (entry) =>
          `[${entry.at}] ${KIND_LABEL[entry.kind]}: ${entry.message}${
            entry.stack ? `\n${entry.stack}` : ""
          }`,
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be blocked outside secure contexts.
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "flex",
        flexDirection: "column",
        background: "rgba(9, 9, 13, 0.96)",
        color: "#e5e7eb",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <strong style={{ fontSize: 13 }}>Consola de depuración (F12)</strong>
        <span style={{ color: "#9ca3af" }}>{entries.length} evento(s)</span>
        <span style={{ flex: 1 }} />
        <button onClick={copyAll} style={buttonStyle}>
          Copiar todo
        </button>
        <button
          onClick={() => {
            clearDebugEntries();
            setEntries([]);
          }}
          style={buttonStyle}
        >
          Limpiar
        </button>
        <button onClick={() => setOpen(false)} style={buttonStyle}>
          Cerrar (F12)
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {entries.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>
            Sin errores capturados. Los errores que ocurran en esta página aparecerán aquí.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  padding: 10,
                  background: "#111114",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: KIND_COLOR[entry.kind], fontWeight: 700 }}>
                    {KIND_LABEL[entry.kind]}
                  </span>
                  <span style={{ color: "#6b7280" }}>
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {entry.message}
                </div>
                {entry.stack ? (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", color: "#9ca3af" }}>Stack</summary>
                    <pre
                      style={{
                        marginTop: 6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#d1d5db",
                      }}
                    >
                      {entry.stack}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
