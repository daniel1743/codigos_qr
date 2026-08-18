import { createFileRoute, notFound } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { PublicProfileView } from "../components/profile/PublicProfileView";

export const Route = createFileRoute("/p/$publicId")({
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

  return <PublicProfileView profile={profile} links={links} isPreview={false} />;
}
