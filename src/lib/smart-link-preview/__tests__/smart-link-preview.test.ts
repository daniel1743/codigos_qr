import { describe, expect, it } from "vitest";

import {
  buildFallbackPreview,
  computeCardEnrichment,
  detectProviderFromUrl,
  deriveStatus,
  isBlockedPreviewHostname,
  normalizePreviewUrl,
  parseHandleFromUrl,
  parseMetadata,
  resolveImageUrl,
  type SmartLinkPreview,
} from "../index";

/* ------------------------------------------------------------------ */
/* Provider detection                                                  */
/* ------------------------------------------------------------------ */

describe("smart-link-preview provider detection", () => {
  const cases: Array<[string, string]> = [
    ["https://instagram.com/example", "instagram"],
    ["https://www.instagram.com/example", "instagram"],
    ["https://facebook.com/example", "facebook"],
    ["https://www.facebook.com/example", "facebook"],
    ["https://fb.com/example", "facebook"],
    ["https://x.com/example", "x"],
    ["https://twitter.com/example", "x"],
    ["https://www.twitter.com/example", "x"],
    ["https://tiktok.com/@example", "tiktok"],
    ["https://www.tiktok.com/@example", "tiktok"],
    ["https://youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://www.youtube.com/@creator", "youtube"],
    ["https://linkedin.com/in/example", "linkedin"],
    ["https://www.linkedin.com/company/example", "linkedin"],
    ["https://threads.net/@example", "threads"],
    ["https://www.threads.net/@example", "threads"],
    ["https://pinterest.com/example", "pinterest"],
    ["https://pin.it/abc", "pinterest"],
    ["https://example.com/some/page", "generic-web"],
    ["https://www.example.com", "generic-web"],
  ];

  it.each(cases)("detects %s → %s", (url, expected) => {
    expect(detectProviderFromUrl(url)).toBe(expected);
  });
});

/* ------------------------------------------------------------------ */
/* Fallback                                                           */
/* ------------------------------------------------------------------ */

describe("smart-link-preview fallback", () => {
  it("known provider without image yields a usable fallback card", () => {
    const preview = buildFallbackPreview("https://instagram.com/daniel", "instagram");
    expect(preview.provider).toBe("instagram");
    expect(preview.status).toBe("fallback");
    expect(preview.siteName).toBe("Instagram");
    expect(preview.handle).toBe("daniel");
    expect(preview.imageUrl).toBeUndefined();
    expect(preview.url).toContain("instagram.com/daniel");
  });

  it("generic site without metadata yields hostname fallback", () => {
    const preview = buildFallbackPreview("https://example.com/hello", "generic-web");
    expect(preview.provider).toBe("generic-web");
    expect(preview.status).toBe("fallback");
    expect(preview.siteName).toBe("example.com");
    expect(preview.handle).toBeUndefined();
    expect(preview.imageUrl).toBeUndefined();
  });

  it("never fabricates an image in fallback", () => {
    const preview = buildFallbackPreview("https://tiktok.com/@someone", "tiktok");
    expect(preview.imageUrl).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* Enrichment (never overwrite user content)                          */
/* ------------------------------------------------------------------ */

describe("smart-link-preview enrichment", () => {
  const preview: SmartLinkPreview = {
    url: "https://instagram.com/daniel",
    provider: "instagram",
    title: "Daniel Studio",
    description: "Nail artist",
    imageUrl: "https://cdn.example.com/avatar.jpg",
    status: "full",
  };

  it("fills empty title", () => {
    const result = computeCardEnrichment(
      { title: "", titleIsDefault: true, description: "", imageUrl: "" },
      preview,
    );
    expect(result.title).toBe("Daniel Studio");
    expect(result.description).toBe("Nail artist");
    expect(result.imageUrl).toBe("https://cdn.example.com/avatar.jpg");
  });

  it("preserves an existing user title", () => {
    const result = computeCardEnrichment(
      { title: "Mi título personalizado", titleIsDefault: false, description: "", imageUrl: "" },
      preview,
    );
    expect(result.title).toBeUndefined();
  });

  it("preserves an existing user image", () => {
    const result = computeCardEnrichment(
      { title: "", titleIsDefault: true, description: "", imageUrl: "https://mine.com/a.png" },
      preview,
    );
    expect(result.imageUrl).toBeUndefined();
    expect(result.title).toBe("Daniel Studio");
  });

  it("preserves an existing user description", () => {
    const result = computeCardEnrichment(
      { title: "", titleIsDefault: true, description: "Ya escrito", imageUrl: "" },
      preview,
    );
    expect(result.description).toBeUndefined();
  });

  it("derives @handle title when no og:title", () => {
    const result = computeCardEnrichment(
      { title: "", titleIsDefault: true, description: "", imageUrl: "" },
      { url: "https://instagram.com/daniel", provider: "instagram", handle: "daniel", status: "fallback" },
    );
    expect(result.title).toBe("@daniel");
  });
});

/* ------------------------------------------------------------------ */
/* Security                                                           */
/* ------------------------------------------------------------------ */

describe("smart-link-preview security", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html;base64,abc",
    "file:///etc/passwd",
    "blob:https://example.com/id",
    "ftp://example.com",
    "vbscript:msgbox(1)",
  ])("rejects dangerous scheme %s", (url) => {
    expect(normalizePreviewUrl(url)).toBeNull();
  });

  it.each([
    "localhost",
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "metadata.google.internal",
    "100.100.200.200",
  ])("blocks private/loopback/metadata host %s", (host) => {
    expect(isBlockedPreviewHostname(host)).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isBlockedPreviewHostname("example.com")).toBe(false);
    expect(isBlockedPreviewHostname("www.instagram.com")).toBe(false);
  });

  it("rejects data/javascript image URLs", () => {
    const base = new URL("https://example.com/page");
    expect(resolveImageUrl("data:image/png;base64,abc", base)).toBeUndefined();
    expect(resolveImageUrl("javascript:alert(1)", base)).toBeUndefined();
  });

  it("resolves relative image URLs against the page", () => {
    const base = new URL("https://example.com/blog/post");
    expect(resolveImageUrl("/img/hero.jpg", base)).toBe("https://example.com/img/hero.jpg");
  });
});

