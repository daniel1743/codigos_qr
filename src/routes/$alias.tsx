import { createFileRoute, notFound } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/$alias")({
  loader: async ({ params }) => {
    // Rutas reservadas
    const reservedRoutes = [
      "editor",
      "login",
      "auth",
      "api",
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

    const links = await linkService.getProfileLinks(supabase, profile.id);

    return { profile, links: links.filter((l) => l.enabled) };
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
