import { createFileRoute, notFound } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/$alias")({
  head: ({ loaderData }) => {
    const profile = loaderData?.profile;
    if (!profile) return {};

    const baseUrl = "https://www.cripqer.dev";
    const canonicalUrl = `${baseUrl}/p/${profile.public_id}`;
    const title = profile.display_name
      ? `${profile.display_name}${profile.bio ? " - " + profile.bio.slice(0, 50) : ""} | Cripqer`
      : `Perfil ${profile.public_id} | Cripqer`;
    const description =
      profile.bio?.slice(0, 155) ||
      `Visita la página personalizada de ${profile.display_name || "este perfil"}. Enlaces, redes sociales y contacto en un solo lugar con Cripqer.`;
    const imageUrl = profile.avatar_url || `${baseUrl}/brand-assets/cripqer-icon-512.png`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:site_name", content: "Cripqer" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
    };
  },
  loader: async ({ params }) => {
    // Rutas reservadas
    const reservedRoutes = [
      "editor",
      "login",
      "auth",
      "api",
      "q",
      "qr",
      "account",
      "settings",
      "p",
      "terms",
      "privacy",
      "help",
      "support",
    ];
    const aliasLower = params.alias.toLowerCase();

    if (reservedRoutes.includes(aliasLower)) {
      throw notFound();
    }

    const supabase = getServerSupabaseClient();
    const profile = await profileService.getPublicProfileBySlug(supabase, aliasLower);

    if (!profile) {
      throw notFound();
    }

    const publication = profile.published_profile_config;
    const hasSnapshot =
      publication?.schemaVersion === 1 &&
      publication.profile &&
      Array.isArray(publication.links);
    if (!hasSnapshot && !profile.published_template_config) {
      throw notFound();
    }
    const publicProfile = hasSnapshot ? { ...profile, ...publication!.profile } : profile;
    const links = hasSnapshot
      ? publication!.links.filter((link) => link.enabled)
      : (await linkService.getProfileLinks(supabase, profile.id)).filter((l) => l.enabled);

    return { profile: publicProfile, links };
  },
  component: PublicProfilePageByAlias,
});

function PublicProfilePageByAlias() {
  const { profile, links } = Route.useLoaderData();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!hasIncremented.current) {
      hasIncremented.current = true;
      const supabase = getBrowserSupabaseClient();
      profileService.incrementScanCount(supabase, profile.id).catch(console.error);
    }
  }, [profile.id]);

  return <PublicProfileView profile={profile} links={links} isPreview={false} />;
}
