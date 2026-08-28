function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// `detail` is the server-side error description (message + stack + cause chain).
// It is rendered inside a collapsed <details> so the production visitor can see
// *why* the page failed instead of a generic message, without dumping it by default.
export function renderErrorPage(detail?: string): string {
  const detailBlock = detail
    ? `<details class="details">
        <summary>Detalles técnicos del error</summary>
        <pre>${escapeHtml(detail)}</pre>
      </details>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 34rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .hint { font-size: 0.85rem; color: #6b7280; margin: 0 0 1rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .details { text-align: left; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.75rem; background: #fff; }
      .details summary { cursor: pointer; font-weight: 600; color: #374151; }
      .details pre { margin: 0.75rem 0 0; white-space: pre-wrap; word-break: break-word; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #111; overflow: auto; max-height: 16rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <p class="hint">Pista: presiona F12 y abre la pestaña "Consola" para ver el detalle del error.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
      ${detailBlock}
    </div>
  </body>
</html>`;
}
