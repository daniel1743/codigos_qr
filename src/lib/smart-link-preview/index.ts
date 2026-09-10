/**
 * SMART LINK PREVIEW — NORMALIZED CONTRACT + PURE RESOLUTION (POC V1)
 *
 * This module contains ONLY pure, deterministic logic (no network I/O):
 *   - URL validation (rejects dangerous schemes)
 *   - multi-provider recognition (data-driven, extensible registry)
 *   - SSRF hostname blocking (private / loopback / link-local / metadata)
 *   - safe handle derivation from a pasted URL pathname
 *   - OpenGraph/meta parsing over an already-fetched HTML string
 *   - normalized `SmartLinkPreview` fallback construction
 *   - card enrichment (fill only if empty; never overwrite user content)
 *
 * The network boundary lives in `./server.ts` (a TanStack Start server fn)
 * so browser-side CORS/provider restrictions never apply to metadata fetch.
 */

export type SmartLinkProvider =
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "threads"
  | "pinterest"
  | "generic-web";

export type SmartLinkPreviewStatus = "full" | "partial" | "fallback" | "error";

/** Normalized runtime contract returned to the Link / Media Card editor. */
export interface SmartLinkPreview {
  url: string;
  provider: SmartLinkProvider;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  handle?: string;
  status: SmartLinkPreviewStatus;
}

/**
 * Extensible provider registry. Recognition is a data lookup, NOT a chain of
 * UI conditionals — add a new provider by appending one entry here.
 */
export interface ProviderRule {
  id: SmartLinkProvider;
  label: string;
  hosts: string[];
}

export const PROVIDERS_V1: ProviderRule[] = [
  { id: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { id: "x", label: "X", hosts: ["x.com", "twitter.com"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"] },
  { id: "threads", label: "Threads", hosts: ["threads.net"] },
  { id: "pinterest", label: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
];

export function getProviderLabel(provider: SmartLinkProvider): string {
  const rule = PROVIDERS_V1.find((r) => r.id === provider);
  return rule?.label ?? "Web";
}

/* ------------------------------------------------------------------ */
/* URL validation                                                      */
/* ------------------------------------------------------------------ */

const BLOCKED_SCHEMES = /^(javascript|data|file|blob|ftp|vbscript|about):/i;

/**
 * Validates and normalizes a pasted URL. Accepts only http/https.
 * Returns null for empty, dangerous-scheme, or malformed input.
 */
export function normalizePreviewUrl(input: string): { url: URL; href: string } | null {
  const trimmed = (input || "").trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (BLOCKED_SCHEMES.test(trimmed)) return null;

  let candidate = trimmed;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return { url, href: url.href };
}

/* ------------------------------------------------------------------ */
/* Provider recognition                                                */
/* ------------------------------------------------------------------ */

/** Normalize a hostname for matching (lowercase, strip leading/trailing dots). */
function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

/**
 * Recognize the destination provider from a URL. Unknown-but-valid http/https
 * URLs resolve to "generic-web" (the spec fallback). Invalid URLs also return
 * "generic-web" here — callers must use `normalizePreviewUrl` first to reject
 * them before any fetch.
 */
export function detectProviderFromUrl(input: string): SmartLinkProvider {
  const parsed = normalizePreviewUrl(input);
  if (!parsed) return "generic-web";
  const host = normalizeHostname(parsed.url.hostname);
  const rule = PROVIDERS_V1.find((r) =>
    r.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
  );
  return rule?.id ?? "generic-web";
}

/* ------------------------------------------------------------------ */
/* Safe handle derivation (LEVEL_2 fallback)                          */
/* ------------------------------------------------------------------ */

const RESERVED_PATH_SEGMENTS = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts", "share", "tv",
  "watch", "channel", "user", "c", "results", "search", "settings",
  "in", "company", "school", "jobs", "feed", "post", "posts", "groups", "pages",
]);

/**
 * Best-effort handle parsed directly from the pasted URL pathname.
 * Never invents data: when the path cannot be safely interpreted, returns
 * undefined and the caller keeps the provider/generic fallback only.
 */
export function parseHandleFromUrl(url: URL, provider: SmartLinkProvider): string | undefined {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return undefined;
  const first = segments[0].toLowerCase();

  switch (provider) {
    case "instagram":
    case "tiktok":
    case "threads":
    case "x":
    case "pinterest":
    case "facebook":
      if (RESERVED_PATH_SEGMENTS.has(first)) return undefined;
      return segments[0].replace(/^@/, "") || undefined;
    case "linkedin":
      if (first === "in" || first === "company" || first === "school") {
        return segments[1]?.replace(/^@/, "") || undefined;
      }
      if (!RESERVED_PATH_SEGMENTS.has(first)) return segments[0].replace(/^@/, "");
      return undefined;
    case "youtube":
      // handles live under /@creator (single segment) or /c, /channel, /user
      if (first.startsWith("@")) return first.slice(1) || undefined;
      if (first === "c" || first === "channel" || first === "user") {
        return segments[1]?.replace(/^@/, "") || undefined;
      }
      return undefined;
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* SSRF protection (used by the server fetch boundary)                */
/* ------------------------------------------------------------------ */

function ipv4Parts(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) return NaN;
    return Number(p);
  });
  if (nums.some((n) => Number.isNaN(n) || n > 255)) return null;
  return nums;
}

/** True for loopback, private RFC1918, link-local, CGNAT and reserved ranges. */
export function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = ipv4Parts(host);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24
  return false;
}

