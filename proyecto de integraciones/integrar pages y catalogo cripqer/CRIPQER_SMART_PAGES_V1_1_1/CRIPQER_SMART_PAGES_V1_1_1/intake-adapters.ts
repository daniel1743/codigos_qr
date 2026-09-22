/**
 * CRIPQER SMART PAGES V1 — content intake adapters.
 *
 * REAL parsing (no dependencies): JSON, CSV, plain text / pasted lists.
 * ADAPTER-ONLY boundaries (no parsing here, host supplies an extractor):
 * PDF, DOCX, XLSX, images/screenshots, public URL.
 *
 * Adapters never invent data. They only report what the source contains.
 */

export type IntakeSourceKind = "json" | "csv" | "text" | "pdf" | "docx" | "xlsx" | "image" | "url";

/** A loose, pre-normalization record extracted from any source. */
export interface DraftRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export interface IntakeDraft {
  source: IntakeSourceKind;
  records: DraftRecord[];
  /** Untyped leftovers (headings, paragraphs) kept for review. */
  notes: string[];
  warnings: string[];
}

export interface IntakeAdapter {
  kind: IntakeSourceKind;
  /** true when this build can actually extract data from the source. */
  supported: boolean;
  parse(input: IntakeInput): Promise<IntakeDraft>;
}

export type IntakeInput =
  | { type: "string"; value: string }
  | { type: "url"; value: string }
  | { type: "binary"; value: ArrayBuffer; filename?: string };

function unsupported(kind: IntakeSourceKind): IntakeAdapter {
  return {
    kind,
    supported: false,
    async parse(): Promise<IntakeDraft> {
      return {
        source: kind,
        records: [],
        notes: [],
        warnings: [
          `${kind.toUpperCase()} extraction is an adapter boundary in Smart Pages V1. ` +
            `Register a host extractor with registerIntakeAdapter() to enable it.`,
        ],
      };
    },
  };
}

/* --------------------------------------------------------------- JSON (real) */

export const jsonAdapter: IntakeAdapter = {
  kind: "json",
  supported: true,
  async parse(input) {
    const draft: IntakeDraft = { source: "json", records: [], notes: [], warnings: [] };
    if (input.type !== "string") {
      draft.warnings.push("JSON adapter expects a string payload.");
      return draft;
    }
    try {
      const parsed: unknown = JSON.parse(input.value);
      const rows = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? extractFirstArray(parsed as Record<string, unknown>)
          : [];
      for (const row of rows) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          draft.records.push(flatten(row as Record<string, unknown>));
        }
      }
      if (draft.records.length === 0) draft.warnings.push("No object rows found in JSON.");
    } catch {
      draft.warnings.push("Invalid JSON — nothing was imported.");
    }
    return draft;
  },
};

function extractFirstArray(obj: Record<string, unknown>): unknown[] {
  for (const value of Object.values(obj)) if (Array.isArray(value)) return value;
  return [obj];
}

function flatten(obj: Record<string, unknown>): DraftRecord {
  const out: DraftRecord = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") {
      if (Array.isArray(value)) out[key] = value.map((v) => String(v)).join(", ");
      continue;
    }
    out[key] = value as string | number | boolean;
  }
  return out;
}

/* ---------------------------------------------------------------- CSV (real) */

/** RFC4180-ish parser: quotes, escaped quotes, embedded newlines/commas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const csvAdapter: IntakeAdapter = {
  kind: "csv",
  supported: true,
  async parse(input) {
    const draft: IntakeDraft = { source: "csv", records: [], notes: [], warnings: [] };
    if (input.type !== "string") {
      draft.warnings.push("CSV adapter expects a string payload.");
      return draft;
    }
    const rows = parseCsv(input.value);
    if (rows.length < 2) {
      draft.warnings.push("CSV needs a header row and at least one data row.");
      return draft;
    }
    const header = (rows[0] ?? []).map((h) => h.trim());
    for (const cells of rows.slice(1)) {
      const record: DraftRecord = {};
      header.forEach((key, index) => {
        const value = (cells[index] ?? "").trim();
        if (key && value) record[key] = value;
      });
      if (Object.keys(record).length > 0) draft.records.push(record);
    }
    return draft;
  },
};

/* --------------------------------------------------------------- TEXT (real) */

/**
 * Pasted lists such as:
 *   Margherita pizza - 8.500 - tomato, mozzarella
 *   Haircut | 15000
 * Category headers are lines ending in ":" or written alone in caps.
 */
export const textAdapter: IntakeAdapter = {
  kind: "text",
  supported: true,
  async parse(input) {
    const draft: IntakeDraft = { source: "text", records: [], notes: [], warnings: [] };
    if (input.type !== "string") {
      draft.warnings.push("Text adapter expects a string payload.");
      return draft;
    }
    let category = "";
    for (const raw of input.value.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (
        /:$/.test(line) ||
        (line === line.toUpperCase() && !/[|\-–]/.test(line) && line.length < 40)
      ) {
        category = line.replace(/:$/, "").trim();
        continue;
      }
      const parts = line
        .split(/\s*[|]\s*|\s+[-–—]\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) continue;
      const record: DraftRecord = { name: parts[0] ?? line };
      if (category) record["category"] = category;
      for (const part of parts.slice(1)) {
        if (looksLikePrice(part) && record["price"] === undefined) record["price"] = part;
        else
          record["description"] = record["description"] ? `${record["description"]} ${part}` : part;
      }
      draft.records.push(record);
    }
    if (draft.records.length === 0) draft.warnings.push("No list lines detected in the text.");
    return draft;
  },
};

function looksLikePrice(value: string): boolean {
  return /^[^a-zA-Z]*[$€£]?\s?\d[\d.,\s]*(usd|clp|eur|mxn|ars|cop|brl)?$/i.test(value.trim());
}

/* ------------------------------------------------------- adapter-only kinds */

const registry = new Map<IntakeSourceKind, IntakeAdapter>([
  ["json", jsonAdapter],
  ["csv", csvAdapter],
  ["text", textAdapter],
  ["pdf", unsupported("pdf")],
  ["docx", unsupported("docx")],
  ["xlsx", unsupported("xlsx")],
  ["image", unsupported("image")],
  ["url", unsupported("url")],
]);

/** Hosts plug real PDF/DOCX/XLSX/OCR/URL extraction in here. */
export function registerIntakeAdapter(adapter: IntakeAdapter): void {
  registry.set(adapter.kind, adapter);
}

export function getIntakeAdapter(kind: IntakeSourceKind): IntakeAdapter {
  return registry.get(kind) ?? unsupported(kind);
}

export function intakeSupportMatrix(): Array<{ kind: IntakeSourceKind; supported: boolean }> {
  return Array.from(registry.values()).map((a) => ({ kind: a.kind, supported: a.supported }));
}

export async function runIntake(kind: IntakeSourceKind, input: IntakeInput): Promise<IntakeDraft> {
  return getIntakeAdapter(kind).parse(input);
}
