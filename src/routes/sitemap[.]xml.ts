import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseClient } from "../lib/supabase/server";

const BASE_URL = "https://www.cripqer.dev";

type SitemapProfile = {
  public_id: string | null;
  slug: string | null;
  updated_at: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDateOnly(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().split("T")[0]!;
}

function sitemapUrl(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export function buildSitemapXml(profiles: SitemapProfile[] = [], now = new Date()): string {
  const today = now.toISOString().split("T")[0]!;
  const urls = [
    sitemapUrl(`${BASE_URL}/`, today, "weekly", "1.0"),
    sitemapUrl(`${BASE_URL}/plataforma`, today, "weekly", "0.9"),
    sitemapUrl(`${BASE_URL}/vs/linktree`, today, "monthly", "0.8"),
  ];

  for (const profile of profiles) {
    const lastmod = toDateOnly(profile.updated_at, today);

    if (profile.public_id) {
      urls.push(
        sitemapUrl(
          `${BASE_URL}/p/${encodeURIComponent(profile.public_id)}`,
          lastmod,
          "daily",
          "0.6",
        ),
      );
    }

    if (profile.slug) {
      urls.push(
        sitemapUrl(`${BASE_URL}/${encodeURIComponent(profile.slug)}`, lastmod, "daily", "0.6"),
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = getServerSupabaseClient();

        // Obtener perfiles públicos publicados
        const { data: profiles } = await supabase
          .from("profiles")
          .select("public_id, slug, updated_at")
          .eq("published", true)
          .order("updated_at", { ascending: false })
          .limit(5000);

        const xml = buildSitemapXml((profiles ?? []) as SitemapProfile[]);

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
