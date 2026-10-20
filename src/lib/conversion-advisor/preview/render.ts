/**
 * CRIPQER Conversion Advisor — CA-7.3A · the preview renderer.
 *
 * PURE. It turns a list of `PreviewMessage` into two safe artifacts: a plain
 * text transcript (for a terminal, a test assertion or a report) and a
 * self-contained HTML string (for a human to look at in a browser tab).
 *
 * WHY THIS AND NOT A COMPONENT. The brief forbids touching `src/routes/**` and
 * `src/features/approved-chat-landing/**`, so the preview may not be a React
 * surface. A pure string renderer is the honest alternative: it is the same
 * projection a component would consume, with no route, no build coupling and no
 * chance of reaching the public site.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *  · It never creates a link, a button, a form or any interactive element. A
 *    visitor's text is escaped and printed; nothing in the output is clickable.
 *    That is how "no inventar destinos ni enlaces" is enforced structurally
 *    rather than by review.
 *  · It never loads an external resource: no scripts, no fonts, no stylesheets,
 *    no images. The document is one string and nothing else.
 *  · It renders the `note` as a plain sentence — the view model already
 *    guaranteed that note contains no internal diagnostic.
 */

import {
  previewStatusLabel,
  type PreviewMessage,
  type PreviewRole,
  type PreviewStatus,
} from "./view-model";

const ROLE_LABEL: Readonly<Record<PreviewRole, string>> = {
  VISITOR: "Visitante",
  ADVISOR: "Asesor",
};

/** Statuses a reviewer must be able to tell apart at a glance. */
const DEGRADED_STATUSES: readonly PreviewStatus[] = ["DEGRADED", "REFUSED"];

/**
 * Escapes the five characters that can change the meaning of an HTML context.
 * Exported because it is the renderer's single security primitive, and a
 * reviewer (or a test) should be able to exercise it on its own.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================ plain text =============================== */

/**
 * A line-oriented transcript. Used by tests and by the report as evidence, so
 * it stays stable and diffable: one line per message, the status in brackets,
 * and the note (when there is one) indented beneath it.
 */
export function renderTranscriptText(messages: readonly PreviewMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    lines.push(
      `[${ROLE_LABEL[message.role]} · ${previewStatusLabel(message.role, message.status)}]`,
    );
    lines.push(message.text);
    if (message.note !== null) lines.push(`  (${message.note})`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/* ================================ HTML ================================= */

/**
 * A complete, self-contained HTML document. Every interpolation is escaped, and
 * the only element names used are `section`, `article`, `header`, `p` and
 * `style` — no anchors, no buttons, no inputs, no scripts.
 */
export function renderTranscriptHtml(messages: readonly PreviewMessage[], title: string): string {
  const blocks = messages.map(renderMessageHtml).join("\n");
  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    "body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#fafafa;color:#111}",
    "article{border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin:0 0 10px}",
    "header{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}",
    "p{margin:6px 0 0;white-space:pre-wrap}",
    'article[data-role="ADVISOR"]{background:#fff}',
    'article[data-role="VISITOR"]{background:#eef4ff}',
    'article[data-degraded="true"]{border-color:#c98;background:#fff8f2}',
    "p.note{margin-top:8px;font-size:13px;color:#7a4a00}",
    "</style>",
    "</head>",
    "<body>",
    `<main>${blocks}</main>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function renderMessageHtml(message: PreviewMessage): string {
  const degraded = DEGRADED_STATUSES.includes(message.status) ? "true" : "false";
  const note = message.note === null ? "" : `\n<p class="note">${escapeHtml(message.note)}</p>`;
  return [
    `<article data-role="${message.role}" data-status="${message.status}" data-degraded="${degraded}">`,
    `<header>${escapeHtml(ROLE_LABEL[message.role])} · ${escapeHtml(previewStatusLabel(message.role, message.status))}</header>`,
    `<p>${escapeHtml(message.text)}</p>${note}`,
    "</article>",
  ].join("\n");
}
