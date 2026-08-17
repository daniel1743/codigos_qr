import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import type { Profile, ProfileLink } from "../types/database";
import { Auth } from "../components/Auth";
import { ProfileSection } from "../components/editor/ProfileSection";
import { DesignSection } from "../components/editor/DesignSection";
import { LinksSection } from "../components/editor/LinksSection";
import { ShareSection } from "../components/editor/ShareSection";
import { normalizeSlug } from "../lib/slug";
import { isValidUrl, normalizeUrl } from "../lib/validation";

import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/editor")({
  component: EditorPage,
});

function EditorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Partial<Profile>>({
    background_color: "#ffffff",
    button_color: "#111111",
    button_text_color: "#ffffff",
    font_family: "Inter",
  });

  const [links, setLinks] = useState<Partial<ProfileLink>[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean>(false);

  const supabase = getBrowserSupabaseClient();

  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        // Solo recargar si es un usuario distinto o un login nuevo real
        if (loadedUserId.current !== session.user.id) {
          loadData(session.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        loadedUserId.current = null;
      }
    });

    // Prevenir que el usuario cierre la pestaña por error perdiendo los datos no guardados
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (userId: string) => {
    // Si ya cargamos los datos de este usuario en esta sesión, no lo volvemos a hacer
    // para evitar sobrescribir los cambios no guardados cuando la ventana recupera el foco.
    if (loadedUserId.current === userId) return;

    setLoading(true);
    try {
      const p = await profileService.getProfileByUserId(supabase, userId);
      if (p) {
        setProfile(p);
        if (p.published && p.slug) {
          setSavedSlug(p.slug);
          setIsPublished(true);
        }
        const l = await linkService.getProfileLinks(supabase, p.id);
        setLinks(l);
      } else {
        // Prepare empty state
        setProfile({
          display_name: "",
          slug: "",
          background_color: "#ffffff",
          button_color: "#111111",
          button_text_color: "#ffffff",
          font_family: "Inter",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      loadedUserId.current = userId;
      setLoading(false);
    }
  };

  const validate = () => {
    if (!profile.display_name || !profile.slug) return false;
    try {
      normalizeSlug(profile.slug);
    } catch {
      return false;
    }
    const enabledLinks = links.filter((l) => l.enabled && l.url && isValidUrl(l.url));
    if (enabledLinks.length < 3) return false;
    return true;
  };

  const handleSave = async (publish: boolean) => {
    if (!session) return;
    setSaving(true);
    try {
      let currentProfileId = profile.id;
      const normalizedSlug = normalizeSlug(profile.slug || "");

      // 1. Guardar Perfil
      let finalProfile;
      if (!currentProfileId) {
        finalProfile = await profileService.createProfile(supabase, {
          ...profile,
          user_id: session.user.id,
          slug: normalizedSlug,
          display_name: profile.display_name!,
          published: publish,
        });
        currentProfileId = finalProfile.id;
      } else {
        finalProfile = await profileService.updateProfile(supabase, currentProfileId, {
          ...profile,
          slug: normalizedSlug,
          published: publish,
        });
      }
      setProfile(finalProfile);

      if (publish) {
        setSavedSlug(finalProfile.slug);
        setIsPublished(true);
      }

      // 2. Normalizar URLs
      const linksToSave = links.map((l) => ({
        ...l,
        url: l.url ? normalizeUrl(l.url) : "",
      }));

      // 3. Sync Links
      const existing = await linkService.getProfileLinks(supabase, currentProfileId);
      const toKeep = linksToSave.filter((l) => !l.id?.startsWith("temp-")).map((l) => l.id);

      // Borrar los que ya no están
      const toDelete = existing.filter((e) => !toKeep.includes(e.id));
      for (const del of toDelete) {
        await linkService.deleteProfileLink(supabase, del.id);
      }

      // Crear o actualizar
      for (const link of linksToSave) {
        if (link.id?.startsWith("temp-")) {
          const { id, ...rest } = link;
          await linkService.createProfileLink(supabase, {
            ...rest,
            profile_id: currentProfileId,
            platform: rest.platform || "website",
            label: rest.label || "Enlace",
            url: rest.url || "",
          });
        } else if (link.id) {
          await linkService.updateProfileLink(supabase, link.id, link);
        }
      }

      // Refetch para tener IDs reales
      const refreshedLinks = await linkService.getProfileLinks(supabase, currentProfileId);
      setLinks(refreshedLinks);

      alert(publish ? "¡Página publicada con éxito!" : "Borrador guardado.");
    } catch (e) {
      if (e instanceof Error) {
        alert("Error al guardar: " + e.message);
      } else {
        alert("Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Lado Editor */}
        <div className="p-6 md:p-12 space-y-12 h-screen overflow-y-auto">
          <ProfileSection
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
            userId={session.user.id}
          />
          <DesignSection profile={profile} onChange={(u) => setProfile((p) => ({ ...p, ...u }))} />
          <LinksSection links={links} onChange={setLinks} />
          <ShareSection
            slug={savedSlug || ""}
            published={isPublished}
            saving={saving}
            onSave={handleSave}
            isValid={validate()}
          />
        </div>

        {/* Lado Preview */}
        <div className="bg-muted p-6 md:p-12 flex items-center justify-center border-l lg:sticky top-0 h-screen">
          <div className="w-[375px] h-[750px] bg-white rounded-[3rem] shadow-xl overflow-hidden border-[8px] border-black/10 relative">
            {/* Live Preview Render */}
            <div
              className="w-full h-full p-6 flex flex-col items-center overflow-y-auto"
              style={{
                backgroundColor: profile.background_color || "#fff",
                fontFamily: profile.font_family || "Inter",
              }}
            >
              <div className="mt-8 mb-6">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-black/5" />
                )}
              </div>
              <h1 className="text-xl font-bold text-center mb-2">
                {profile.display_name || "Tu Nombre"}
              </h1>
              {profile.bio && (
                <p className="text-center text-sm opacity-80 mb-8 max-w-[280px] leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="w-full space-y-3 flex-1">
                {links
                  .filter((l) => l.enabled)
                  .map((link, i) => (
                    <button
                      key={link.id || i}
                      className="w-full p-4 rounded-xl font-medium shadow-sm transition-transform active:scale-95"
                      style={{
                        backgroundColor: profile.button_color || "#111",
                        color: profile.button_text_color || "#fff",
                      }}
                    >
                      {link.label || "Enlace"}
                    </button>
                  ))}
              </div>

              <div className="mt-8 opacity-50 text-xs">Generador de QR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
