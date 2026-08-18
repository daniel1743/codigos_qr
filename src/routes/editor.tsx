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
import { TextSection } from "../components/editor/TextSection";
import { ElementsSection } from "../components/editor/ElementsSection";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { toast } from "sonner";
import { generatePublicId, getInternalSlugFromPublicId } from "../lib/publicId";
import { isValidUrl, normalizeUrl } from "../lib/validation";
import { UserCircle, Link as LinkIcon, Palette, Type, Shapes, QrCode, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";

import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/editor")({
  component: EditorPage,
});

type TabId = "profile" | "links" | "design" | "text" | "elements" | "qr" | "preview";

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
  const [savedPublicId, setSavedPublicId] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [panelOpen, setPanelOpen] = useState<boolean>(true);

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
        if (loadedUserId.current !== session.user.id) {
          loadData(session.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        loadedUserId.current = null;
      }
    });

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
    if (loadedUserId.current === userId) return;

    setLoading(true);
    try {
      const p = await profileService.getProfileByUserId(supabase, userId);
      if (p) {
        setProfile(p);
        if (p.published && p.public_id) {
          setSavedPublicId(p.public_id);
          setIsPublished(true);
        }
        const l = await linkService.getProfileLinks(supabase, p.id);
        setLinks(l);
      } else {
        setProfile({
          display_name: "",
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
    if (!profile.display_name) return false;
    const enabledLinks = links.filter((l) => l.enabled && l.url && isValidUrl(l.url));
    if (enabledLinks.length < 3) return false;
    return true;
  };

  const handleSave = async (publish: boolean) => {
    if (!session) return;
    setSaving(true);
    try {
      let currentProfileId = profile.id;
      const publicId = profile.public_id || generatePublicId();
      const internalSlug = profile.slug || getInternalSlugFromPublicId(publicId);

      let finalProfile;
      if (!currentProfileId) {
        finalProfile = await profileService.createProfile(supabase, {
          ...profile,
          user_id: session.user.id,
          slug: internalSlug,
          public_id: publicId,
          display_name: profile.display_name!,
          published: publish,
        });
        currentProfileId = finalProfile.id;
      } else {
        const { public_id: _publicId, slug: _slug, ...editableProfile } = profile;
        const identityBackfill = profile.public_id
          ? {}
          : {
              public_id: publicId,
              slug: internalSlug,
            };
        finalProfile = await profileService.updateProfile(supabase, currentProfileId, {
          ...editableProfile,
          ...identityBackfill,
          published: publish,
        });
      }
      setProfile(finalProfile);

      if (publish) {
        setSavedPublicId(finalProfile.public_id);
        setIsPublished(true);
      }

      const linksToSave = links.map((l) => ({
        ...l,
        url: l.url ? normalizeUrl(l.url) : "",
      }));

      const existing = await linkService.getProfileLinks(supabase, currentProfileId);
      const toKeep = linksToSave.filter((l) => !l.id?.startsWith("temp-")).map((l) => l.id);

      const toDelete = existing.filter((e) => !toKeep.includes(e.id));
      for (const del of toDelete) {
        await linkService.deleteProfileLink(supabase, del.id);
      }

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

      const refreshedLinks = await linkService.getProfileLinks(supabase, currentProfileId);
      setLinks(refreshedLinks);

      if (publish) {
        toast.success("¡Página publicada con éxito!");
      } else {
        toast.success("Borrador guardado");
      }
    } catch (e) {
      console.error("Error completo al guardar:", e);
      if (e instanceof Error) {
        toast.error("Error al guardar", { description: e.message });
      } else {
        toast.error("Error al guardar", { description: "Revisa la consola (F12) para más detalles." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;
  if (!session) return <Auth />;

  const TABS = [
    { id: "profile", label: "Perfil", icon: UserCircle },
    { id: "links", label: "Enlaces", icon: LinkIcon },
    { id: "design", label: "Diseño", icon: Palette },
    { id: "text", label: "Texto", icon: Type },
    { id: "elements", label: "Elementos", icon: Shapes },
    { id: "qr", label: "Publicar", icon: QrCode },
  ] as const;

  const renderActiveSection = () => {
    switch (activeTab) {
      case "profile":
        return (
          <ProfileSection
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
            userId={session.user.id}
          />
        );
      case "links":
        return <LinksSection links={links} onChange={setLinks} />;
      case "design":
        return <DesignSection profile={profile} onChange={(u) => setProfile((p) => ({ ...p, ...u }))} />;
      case "text":
        return <TextSection profile={profile} onChange={(u) => setProfile((p) => ({ ...p, ...u }))} />;
      case "elements":
        return <ElementsSection />;
      case "qr":
        return (
          <ShareSection
            publicId={savedPublicId || ""}
            published={isPublished}
            saving={saving}
            onSave={handleSave}
            isValid={validate()}
          />
        );
      default:
        return null;
    }
  };

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setPanelOpen(true);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background font-sans md:flex-row">
      
      {/* SIDEBAR DESKTOP */}
      <nav className="hidden md:flex flex-col items-center w-[88px] border-r bg-card py-6 z-20 shrink-0">
        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold mb-8 shadow-sm">
          QR
        </div>
        
        <div className="flex flex-col gap-4 w-full px-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && panelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TabId)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-6 h-6 mb-1.5 transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto px-3 w-full">
           <button 
             onClick={() => supabase.auth.signOut()} 
             className="flex flex-col items-center justify-center p-3 w-full rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
           >
             <X className="w-5 h-5 mb-1" />
             <span className="text-[10px] font-medium">Salir</span>
           </button>
        </div>
      </nav>

      {/* PANEL CONTEXTUAL DESKTOP */}
      <div 
        className={`hidden md:flex flex-col border-r bg-background shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          panelOpen ? "w-[360px] opacity-100" : "w-0 opacity-0 border-r-0"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b bg-card/50 backdrop-blur-sm shrink-0">
           <h1 className="font-semibold">{TABS.find(t => t.id === activeTab)?.label}</h1>
           <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={() => setPanelOpen(false)}>
             <X className="w-4 h-4" />
           </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
           {renderActiveSection()}
        </div>
      </div>

      {/* GLOBAL PUBLISH BUTTON DESKTOP (Shortcut) */}
      <div className="hidden md:flex absolute top-4 right-4 z-30 gap-2">
         {isPublished && (
           <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm">
             <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Publicado
           </div>
         )}
         <Button 
            onClick={() => handleSave(true)} 
            disabled={saving || !validate()}
            className="shadow-sm rounded-full px-5"
          >
            {saving ? "Guardando..." : "Publicar Cambios"}
         </Button>
      </div>

      {/* PREVIEW CONTAINER */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 p-0 md:h-full md:p-8">
         {/* Toggle button to reopen panel if closed */}
         {!panelOpen && (
           <Button 
             variant="secondary" 
             size="icon" 
             className="hidden md:flex absolute left-4 top-4 shadow-md rounded-full z-10" 
             onClick={() => setPanelOpen(true)}
           >
             <ChevronDown className="w-5 h-5 rotate-90" />
           </Button>
         )}

         {/* Phone Frame */}
         <div className="relative h-full w-full transform-gpu overflow-hidden border-0 border-black/10 bg-background transition-all duration-300 md:h-[750px] md:max-h-[90vh] md:w-[375px] md:rounded-[3rem] md:border-[8px] md:shadow-2xl">
           <PublicProfileView profile={profile} links={links} isPreview={true} />
         </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="z-30 flex shrink-0 items-center gap-1 overflow-x-auto border-t bg-card px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && panelOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as TabId)}
              className={`flex min-h-14 min-w-[52px] flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "fill-primary/10" : ""}`} />
              <span className="max-w-full truncate text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE BOTTOM SHEET (Panel Overlay) */}
      <div 
        className={`md:hidden absolute inset-0 z-20 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${
          panelOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Backdrop */}
        <div 
           className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300 ${panelOpen ? "opacity-100" : "opacity-0"}`} 
           onClick={() => setPanelOpen(false)} 
        />
        
        {/* Sheet Content */}
        <div 
          className={`pointer-events-auto flex h-auto max-h-[88dvh] min-h-[52dvh] w-full flex-col rounded-t-[1.5rem] bg-background shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            panelOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Drag Handle & Header */}
          <div className="flex shrink-0 flex-col items-center rounded-t-[1.5rem] border-b bg-background pb-3 pt-3">
             <div className="w-12 h-1.5 bg-muted rounded-full mb-4" />
             <div className="flex w-full items-center justify-between px-4">
                <h2 className="text-base font-semibold tracking-tight">{TABS.find(t => t.id === activeTab)?.label}</h2>
                <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground rounded-full" onClick={() => setPanelOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
             </div>
          </div>
          
          <div className="mb-16 flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] scrollbar-thin sm:p-6">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
