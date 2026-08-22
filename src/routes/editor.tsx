import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import type { Profile, ProfileLink } from "../types/database";
import { Auth } from "../components/Auth";
import { ContextualPropertiesPanel } from "../components/editor/ContextualPropertiesPanel";
import { FloatingContextToolbar } from "../components/editor/FloatingContextToolbar";
import { DirectBottomSheet } from "../components/editor/DirectBottomSheet";
import { DraggableBottomSheet } from "../components/editor/DraggableBottomSheet";
import { UndoRedoFAB, useHistory } from "../components/editor/UndoRedoFAB";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { QRCodeAdvanced } from "../components/qr/QRCodeAdvanced";
import { QRFrameShell } from "../components/qr/QRFrameShell";
import { toast } from "sonner";
import { generatePublicId, getInternalSlugFromPublicId } from "../lib/publicId";
import { getPublicProfileUrl } from "../lib/url";
import { isValidUrl, normalizeUrl } from "../lib/validation";
import { isUserAdmin, isAdminEmail } from "../lib/admin-check";
import { useTouchGesture, parseEditorTarget } from "../hooks/useTouchGesture";
import { usePinchZoomDirect } from "../hooks/usePinchZoomDirect";
import {
  UserCircle,
  UserRound,
  Link as LinkIcon,
  Palette,
  QrCode,
  X,
  ChevronDown,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Shield,
  Maximize,
  Lock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import type { CornerDotType, CornerSquareType, DotsType, QREffectType } from "../types/qr-advanced";

import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/editor")({
  component: EditorPage,
});

type TabId = "profile" | "links" | "appearance" | "qr";

// Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
export type EditorTarget =
  | {
      type:
        | "profile.photo"
        | "profile.name"
        | "profile.bio"
        | "profile.alias"
        | "profile.cover"
        | "profile.footer";
    }
  | { type: "links.manage" }
  | { type: "link"; linkId: string }
  | {
      type:
        | "appearance.templates"
        | "appearance.typography"
        | "appearance.colors"
        | "appearance.buttons"
        | "appearance.spacing"
        | "appearance.decoration";
    }
  | { type: "social_cover" | "hero_social" }
  | { type: "qr" };

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25];

