import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseClient } from "../lib/supabase/server";

const BASE_URL = "https://www.cripqer.dev";

type SitemapEntry = {
  loc: string;
  lastmod: string | null;
  changefreq: string;
  priority: string;
};

type SitemapProfile = {
  public_id: string | null;
  updated_at: string | null;
};

type SitemapPage = {
  public_id: string | null;
  updated_at: string | null;
  published_at: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalizes a timestamp to a `YYYY-MM-DD` lastmod. A missing or invalid date
 * returns `null` so the `<lastmod>` tag is omitted entirely — a missing
 * timestamp is never faked to "today".
 */
function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0]!;
}

function sitemapUrl(entry: SitemapEntry): string {
  const lines = ["  <url>", `    <loc>${escapeXml(entry.loc)}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  lines.push(`    <priority>${entry.priority}</priority>`);
  lines.push("  </url>");
  return lines.join("\n");
}

/**
 * Builds a canonical-only sitemap.
 *
 * Only canonical, indexable URLs are listed:
 *   - the three static marketing pages,
 *   - published public profiles at `/p/{public_id}`,
 *   - published public pages at `/pg/{public_id}`.
 *
 * Aliases are intentionally EXCLUDED. `/{profile_alias}` canonicalizes to
 * `/p/{public_id}` and `/pg/a/{slug}` canonicalizes to `/pg/{public_id}`, so
 * submitting them would create "Duplicate, submitted URL not selected as
 * canonical" reports. Private/utility routes are never listed.
 */
export function buildSitemapXml(
  profiles: SitemapProfile[] = [],
  pages: SitemapPage[] = [],
): string {
  const entries: SitemapEntry[] = [
    { loc: `${BASE_URL}/`, lastmod: null, changefreq: "weekly", priority: "1.0" },
    { loc: `${BASE_URL}/plataforma`, lastmod: null, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/vs/linktree`, lastmod: null, changefreq: "monthly", priority: "0.8" },
  ];

  for (const profile of profiles) {
    if (!profile.public_id) continue;
    entries.push({
      loc: `${BASE_URL}/p/${encodeURIComponent(profile.public_id)}`,
      lastmod: toDateOnly(profile.updated_at),
      changefreq: "daily",
      priority: "0.6",
    });
  }

  for (const page of pages) {
    if (!page.public_id) continue;
    entries.push({
      loc: `${BASE_URL}/pg/${encodeURIComponent(page.public_id)}`,
      lastmod: toDateOnly(page.updated_at ?? page.published_at),
      changefreq: "daily",
      priority: "0.6",
    });
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(sitemapUrl),
    "</urlset>",
    "",
  ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = getServerSupabaseClient();

        // Published public profiles (root identity / BioLink).
        const { data: profiles } = await supabase
          .from("profiles")
          .select("public_id, updated_at")
          .eq("published", true)
          .order("updated_at", { ascending: false })
          .limit(5000);

        // Published public child pages.
        const { data: pages } = await supabase
          .from("pages")
          .select("public_id, updated_at, published_at")
          .eq("published", true)
          .order("updated_at", { ascending: false })
          .limit(5000);

        const xml = buildSitemapXml(
          (profiles ?? []) as SitemapProfile[],
          (pages ?? []) as SitemapPage[],
        );

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
