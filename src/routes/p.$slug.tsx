import { createFileRoute, notFound } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const supabase = getServerSupabaseClient();
    const profile = await profileService.getPublicProfileBySlug(supabase, params.slug);

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

  return (
    <div
      className="min-h-screen flex flex-col items-center p-4 selection:bg-black/10 transition-colors"
      style={{
        backgroundColor: profile.background_color || "#ffffff",
        fontFamily: profile.font_family || "Inter, sans-serif",
      }}
    >
      <div className="w-full max-w-[480px] flex-1 flex flex-col items-center pt-12 pb-16">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-24 h-24 rounded-full object-cover shadow-sm mb-6"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-black/5 mb-6" />
        )}

        {/* Nombre y Bio */}
        <h1
          className="text-2xl font-bold text-center mb-3"
          style={{ color: "#111" }} // Forzamos buen contraste o podríamos agregar color de texto general luego
        >
          {profile.display_name}
        </h1>

        {profile.bio && (
          <p className="text-center text-base opacity-80 mb-10 max-w-[320px] leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Enlaces */}
        <div className="w-full space-y-4 flex-1">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-4 rounded-xl font-medium text-center shadow-sm transition-transform active:scale-95 hover:opacity-95"
              style={{
                backgroundColor: profile.button_color || "#111111",
                color: profile.button_text_color || "#ffffff",
                minHeight: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {link.label || "Visitar enlace"}
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center opacity-40 text-sm">
          <p>Gracias por visitarnos</p>
        </div>
      </div>
    </div>
  );
}
