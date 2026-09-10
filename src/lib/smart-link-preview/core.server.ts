

import {
  buildFallbackPreview,
  detectProviderFromUrl,
  deriveStatus,
  getProviderLabel,
  isBlockedPreviewHostname,
  normalizePreviewUrl,
  parseHandleFromUrl,
  parseMetadata,
  type PreviewMetadata,
  type SmartLinkPreview,
} from "./index";

/**
 * Server-side metadata resolution boundary.
 *
 * We deliberately DO NOT fetch Instagram/Facebook/TikTok/etc. from the browser:
 * those requests would fail on CORS/provider restrictions. Instead a TanStack
 * Start server fn performs a bounded, SSRF-protected OpenGraph fetch and returns
 * only a normalized `SmartLinkPreview` — never raw HTML, never provider secrets.
 */

const MAX_BYTES = 512 * 1024; // bounded response size
const TIMEOUT_MS = 5000; // bounded timeout
const MAX_REDIRECTS = 3; // limited redirect count

async function readLimited(res: Response): Promise<string> {
  if (!res.body) {
    const text = await res.text();
    return text.slice(0, MAX_BYTES);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    result += decoder.decode(value, { stream: true });
    if (total >= MAX_BYTES) break;
  }
  return result.slice(0, MAX_BYTES);
}

async function fetchMetadataSafely(url: URL): Promise<PreviewMetadata | null> {
  // Lazy-load the server-only fetch seam so the client bundle never evaluates
  // `@tanstack/react-start/server-only`. This mirrors the dynamic-import pattern
  // used by `generation-server.ts` and `parametric-engine-v2/media/server.ts`.
  const { fetchServerIntegration } = await import("@/server/integrations/server-fetch");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = url;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      // Re-check SSRF on every hop (blocks redirects into private destinations).
      if (isBlockedPreviewHostname(current.hostname)) return null;

      const res = await fetchServerIntegration(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: "text/html,application/xhtml+xml" },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, current);
        if (isBlockedPreviewHostname(current.hostname)) return null;
        continue;
      }

      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml/i.test(contentType)) return null;

      const html = await readLimited(res);
      return parseMetadata(html, current);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveSmartLinkPreview(inputUrl: string): Promise<SmartLinkPreview> {
  const parsed = normalizePreviewUrl(inputUrl);
  const provider = detectProviderFromUrl(inputUrl);

  if (!parsed) {
    return { url: inputUrl, provider, status: "error" };
  }

  if (isBlockedPreviewHostname(parsed.url.hostname)) {
    return buildFallbackPreview(parsed.href, provider);
  }

  const metadata = await fetchMetadataSafely(parsed.url);
  if (!metadata) {
    return buildFallbackPreview(parsed.href, provider);
  }

  const handle = parseHandleFromUrl(parsed.url, provider);
  const siteName =
    metadata.siteName || (provider !== "generic-web" ? getProviderLabel(provider) : parsed.url.hostname);

  const result: SmartLinkPreview = {
    url: parsed.href,
    provider,
    status: deriveStatus(metadata),
  };

  if (metadata.title) result.title = metadata.title;
  if (metadata.description) result.description = metadata.description;
  if (metadata.imageUrl) result.imageUrl = metadata.imageUrl;
  if (siteName) result.siteName = siteName;
  if (handle) result.handle = handle;

  return result;
}