/* ------------------------------------------------------------------ */
/* Metadata parsing + status                                          */
/* ------------------------------------------------------------------ */

describe("smart-link-preview metadata parsing", () => {
  it("extracts OpenGraph fields", () => {
    const html = `<html><head>
      <title>Fallback Title</title>
      <meta property="og:title" content="Real Title" />
      <meta property="og:description" content="A description" />
      <meta property="og:image" content="https://cdn.example.com/img.jpg" />
      <meta property="og:site_name" content="Example" />
    </head></html>`;
    const meta = parseMetadata(html, new URL("https://example.com/"));
    expect(meta.title).toBe("Real Title");
    expect(meta.description).toBe("A description");
    expect(meta.imageUrl).toBe("https://cdn.example.com/img.jpg");
    expect(meta.siteName).toBe("Example");
  });

  it("falls back to <title> when no og:title", () => {
    const meta = parseMetadata("<html><head><title>Just HTML</title></head></html>", new URL("https://x.example/"));
    expect(meta.title).toBe("Just HTML");
  });

  it("classifies status", () => {
    expect(deriveStatus({ title: "t", imageUrl: "https://x/i.jpg" })).toBe("full");
    expect(deriveStatus({ title: "t" })).toBe("partial");
    expect(deriveStatus({})).toBe("fallback");
  });
});

/* ------------------------------------------------------------------ */
/* Handle derivation                                                  */
/* ------------------------------------------------------------------ */

describe("smart-link-preview handle derivation", () => {
  it("parses an instagram handle and ignores reserved segments", () => {
    expect(parseHandleFromUrl(new URL("https://instagram.com/daniel"), "instagram")).toBe("daniel");
    expect(parseHandleFromUrl(new URL("https://instagram.com/reel/abc123"), "instagram")).toBeUndefined();
  });

  it("parses linkedin /in/ and /company/", () => {
    expect(parseHandleFromUrl(new URL("https://linkedin.com/in/jane-doe"), "linkedin")).toBe("jane-doe");
    expect(parseHandleFromUrl(new URL("https://linkedin.com/company/acme"), "linkedin")).toBe("acme");
  });

  it("parses youtube /@ handle but not a video id", () => {
    expect(parseHandleFromUrl(new URL("https://youtube.com/@creator"), "youtube")).toBe("creator");
    expect(parseHandleFromUrl(new URL("https://youtube.com/watch?v=abc123"), "youtube")).toBeUndefined();
  });
});