/**
 * Block localhost, loopback, private/reserved IPv4, IPv6 loopback/link-local/
 * ULA, and known cloud metadata hosts. An arbitrary preview endpoint must not
 * become an SSRF primitive.
 */
export function isBlockedPreviewHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname || "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "metadata.google.internal" || host.endsWith(".metadata.google.internal")) return true;
  if (host === "metadata.goog" || host.endsWith(".metadata.goog")) return true;

  if (host.includes(":")) {
    const lower = host.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  }

  return isPrivateOrReservedIpv4(host);
}

/* ------------------------------------------------------------------ */
/* Fallback construction                                               */
/* ------------------------------------------------------------------ */

/**
 * Build a usable fallback preview (LEVEL_2 / LEVEL_4). Never returns a broken
 * card: it always carries a working URL, provider, and (where safely derivable)
 * a site name and/or handle — but never a fabricated image.
 */
export function buildFallbackPreview(input: string, provider: SmartLinkProvider): SmartLinkPreview {
  const parsed = normalizePreviewUrl(input);
  const url = parsed ? parsed.href : input;
  const handle = parsed ? parseHandleFromUrl(parsed.url, provider) : undefined;
  const siteName =
    provider === "generic-web"
      ? parsed
        ? parsed.url.hostname
        : undefined
      : getProviderLabel(provider);

  return {
    url,
    provider,
    status: "fallback",
    ...(siteName ? { siteName } : {}),
    ...(handle ? { handle } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* OpenGraph / meta parsing (pure — operates on fetched HTML)          */
/* ------------------------------------------------------------------ */

export interface PreviewMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

function attrOf(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  return tag.match(re)?.[1];
}

const META_TAG_RE = /<meta\b[^>]*>/gi;

/** Resolve a possibly-relative metadata image URL against the page URL. */
export function resolveImageUrl(value: string | undefined, baseUrl: URL): string | undefined {
  const trimmed = (value || "").trim();
  if (!trimmed) return undefined;
  if (/^(data:|javascript:|vbscript:)/i.test(trimmed)) return undefined;
  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Extract OpenGraph/Twitter/standard meta tags from raw HTML. */
export function parseMetadata(html: string, baseUrl: URL): PreviewMetadata {
  const meta: PreviewMetadata = {};
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const htmlTitle = titleMatch?.[1]?.trim();

  for (const tag of html.match(META_TAG_RE) ?? []) {
    const key = (attrOf(tag, "property") || attrOf(tag, "name") || "").toLowerCase();
    const content = attrOf(tag, "content");
    if (!content) continue;

    if (key === "og:title" || key === "twitter:title") {
      meta.title = meta.title || content.trim();
    } else if (key === "og:description" || key === "twitter:description" || key === "description") {
      meta.description = meta.description || content.trim();
    } else if (key === "og:image" || key === "twitter:image" || key === "twitter:image:src") {
      meta.imageUrl = meta.imageUrl || resolveImageUrl(content, baseUrl);
    } else if (key === "og:site_name") {
      meta.siteName = meta.siteName || content.trim();
    }
  }

  if (!meta.title && htmlTitle) meta.title = htmlTitle;
  return meta;
}

/** Map resolved metadata into a normalized status. */
export function deriveStatus(metadata: PreviewMetadata): SmartLinkPreviewStatus {
  const hasTitle = Boolean(metadata.title);
  const hasImage = Boolean(metadata.imageUrl);
  const hasAny = hasTitle || hasImage || Boolean(metadata.description);
  if (!hasAny) return "fallback";
  if (hasTitle && hasImage) return "full";
  return "partial";
}

/* ------------------------------------------------------------------ */
/* Card enrichment (fill only if empty — never overwrite user content) */
/* ------------------------------------------------------------------ */

export interface CardEnrichmentInput {
  title: string;
  /** True when the current title is only the auto label (e.g. link label). */
  titleIsDefault: boolean;
  description?: string;
  imageUrl?: string;
}

export interface CardEnrichmentResult {
  title?: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Compute which card fields may be filled from a preview. Existing user-entered
 * title / description / image are always preserved.
 */
export function computeCardEnrichment(
  input: CardEnrichmentInput,
  preview: SmartLinkPreview,
): CardEnrichmentResult {
  const result: CardEnrichmentResult = {};

  const resolvedTitle = preview.title || (preview.handle ? `@${preview.handle}` : undefined);
  const titleEmpty = !input.title || input.title.trim().length === 0;
  if ((titleEmpty || input.titleIsDefault) && resolvedTitle) {
    result.title = resolvedTitle;
  }

  if ((!input.description || input.description.trim().length === 0) && preview.description) {
    result.description = preview.description;
  }

  if ((!input.imageUrl || input.imageUrl.trim().length === 0) && preview.imageUrl) {
    result.imageUrl = preview.imageUrl;
  }

  return result;
}