// Modified by Codex — QR-STUDIO-11C
function EditorQRPreview({
  profile,
  publicId,
  onDone,
}: {
  profile: Partial<Profile>;
  publicId: string;
  onDone: () => void;
}) {
  const fgColor = profile.qr_foreground_color || "#000000";
  const bgColor = profile.qr_background_color || "#FFFFFF";
  const cornerTopLeftColor =
    profile.qr_corner_top_left_color || profile.qr_corners_square_color || fgColor;
  const cornerTopRightColor =
    profile.qr_corner_top_right_color || profile.qr_corners_square_color || fgColor;
  const cornerBottomLeftColor =
    profile.qr_corner_bottom_left_color || profile.qr_corners_square_color || fgColor;
  const qrUrl = publicId ? getPublicProfileUrl(publicId) : "https://preview.local/qr";
  const logoEnabled = profile.qr_logo_enabled ?? false;

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex w-full max-w-[540px] flex-col items-center gap-5 rounded-3xl border bg-background/95 p-6 shadow-2xl">
        <div className="flex w-full items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Vista QR</h2>
            <p className="text-sm text-muted-foreground">Cambios visuales en vivo</p>
          </div>
          <Button className="rounded-full px-5" onClick={onDone}>
            Listo
          </Button>
        </div>

        <QRFrameShell
          frameStyle={profile.qr_frame_style || "plain"}
          className="w-full max-w-[420px]"
        >
          <QRCodeAdvanced
            key={`editor-qr-${qrUrl}-${JSON.stringify(profile.qr_gradient)}-${fgColor}-${bgColor}-${profile.qr_frame_style}-${logoEnabled}-${profile.qr_effect}`}
            options={{
              data: qrUrl,
              width: 360,
              height: 360,
              margin: 4,
              dotsColor: profile.qr_gradient || fgColor,
              backgroundColor: bgColor,
              dotsType: (profile.qr_dots_type || "square") as DotsType,
              cornersSquareType: (profile.qr_corners_square_type ||
                "extra-rounded") as CornerSquareType,
              cornersDotType: (profile.qr_corners_dot_type || "dot") as CornerDotType,
              cornersSquareColor: profile.qr_corners_square_color || fgColor,
              cornersDotColor: profile.qr_corners_dot_color || fgColor,
              cornerSquareColors: {
                topLeft: cornerTopLeftColor,
                topRight: cornerTopRightColor,
                bottomLeft: cornerBottomLeftColor,
              },
              frameStyle: profile.qr_frame_style || "plain",
              effect: (profile.qr_effect || "none") as QREffectType,
              ...(logoEnabled && profile.qr_logo_url ? { image: profile.qr_logo_url } : {}),
              ...(logoEnabled && profile.qr_logo_url
                ? {
                    imageOptions: {
                      hideBackgroundDots: true,
                      imageSize: 0.28,
                      margin: 4,
                      crossOrigin: "anonymous",
                    },
                  }
                : {}),
              qrOptions: { errorCorrectionLevel: "H" },
            }}
            className="flex h-full w-full items-center justify-center [&_canvas]:h-full [&_canvas]:w-full"
          />
        </QRFrameShell>
      </div>
    </div>
  );
}

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
  // Modified by Codex — MOBILE-NATIVE-UX-RESPONSIVE-11
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState<boolean>(false);
  // Modified by Codex — MOBILE-TOUCH-SELECTION-SHEET-12
  const [selectedMobileTarget, setSelectedMobileTarget] = useState<string | null>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState<boolean>(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState<boolean>(false);
  const [bottomSheetContent, setBottomSheetContent] = useState<string>("general");
  // Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
  const [selectedEditorTarget, setSelectedEditorTarget] = useState<EditorTarget>({
    type: "profile.photo",
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pinchTransformOrigin, setPinchTransformOrigin] = useState("center center");
  const [isDesktop, setIsDesktop] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = getBrowserSupabaseClient();
  const loadedUserId = useRef<string | null>(null);

  // Modified by Codex — PREMIUM-MOBILE-UX-ZERO-FRICTION-2026
  // Undo/Redo system with history management
  interface EditorState {
    profile: Partial<Profile>;
    links: Partial<ProfileLink>[];
  }

  const {
    pushState: pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useHistory<EditorState>(
    { profile, links },
    50, // Max 50 history states
  );

  const handleUndo = () => {
    const previousState = undoHistory();
    if (previousState) {
      setProfile(previousState.profile);
      setLinks(previousState.links);
      toast.success("Deshecho");
    }
  };

  const handleRedo = () => {
    const nextState = redoHistory();
    if (nextState) {
      setProfile(nextState.profile);
      setLinks(nextState.links);
      toast.success("Rehecho");
    }
  };

  // Push to history whenever profile or links change
  useEffect(() => {
    if (session && (profile.id || links.length > 0)) {
      pushHistory({ profile, links });
    }
  }, [profile, links, session]);

  // Modified by Codex — MOBILE-TOUCH-SELECTION-SHEET-12
  // Touch gesture handlers for mobile selection
  const handleTapOnElement = (target: string) => {
    setSelectedMobileTarget(target);
    setShowFloatingToolbar(true);

    // Also update desktop selection state for consistency
    const { type, id } = parseEditorTarget(target);
    if (type && type.startsWith("link") && id) {
      setSelectedEditorTarget({ type: "link", linkId: id });
    } else if (
      type === "profile.photo" ||
      type === "profile.name" ||
      type === "profile.bio" ||
      type === "profile.alias" ||
      type === "profile.cover" ||
      type === "profile.footer" ||
      type === "links.manage" ||
      type === "appearance.templates" ||
      type === "appearance.typography" ||
      type === "appearance.colors" ||
      type === "appearance.buttons" ||
      type === "appearance.spacing" ||
      type === "appearance.decoration" ||
      type === "social_cover" ||
      type === "hero_social" ||
      type === "qr"
    ) {
      setSelectedEditorTarget({ type });
    }
  };

  const handleTapOutside = () => {
    setSelectedMobileTarget(null);
    setShowFloatingToolbar(false);
    setBottomSheetOpen(false);
  };

  const handleFloatingToolbarAction = (action: string) => {
    if (action === "more") {
      setBottomSheetOpen(true);
      setBottomSheetContent("general");
    } else if (action === "font") {
      setBottomSheetOpen(true);
      setBottomSheetContent("font");
    } else if (action === "color") {
      setBottomSheetOpen(true);
      setBottomSheetContent("color");
    } else if (action === "replace") {
      // Trigger file upload
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        // Handle file upload
        console.log("File selected:", (e.target as HTMLInputElement).files?.[0]);
      };
      input.click();
    } else if (action === "edit") {
      setBottomSheetOpen(true);
      setBottomSheetContent("edit");
    }
  };

  // Touch gesture hook (only on mobile)
  useTouchGesture(
    !isDesktop
      ? {
          onTap: handleTapOnElement,
          onTapOutside: handleTapOutside,
        }
      : {},
  );

  // Modified by Codex — MOBILE-PINCH-ZOOM-CANVAS-13
  // Modified by Codex — DIRECT-MANIPULATION-PINCH-ZOOM
  // Pinch zoom with direct finger control (no React re-renders during gesture)
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { attachTo: attachPinchZoom, setScale: setPinchScale } = usePinchZoomDirect({
    minScale: 0.4,
    maxScale: 3.0,
    initialScale: zoomLevel,
    onScaleChange: (scale) => {
      // Only update React state AFTER gesture ends
      setZoomLevel(scale);
    },
  });

  const setZoom = (scale: number) => {
    setZoomLevel(scale);
    setPinchScale(scale);
  };

  // Attach pinch zoom to canvas container on mobile
  useEffect(() => {
    if (!isDesktop && canvasContainerRef.current) {
      // Find the actual canvas element (the scaled div)
      const canvas = canvasContainerRef.current.querySelector('.phone-canvas') as HTMLElement;
      if (canvas) {
        attachPinchZoom(canvas);
      }
    }
  }, [isDesktop, attachPinchZoom]);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleZoomIn = () => {
    const nextStep = ZOOM_STEPS.find((step) => step > zoomLevel + 0.01);
    if (nextStep !== undefined) {
      setPinchTransformOrigin("center center");
      setZoom(nextStep);
    }
  };

  const handleZoomOut = () => {
    const prevStep = [...ZOOM_STEPS].reverse().find((step) => step < zoomLevel - 0.01);
    if (prevStep !== undefined) {
      setPinchTransformOrigin("center center");
      setZoom(prevStep);
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

    setPinchTransformOrigin("center center");
    setZoom(bestScale);
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
      // Parallelize queries to Supabase to prevent network waterfalls
      const [p, adminStatus, authUserResult] = await Promise.all([
        profileService.getProfileByUserId(supabase, userId),
        isUserAdmin(supabase, userId),
        supabase.auth.getUser(),
      ]);

      const userEmail = authUserResult.data.user?.email || "";
      setIsAdmin(adminStatus || isAdminEmail(userEmail));

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
    { id: "profile", label: "Perfil", icon: UserCircle },
    { id: "links", label: "Enlaces", icon: LinkIcon },
    { id: "appearance", label: "Apariencia", icon: Palette },
    { id: "qr", label: "QR", icon: QrCode },
  ] as const;

  // Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
  const renderContextualProperties = () => (
    <ContextualPropertiesPanel
      selectedTarget={selectedEditorTarget}
      profile={profile}
      links={links}
      userId={session.user.id}
      publicId={savedPublicId || ""}
      published={isPublished}
      saving={saving}
      onSave={handleSave}
      isValid={validate()}
      onProfileChange={(updates) => setProfile((current) => ({ ...current, ...updates }))}
      onLinksChange={setLinks}
      onSelectTarget={(target) => {
        if (target.type === "link" || target.type === "links.manage") {
          setActiveTab("links");
        } else if (target.type === "qr") {
          setActiveTab("qr");
        } else if (
          target.type.startsWith("appearance") ||
          target.type === "social_cover" ||
          target.type === "hero_social"
        ) {
          setActiveTab("appearance");
        } else {
          setActiveTab("profile");
        }
        setSelectedEditorTarget(target);
        setPanelOpen(true);
      }}
    />
  );

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setPanelOpen(true);
    // Modified by Codex — MOBILE-FORENSIC-FIX: Connect to correct state
    setBottomSheetOpen(true); // ✅ Opens DraggableBottomSheet
    // Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09
    setSelectedEditorTarget(
      id === "profile"
        ? { type: "profile.photo" }
        : id === "links"
          ? links[0]?.id
            ? { type: "link", linkId: links[0].id }
            : { type: "links.manage" }
          : id === "appearance"
            ? { type: "appearance.templates" }
            : { type: "qr" },
    );
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

  // Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09
  const handlePreviewTargetSelect = (target: {
    type: "title" | "bio" | "avatar" | "cover" | "background" | "link";
    linkId?: string;
  }) => {
    if (target.type === "link" && target.linkId) {
      setActiveTab("links");
      setSelectedEditorTarget({ type: "link", linkId: target.linkId });
    } else if (target.type === "title") {
      setActiveTab("profile");
      setSelectedEditorTarget({ type: "profile.name" });
    } else if (target.type === "bio") {
      setActiveTab("profile");
      setSelectedEditorTarget({ type: "profile.bio" });
    } else if (target.type === "avatar") {
      setActiveTab("profile");
      setSelectedEditorTarget({ type: "profile.photo" });
    } else if (target.type === "cover") {
      setActiveTab("profile");
      setSelectedEditorTarget({ type: "profile.cover" });
    } else if (target.type === "background") {
      setActiveTab("appearance");
      setSelectedEditorTarget({ type: "appearance.colors" });
    }
    setPanelOpen(true);
    setMobilePropertiesOpen(false);
  };

  const showQrEditingPreview = activeTab === "qr";

  // Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
  const selectTarget = (tab: TabId, target: EditorTarget) => {
    setActiveTab(tab);
    setSelectedEditorTarget(target);
    setPanelOpen(true);
    setMobilePropertiesOpen(true);
  };

  // Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
  const targetLabel = (() => {
    if (selectedEditorTarget.type === "profile.photo") return "Foto";
    if (selectedEditorTarget.type === "profile.name") return "Nombre";
    if (selectedEditorTarget.type === "profile.bio") return "Bio";
    if (selectedEditorTarget.type === "profile.alias") return "Alias";
    if (selectedEditorTarget.type === "profile.cover") return "Portada";
    if (selectedEditorTarget.type === "profile.footer") return "Pie de página";
    if (selectedEditorTarget.type === "links.manage") return "Administrar enlaces";
    if (selectedEditorTarget.type === "link") {
      return links.find((link) => link.id === selectedEditorTarget.linkId)?.label || "Enlace";
    }
    if (selectedEditorTarget.type === "appearance.templates") return "Templates";
    if (selectedEditorTarget.type === "appearance.typography") return "Tipografía";
    if (selectedEditorTarget.type === "appearance.colors") return "Colores";
    if (selectedEditorTarget.type === "appearance.buttons") return "Botones";
    if (selectedEditorTarget.type === "appearance.spacing") return "Espaciado";
    if (selectedEditorTarget.type === "appearance.decoration") return "Decoración";
    if (selectedEditorTarget.type === "social_cover") return "Social covers";
    if (selectedEditorTarget.type === "hero_social") return "Hero social";
    return "QR";
  })();

  // Modified by Codex — EDITOR-CONTEXTUAL-RIGHT-PANEL-10
  const renderStructurePanel = () => (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div>
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Perfil
        </p>
        {[
          ["profile.photo", "Foto"],
          ["profile.name", "Nombre"],
          ["profile.bio", "Bio"],
          ["profile.alias", "Alias"],
          ["profile.cover", "Portada"],
          ["profile.footer", "Pie de página"],
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
              selectedEditorTarget.type === type ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            onClick={() =>
              selectTarget("profile", { type: type as EditorTarget["type"] } as EditorTarget)
            }
          >
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Enlaces
          </p>
          <span className="text-[11px] text-muted-foreground">{links.length}/8</span>
        </div>
        <button
          type="button"
          className={`mb-2 w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm hover:bg-muted ${
            selectedEditorTarget.type === "links.manage" ? "bg-primary/10 text-primary" : ""
          }`}
          onClick={() => selectTarget("links", { type: "links.manage" })}
        >
          Añadir / administrar enlaces
        </button>
        {links.map((link) => (
          <button
            key={link.id || link.sort_order}
            type="button"
            className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
              selectedEditorTarget.type === "link" && selectedEditorTarget.linkId === link.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
            onClick={() => selectTarget("links", { type: "link", linkId: link.id || "" })}
          >
            <span className="min-w-0 truncate">{link.label || link.platform || "Enlace"}</span>
            <span
              className={
                link.enabled ? "text-[10px] text-emerald-600" : "text-[10px] text-muted-foreground"
              }
            >
              {link.enabled ? "ON" : "OFF"}
            </span>
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Apariencia
        </p>
        {[
          ["appearance.templates", "Templates"],
          ["appearance.typography", "Tipografía"],
          ["appearance.colors", "Colores"],
          ["appearance.buttons", "Botones"],
          ["appearance.spacing", "Espaciado"],
          ["appearance.decoration", "Decoración"],
          ["social_cover", "Social covers"],
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
              selectedEditorTarget.type === type ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            onClick={() =>
              selectTarget("appearance", { type: type as EditorTarget["type"] } as EditorTarget)
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          QR
        </p>
        <button
          type="button"
          className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
            selectedEditorTarget.type === "qr" ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
          onClick={() => selectTarget("qr", { type: "qr" })}
        >
          QR Studio
        </button>
      </div>
    </div>
  );

  // Modified by Codex — MOBILE-TOUCH-SELECTION-SHEET-12 - REMOVED OLD TOOLBAR
  // Old renderMobileContextToolbar() deleted, replaced with FloatingContextToolbar component

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans">
      {/* Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09 */}
      <header className="hidden h-16 shrink-0 items-center justify-between border-b bg-card/95 px-4 shadow-sm backdrop-blur md:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">
            QR
          </div>
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id as TabId)}
                  className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mx-1 h-6 w-px bg-border" />
          <Link
            to="/encrypted-documents"
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <Lock className="h-4 w-4" />
            Docs Seguros
          </Link>
          <Link
            to="/profile"
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <UserRound className="h-4 w-4" />
            Mi perfil
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-amber-600 hover:bg-amber-50"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Salir
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isPublished && (
            <div className="flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 shadow-sm">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Publicado
            </div>
          )}
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || !validate()}
            className="rounded-full px-5 shadow-sm"
          >
            {saving ? "Guardando..." : "Publicar Cambios"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09 */}
        <div className="hidden h-full w-[292px] shrink-0 flex-col overflow-hidden border-r bg-background md:flex">
          <div className="shrink-0 border-b bg-card/50 px-4 py-4">
            <p className="text-sm font-semibold">Estructura</p>
            <p className="text-xs text-muted-foreground">Selecciona qué quieres editar</p>
          </div>
          {renderStructurePanel()}
        </div>

        {/* PREVIEW CONTAINER */}
        <main
          id="preview-main-container"
          className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-muted/30 p-0 pb-24 md:h-full md:p-8"
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

          {/* Zoom Controls - Hidden on mobile (pinch zoom instead) */}
          <div className="absolute right-4 top-4 z-40 hidden items-center gap-1 rounded-full border bg-background/95 p-1.5 shadow-sm backdrop-blur-md md:flex md:top-1/2 md:-translate-y-1/2 md:flex-col">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 1.25}
              className="h-8 w-8 rounded-full"
              aria-label="Acercar"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span
              className="w-full py-1 text-center text-[10px] font-medium"
              aria-label="Nivel de zoom actual"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="h-8 w-8 rounded-full"
              aria-label="Alejar"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <div className="my-1 h-[1px] w-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFit}
              className="h-8 w-8 rounded-full hover:bg-muted"
              aria-label="Ajustar a pantalla"
              title="Ajustar"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Scalable Container - Direct manipulation pinch zoom */}
          <div
            ref={canvasContainerRef}
            className="relative flex items-center justify-center w-full h-full"
          >
            {showQrEditingPreview ? (
              <EditorQRPreview
                profile={profile}
                publicId={savedPublicId || profile.public_id || ""}
                onDone={() => setPanelOpen(false)}
              />
            ) : (
              // Modified by Codex — DIRECT-MANIPULATION: Transform applied via direct DOM
              <div
                className="phone-canvas relative h-[750px] w-[375px] shrink-0 transform-gpu overflow-hidden rounded-[3rem] border-[8px] border-black/10 bg-background shadow-2xl"
                style={{
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
                  onSelectTarget={handlePreviewTargetSelect}
                />
              </div>
            )}
          </div>

          {/* Modified by Codex — MOBILE-TOUCH-SELECTION-SHEET-12 */}
          {/* Floating Context Toolbar - Only visible when element selected on mobile */}
          <FloatingContextToolbar
            selectedTarget={selectedMobileTarget}
            onActionClick={handleFloatingToolbarAction}
            visible={showFloatingToolbar && !isDesktop}
          />
        </main>

        {/* Modified by Codex — EDITOR-THREE-PANEL-RESTRUCTURE-09 */}
        <aside
          className={`hidden h-full shrink-0 flex-col overflow-hidden border-l bg-background transition-all duration-200 md:flex ${
            panelOpen ? "w-[340px]" : "w-0 border-l-0"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b bg-card/50 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Propiedades</p>
              <p className="truncate text-xs text-muted-foreground">{targetLabel}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setPanelOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            {panelOpen ? (
              renderContextualProperties()
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Selecciona un elemento para editar sus propiedades.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modified by Codex — PREMIUM-MOBILE-UX-ZERO-FRICTION-2026 */}
      {/* Undo/Redo FAB - Always accessible (like PicsArt) */}
      <UndoRedoFAB onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="z-30 flex shrink-0 items-center gap-1 border-t bg-card px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:hidden">
        <Link
          to="/profile"
          title="Mi perfil principal"
          className="flex min-h-14 min-w-[52px] flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-2 transition-colors text-muted-foreground hover:text-primary"
        >
          <UserRound className="w-5 h-5 mb-1" />
          <span className="max-w-full truncate text-[10px] font-medium">Mi perfil</span>
        </Link>

        <Link
          to="/encrypted-documents"
          title="Documentos Seguros"
          className="flex min-h-14 min-w-[52px] flex-1 flex-col items-center justify-center rounded-lg px-1.5 py-2 transition-colors text-muted-foreground hover:text-primary"
        >
          <Lock className="w-5 h-5 mb-1 text-blue-500" />
          <span className="max-w-full truncate text-[10px] font-medium text-blue-500 font-semibold">
            Docs Seguros
          </span>
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

      {/* Modified by Codex — DIRECT-MANIPULATION-BOTTOM-SHEET */}
      {/* Direct Bottom Sheet - Follows finger exactly during drag */}
      <DirectBottomSheet
        open={bottomSheetOpen}
        onOpenChange={setBottomSheetOpen}
        title={
          selectedMobileTarget
            ? parseEditorTarget(selectedMobileTarget).type === "profile.photo"
              ? "Foto de perfil"
              : parseEditorTarget(selectedMobileTarget).type === "profile.name"
                ? "Nombre"
                : parseEditorTarget(selectedMobileTarget).type === "profile.bio"
                  ? "Biografía"
                  : parseEditorTarget(selectedMobileTarget).type === "link"
                    ? "Enlace"
                    : "Propiedades"
            : "Propiedades"
        }
      >
        {renderContextualProperties()}
      </DirectBottomSheet>
    </div>
  );
}
