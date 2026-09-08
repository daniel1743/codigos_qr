import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseClient } from "../lib/supabase/server";

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

        const baseUrl = "https://www.cripqer.dev";
        const now = new Date().toISOString().split("T")[0];

        // Construir XML del sitemap
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Páginas estáticas principales -->
  <url>
    <loc>${baseUrl}/plataforma</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/vs/linktree</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/casos-de-uso</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

${
  profiles
    ?.map((profile) => {
      const lastmod = profile.updated_at
        ? new Date(profile.updated_at).toISOString().split("T")[0]
        : now;

      const urls = [];

      // URL por public_id (/p/$publicId)
      urls.push(`  <url>
    <loc>${baseUrl}/p/${profile.public_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`);

      // URL por slug si existe (/$alias)
      if (profile.slug) {
        urls.push(`  <url>
    <loc>${baseUrl}/${profile.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`);
      }

      return urls.join("\n");
    })
    .join("\n") || ""
}

</urlset>`;

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
