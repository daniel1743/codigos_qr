import { Link, createFileRoute } from "@tanstack/react-router";
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
import { isUserAdmin, isAdminEmail } from "../lib/admin-check";
import {
  UserCircle,
  UserRound,
  Link as LinkIcon,
  Palette,
  Type,
  Shapes,
  QrCode,
  X,
  ChevronDown,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Shield,
  Maximize,
} from "lucide-react";
import { Button } from "../components/ui/button";

import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/editor")({
  component: EditorPage,
});

type TabId = "profile" | "links" | "design" | "text" | "elements" | "qr" | "preview";

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25];

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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = getBrowserSupabaseClient();
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleZoomIn = () => {
    const nextStep = ZOOM_STEPS.find((step) => step > zoomLevel + 0.01);
    if (nextStep !== undefined) {
      setZoomLevel(nextStep);
    }
  };

  const handleZoomOut = () => {
    const prevStep = [...ZOOM_STEPS].reverse().find((step) => step < zoomLevel - 0.01);
    if (prevStep !== undefined) {
      setZoomLevel(prevStep);
    }
  };

  const handleFit = () => {
    const mainContainer = document.getElementById("preview-main-container");
    if (!mainContainer) return;
    const availableHeight = mainContainer.clientHeight - 64; // padding
    const availableWidth = mainContainer.clientWidth - 64;

    const phoneH = 750;
    const phoneW = 375;

    const scaleH = availableHeight / phoneH;
    const scaleW = availableWidth / phoneW;
    let bestScale = Math.min(scaleH, scaleW);

    if (bestScale > 1.0) bestScale = 1.0;
    if (bestScale < 0.3) bestScale = 0.3; // Allow smaller fit on very small screens

    setZoomLevel(bestScale);
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session);
        if (session) {
          loadData(session.user.id);
        } else {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
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

    const handleResize = () => {
      // Opcionalmente reajustar o limpiar algo
    };
    window.addEventListener("resize", handleResize);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofit on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        handleFit();
      }, 100);
    }
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

      // Verificar si es admin
      const adminStatus = await isUserAdmin(supabase, userId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAdmin(adminStatus || isAdminEmail(user?.email || ""));
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

      // CRÍTICO: Proteger publicId - nunca cambiar si ya existe
      const publicId = profile.public_id || generatePublicId();
      const internalSlug = profile.slug || getInternalSlugFromPublicId(publicId);

      let finalProfile;
      if (!currentProfileId) {
        // Primera vez: crear con publicId
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
        // Ya existe: NUNCA tocar public_id
        const { public_id: _publicId, ...editableProfile } = profile;

        // Solo agregar publicId si NO existe (migración legacy)
        const identityBackfill = profile.public_id
          ? {}
          : {
              public_id: publicId,
              slug: internalSlug,
            };

        // Validar alias (slug) reservado al guardar
        if (editableProfile.slug) {
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
          if (reservedRoutes.includes(editableProfile.slug)) {
            toast.error("Nombre reservado", { description: "Este enlace no está disponible." });
            setSaving(false);
            return;
          }
        }

        finalProfile = await profileService.updateProfile(supabase, currentProfileId, {
          ...editableProfile,
          ...identityBackfill,
          published: publish,
        });
      }

      setProfile((prev) => ({ ...prev, ...finalProfile }));
      toast.success(publish ? "Página publicada correctamente" : "Cambios guardados en borrador");

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
    } catch (e: unknown) {
      console.error("Error completo al guardar:", e);
      const isUniqueViolation =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "23505";

      if (isUniqueViolation) {
        toast.error("Enlace no disponible", {
          description: "Ese nombre ya está en uso por otra persona.",
        });
      } else if (e instanceof Error) {
        toast.error("Error al guardar", { description: e.message });
      } else {
        toast.error("Error al guardar", {
          description: "Revisa la consola (F12) para más detalles.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;
  if (!session) return <Auth />;

  const TABS = [
    { id: "profile", label: "Datos", icon: UserCircle },
    { id: "links", label: "Enlaces", icon: LinkIcon },
    { id: "design", label: "Diseño", icon: Palette },
    { id: "text", label: "Texto", icon: Type },
    { id: "elements", label: "Elementos", icon: Shapes },
    { id: "qr", label: "QR", icon: QrCode },
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
        return (
          <DesignSection
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
            userId={session.user.id}
            links={links}
          />
        );
      case "text":
        return (
          <TextSection profile={profile} onChange={(u) => setProfile((p) => ({ ...p, ...u }))} />
        );
      case "elements":
        return (
          <ElementsSection
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          />
        );
      case "qr":
        return (
          <ShareSection
            publicId={savedPublicId || ""}
            published={isPublished}
            saving={saving}
            onSave={handleSave}
            isValid={validate()}
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
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

  const handleProfilePreviewChange = (updates: Partial<Profile>) => {
    setProfile((current) => ({ ...current, ...updates }));
  };

  const handleLinkPreviewChange = (linkId: string, updates: Partial<ProfileLink>) => {
    setLinks((current) =>
      current.map((link) => (link.id === linkId ? { ...link, ...updates } : link)),
    );
  };

  const handleOpenPreviewSidebar = (tabId: string) => {
    const nextTab = TABS.some((tab) => tab.id === tabId) ? (tabId as TabId) : "profile";
    setActiveTab(nextTab);
    setPanelOpen(true);
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans md:flex-row">
      {/* SIDEBAR DESKTOP */}
      <nav className="hidden md:flex flex-col items-center w-[88px] border-r bg-card py-6 z-20 shrink-0">
        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold mb-8 shadow-sm shrink-0">
          QR
        </div>

        <div className="flex flex-col gap-4 w-full px-3 flex-1 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Link
            to="/profile"
            title="Mi perfil principal"
            className="flex flex-col items-center justify-center p-3 w-full shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <UserRound className="w-5 h-5 mb-1" />
            <span className="text-center text-[10px] font-medium leading-tight">
              Mi perfil principal
            </span>
          </Link>

          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && panelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TabId)}
                title={tab.label}
                className={`flex flex-col items-center justify-center p-3 rounded-xl shrink-0 transition-all duration-200 group ${
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

        <div className="mt-auto px-3 w-full space-y-2">
          {/* Botón Panel Admin - solo visible para admins */}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex flex-col items-center justify-center p-3 w-full rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 text-amber-600 hover:from-amber-500/20 hover:to-yellow-500/20 transition-all duration-200 border border-amber-200/50"
            >
              <Shield className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Panel Admin</span>
            </Link>
          )}

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
          <h1 className="font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2 text-muted-foreground"
            onClick={() => setPanelOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">{renderActiveSection()}</div>
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
      <main
        id="preview-main-container"
        className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-muted/30 p-0 md:h-full md:p-8"
      >
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

        {/* Zoom Controls */}
        <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border bg-background/95 p-1.5 shadow-sm backdrop-blur-md md:top-1/2 md:-translate-y-1/2 md:flex-col">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 1.25}
            className="h-11 w-11 rounded-full md:h-8 md:w-8"
            aria-label="Acercar"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span
            className="min-w-10 py-1 text-center text-[10px] font-medium md:w-full"
            aria-label="Nivel de zoom actual"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="h-11 w-11 rounded-full md:h-8 md:w-8"
            aria-label="Alejar"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="h-4 w-[1px] bg-border md:my-1 md:h-[1px] md:w-4" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFit}
            className="h-11 w-11 rounded-full hover:bg-muted md:h-8 md:w-8"
            aria-label="Ajustar a pantalla"
            title="Ajustar"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>

        {/* Scalable Container */}
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Phone Frame */}
          <div
            className="relative h-[750px] w-[375px] shrink-0 transform-gpu overflow-hidden rounded-[3rem] border-[8px] border-black/10 bg-background shadow-2xl transition-transform duration-300"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            <PublicProfileView
              profile={profile}
              links={links}
              isPreview={true}
              onProfileChange={handleProfilePreviewChange}
              onLinkChange={handleLinkPreviewChange}
              onOpenSidebar={handleOpenPreviewSidebar}
            />
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="z-30 flex shrink-0 items-center gap-1 overflow-x-auto border-t bg-card px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:hidden">
        <Link
          to="/profile"
          title="Mi perfil principal"
          className="flex min-h-14 min-w-[52px] flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-2 transition-colors text-muted-foreground hover:text-primary"
        >
          <UserRound className="w-5 h-5 mb-1" />
          <span className="max-w-full truncate text-[10px] font-medium">Mi perfil</span>
        </Link>

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
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
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
              <h2 className="text-base font-semibold tracking-tight">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 text-muted-foreground rounded-full"
                onClick={() => setPanelOpen(false)}
              >
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
