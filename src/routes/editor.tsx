import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Auth } from "../components/Auth";
import { DesignSection } from "../components/editor/DesignSection";
import { LinksSection } from "../components/editor/LinksSection";
import {
  MobileBottomNavbar,
  type BasicEditorSectionId,
} from "../components/editor/MobileBottomNavbar";
import { ProfileSection } from "../components/editor/ProfileSection";
import { ShareSection } from "../components/editor/ShareSection";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { Button } from "../components/ui/button";
import { generatePublicId, getInternalSlugFromPublicId } from "../lib/publicId";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getPublicProfileUrl } from "../lib/url";
import { isValidUrl, normalizeUrl } from "../lib/validation";
import { linkService } from "../services/link.service";
import { profileService } from "../services/profile.service";
import type { Profile, ProfileLink } from "../types/database";

export const Route = createFileRoute("/editor")({
  component: EditorPage,
});

const DEFAULT_PROFILE: Partial<Profile> = {
  display_name: "",
  slug: "",
  background_color: "#ffffff",
  button_color: "#111111",
  button_text_color: "#ffffff",
  font_family: "Inter",
  banner_fusion_strength: 60,
};

function getSafeFusionStrength(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function EditorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>(DEFAULT_PROFILE);
  const [links, setLinks] = useState<Partial<ProfileLink>[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedPublicId, setSavedPublicId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [activeSection, setActiveSection] = useState<BasicEditorSectionId>("profile");

  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          loadData(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session && loadedUserId.current !== session.user.id) {
        loadData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        loadedUserId.current = null;
      }
    });

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const loadData = async (userId: string) => {
    if (loadedUserId.current === userId) return;

    setLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      const currentProfile = await profileService.getProfileByUserId(supabase, userId);
      if (currentProfile) {
        setProfile({
          ...DEFAULT_PROFILE,
          ...currentProfile,
          banner_fusion_strength: getSafeFusionStrength(currentProfile.banner_fusion_strength),
        });
        if (currentProfile.published && currentProfile.public_id) {
          setSavedPublicId(currentProfile.public_id);
          setIsPublished(true);
        }
        const currentLinks = await linkService.getProfileLinks(supabase, currentProfile.id);
        setLinks(currentLinks);
      } else {
        setProfile(DEFAULT_PROFILE);
        setLinks([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar tu perfil.");
    } finally {
      loadedUserId.current = userId;
      setLoading(false);
    }
  };

  const validate = () => {
    if (!profile.display_name) return false;
    const enabledLinks = links.filter((link) => link.enabled && link.url && isValidUrl(link.url));
    return enabledLinks.length >= 3;
  };

  const handleSave = async (publish: boolean) => {
    if (!session) return;

    setSaving(true);
    try {
      const supabase = getBrowserSupabaseClient();
      let currentProfileId = profile.id;
      const publicId = profile.public_id || generatePublicId();
      const internalSlug = profile.slug || getInternalSlugFromPublicId(publicId);
      const profilePayload = {
        ...profile,
        banner_fusion_strength: getSafeFusionStrength(profile.banner_fusion_strength),
        slug: internalSlug,
        public_id: publicId,
        published: publish,
      };

      let finalProfile: Profile;
      if (!currentProfileId) {
        finalProfile = await profileService.createProfile(supabase, {
          ...profilePayload,
          user_id: session.user.id,
          display_name: profile.display_name || "Mi perfil",
        });
        currentProfileId = finalProfile.id;
      } else {
        const { public_id: _publicId, ...editableProfile } = profilePayload;
        finalProfile = await profileService.updateProfile(
          supabase,
          currentProfileId,
          editableProfile,
        );
      }

      const normalizedLinks = links.map((link, index) => ({
        ...link,
        sort_order: index,
        url: link.url ? normalizeUrl(link.url) : "",
      }));
      const existingLinks = await linkService.getProfileLinks(supabase, currentProfileId);
      const keptIds = normalizedLinks
        .filter((link) => !link.id?.startsWith("temp-"))
        .map((link) => link.id);

      for (const link of existingLinks.filter((existing) => !keptIds.includes(existing.id))) {
        await linkService.deleteProfileLink(supabase, link.id);
      }

      for (const link of normalizedLinks) {
        if (link.id?.startsWith("temp-")) {
          const { id: _id, ...newLink } = link;
          await linkService.createProfileLink(supabase, {
            ...newLink,
            profile_id: currentProfileId,
            platform: newLink.platform || "website",
            label: newLink.label || "Enlace",
            url: newLink.url || "",
          });
        } else if (link.id) {
          await linkService.updateProfileLink(supabase, link.id, link);
        }
      }

      const refreshedLinks = await linkService.getProfileLinks(supabase, currentProfileId);
      setProfile({
        ...DEFAULT_PROFILE,
        ...finalProfile,
        banner_fusion_strength: getSafeFusionStrength(finalProfile.banner_fusion_strength),
      });
      setLinks(refreshedLinks);

      if (publish) {
        setSavedPublicId(finalProfile.public_id);
        setIsPublished(true);
      }

      toast.success(publish ? "Página publicada correctamente" : "Borrador guardado");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar", {
        description:
          error instanceof Error ? error.message : "Revisa los datos e intenta nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;
  if (!session) return <Auth />;

  const publicId = profile.public_id || savedPublicId || "";
  const publicUrl = isPublished && publicId ? getPublicProfileUrl(publicId) : "";
  const isValid = validate();

  const updateProfile = (updates: Partial<Profile>) =>
    setProfile((current) => ({ ...current, ...updates }));

  const renderActiveSection = () => {
    switch (activeSection) {
      case "links":
        return (
          <div className="space-y-10">
            <LinksSection links={links} onChange={setLinks} userId={session.user.id} />
            <ShareSection
              publicId={publicId}
              published={isPublished}
              saving={saving}
              onSave={handleSave}
              isValid={isValid}
              profile={profile}
              onChange={updateProfile}
              basicOnly
              showSaveControls={false}
            />
          </div>
        );
      case "appearance":
        return (
          <DesignSection profile={profile} onChange={updateProfile} userId={session.user.id} />
        );
      case "profile":
      default:
        return (
          <ProfileSection profile={profile} onChange={updateProfile} userId={session.user.id} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <main className="h-auto space-y-10 overflow-y-auto p-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:p-6 sm:pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:p-10 md:pb-10 lg:h-screen">
          <div aria-live="polite">{renderActiveSection()}</div>

          <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Guardar y publicar</h2>
              <p className="text-sm text-muted-foreground">
                Guarda un borrador o publica los cambios en tu página.
              </p>
            </div>
            {!isValid && (
              <p className="text-sm text-destructive">
                Debes tener nombre y al menos 3 enlaces visibles válidos para publicar.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl"
                disabled={saving || !isValid}
                onClick={() => handleSave(false)}
              >
                {saving ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl"
                disabled={saving || !isValid}
                onClick={() => handleSave(true)}
              >
                {saving ? "Guardando..." : isPublished ? "Actualizar y publicar" : "Publicar ahora"}
              </Button>
            </div>
            {isPublished && publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver página publicada
              </a>
            )}
          </section>
        </main>

        <aside className="border-l bg-muted p-5 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:p-10 md:pb-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:justify-center">
          <div className="mx-auto h-[720px] w-full max-w-[360px] overflow-hidden rounded-[2.5rem] border-[8px] border-black/10 bg-white shadow-xl">
            <PublicProfileView profile={profile} links={links} isPreview />
          </div>
        </aside>
      </div>

      <MobileBottomNavbar activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  );
}
