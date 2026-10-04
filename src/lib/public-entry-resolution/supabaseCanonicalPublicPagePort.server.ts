/**
 * PHASE 2 — Server-only, READ-ONLY adapter for `CanonicalPublicPagePort`.
 *
 * It uses ONLY sources that already exist and are already public-safe:
 *
 *   page public id   →  RPC `get_public_page_by_public_id`                 { p_public_id }
 *   page alias       →  RPC `get_public_page_by_slug`                      { p_slug }
 *   profile identity →  table `profiles` (public_id + published = true)
 *   profile alias    →  table `profiles` (slug      + published = true)
 *   profile → page   →  RPC `get_published_magic_page_by_legacy_public_id` { p_legacy_public_id }
 *
 * PUBLISHING POLICY (approved; see PUBLISHING_POLICY.md):
 *   - `pages.published_template_config` is the canonical public source whenever
 *     a modern page is published.
 *   - `profiles.published_*` stays untouched as legacy compatibility for
 *     profiles without a modern published page yet.
 *   - Nothing is deleted, migrated, overwritten or physically flagged here.
 *   - A DRAFT can never resolve publicly: every lookup is published-only and the
 *     page mappers additionally require the published document to exist.
 *   - Infrastructure errors are NEVER a silent fallback: each read raises
 *     `CanonicalPublicPageReadError` naming the failed operation.
 *
 * Reads only (`rpc` + `select`) and it is NOT wired to any route yet (Phase 3).
 * The Supabase client is injected, so it is fully testable without a database.
 */
import type {
  CanonicalPublicPagePort,
  PublishedPageRef,
  PublishedProfileRef,
} from "./resolveCanonicalPublicPage";

/** Raised for infrastructure failures (never for "not found"). */
export class CanonicalPublicPageReadError extends Error {
  readonly operation: string;

  constructor(operation: string, cause: unknown) {
    super(`No se pudo resolver la página pública (${operation}).`, { cause });
    this.name = "CanonicalPublicPageReadError";
    this.operation = operation;
  }
}

export interface ReadResult {
  data: unknown;
  error: unknown;
}

/** Minimal structural view of a PostgREST read builder (duck-typed). */
export interface ReadQuery extends PromiseLike<ReadResult> {
  eq(column: string, value: unknown): ReadQuery;
  maybeSingle(): Promise<ReadResult>;
}

/** Minimal read-only surface of the Supabase client. */
export interface CanonicalPublicReadClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<ReadResult>;
  from(table: string): { select(columns: string): ReadQuery };
}

const PROFILE_COLUMNS = "id,public_id,slug,published";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fail(operation: string, cause: unknown): never {
  throw new CanonicalPublicPageReadError(operation, cause);
}

/**
 * RPC helper: PostgREST answers `RETURNS TABLE (...)`, so the payload can be an
 * array, a single row, or `null` when nothing matched.
 */
async function rpcRows(
  supabase: CanonicalPublicReadClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(fn, error);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.filter(isRecord);
}

/** Map a public page RPC row → canonical page ref (published data only). */
function toPublishedPageRef(row: Record<string, unknown>): PublishedPageRef | null {
  const pagePublicId = text(row["public_id"]);
  // The public RPCs only expose published pages; requiring the published
  // document keeps "draft never resolves publicly" explicit and testable.
  if (!pagePublicId || row["published_template_config"] == null) return null;
  return { pagePublicId, pageSlug: text(row["slug"]) };
}

/** Map the legacy bridge row → canonical page ref. */
function toBridgedPageRef(row: Record<string, unknown>): PublishedPageRef | null {
  const pagePublicId = text(row["page_public_id"]);
  if (!pagePublicId) return null;
  return { pagePublicId, pageSlug: text(row["page_slug"]) };
}

/**
 * Build the port over a read-only client. The returned port never mutates
 * anything and never converts an outage into a fallback.
 */
export function createSupabaseCanonicalPublicPagePort(
  supabase: CanonicalPublicReadClient,
): CanonicalPublicPagePort {
  async function readPageFromRpc(
    fn: string,
    argName: string,
    value: string,
  ): Promise<PublishedPageRef | null> {
    const rows = await rpcRows(supabase, fn, { [argName]: value });
    const row = rows[0];
    return row ? toPublishedPageRef(row) : null;
  }

  async function readPublishedProfile(
    column: "public_id" | "slug",
    value: string,
  ): Promise<PublishedProfileRef | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq(column, value)
      .eq("published", true)
      .maybeSingle();
    if (error) fail(`profiles.${column}`, error);
    if (!isRecord(data)) return null;
    const profilePublicId = text(data["public_id"]);
    if (!profilePublicId) return null;
    return { profilePublicId, profileSlug: text(data["slug"]) };
  }

  return {
    findPublishedPageByPublicId: (publicId) =>
      readPageFromRpc("get_public_page_by_public_id", "p_public_id", publicId),

    findPublishedPageBySlug: (slug) => readPageFromRpc("get_public_page_by_slug", "p_slug", slug),

    findPublishedProfileByPublicId: (publicId) => readPublishedProfile("public_id", publicId),

    findPublishedProfileBySlug: (slug) => readPublishedProfile("slug", slug),

    /** Legacy bridge: the profile's published modern page, or null when not migrated. */
    findPublishedPageForProfile: async (profilePublicId) => {
      const rows = await rpcRows(supabase, "get_published_magic_page_by_legacy_public_id", {
        p_legacy_public_id: profilePublicId,
      });
      const row = rows[0];
      return row ? toBridgedPageRef(row) : null;
    },
  };
}
