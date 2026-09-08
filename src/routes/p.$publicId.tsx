import { createFileRoute, notFound } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/p/$publicId")({
  head: ({ loaderData }) => {
    if (!loaderData?.profile) return {};

    const { profile } = loaderData;
    const baseUrl = "https://www.cripqer.dev";
    const profileUrl = `${baseUrl}/p/${profile.public_id}`;
    const title = profile.display_name
      ? `${profile.display_name}${profile.bio ? ' - ' + profile.bio.slice(0, 50) : ''} | Cripqer`
      : `Perfil ${profile.public_id} | Cripqer`;
    const description = profile.bio?.slice(0, 155) ||
      `Visita la página personalizada de ${profile.display_name || 'este perfil'}. Enlaces, redes sociales y contacto en un solo lugar con Cripqer.`;
    const imageUrl = profile.avatar_url || `${baseUrl}/brand-assets/cripqer-icon-512.png`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: profileUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:site_name", content: "Cripqer" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
        { name: "robots", content: "index, follow" },
      ],
      links: [
        { rel: "canonical", href: profileUrl },
        ...(profile.slug ? [
          { rel: "alternate", href: `${baseUrl}/${profile.slug}` }
        ] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const supabase = getServerSupabaseClient();
    const profile = await profileService.getPublicProfileByPublicId(supabase, params.publicId);

    if (!profile) {
      throw notFound();
    }

    // Obtener los links para este perfil
    const links = await linkService.getProfileLinks(supabase, profile.id);

    return { profile, links: links.filter((l) => l.enabled) };
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { profile, links } = Route.useLoaderData();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!hasIncremented.current) {
      hasIncremented.current = true;
      const supabase = getBrowserSupabaseClient();
      profileService.incrementScanCount(supabase, profile.id).catch(console.error);
    }
  }, [profile.id]);

  // Structured data Person schema
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.display_name || profile.slug,
    "description": profile.bio || `Perfil de ${profile.display_name || profile.slug}`,
    "image": profile.avatar_url,
    "url": `https://www.cripqer.dev/p/${profile.public_id}`,
    "sameAs": links
      .filter(link => link.url && link.url.includes('instagram.com') || link.url?.includes('facebook.com') ||
                     link.url?.includes('twitter.com') || link.url?.includes('linkedin.com'))
      .map(link => link.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <PublicProfileView profile={profile} links={links} isPreview={false} />
    </>
  );
}
