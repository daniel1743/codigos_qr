import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BasicEditorShell } from "../components/basic-editor-shell/BasicEditorShell";
import type {
  BasicEditorAccount,
  BasicEditorProfileState,
} from "../components/basic-editor-shell/BasicEditorShell";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { MobileTemplateGallery } from "../components/editor/MobileTemplateGallery";
import { BasicTemplateRenderer } from "../components/basic-template/BasicTemplateRenderer";
import { TemplateThumbnail } from "../components/template-lab/TemplateThumbnail";
import { getTemplates } from "../lib/basic-templates/catalog";
import {
  buildBasicTemplateContent,
  buildConfig,
  normalizeBasicButtonStyle,
  normalizeBasicPlatform,
  remapBasicLinkPresentationIds,
} from "../lib/basic-templates/config";
import { getDefaultContent } from "../lib/basic-templates/fixtures";
import { loadGoogleFont } from "../lib/fonts";
import { generatePublicId, getInternalSlugFromPublicId } from "../lib/publicId";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { isValidUrl, normalizeUrl } from "../lib/validation";
import { linkService } from "../services/link.service";
import { profileService } from "../services/profile.service";
import { EDIT_TARGETS, linkEditTarget, type EditTargetRegistry } from "../types/basic-templates";
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

function getSectionForTarget(
  targetId: string,
  currentSection: BasicEditorSectionId,
): BasicEditorSectionId {
  if (targetId === "hero") return "appearance";
  const isLinkTarget = targetId.startsWith("link-");
  if (
    targetId === "links-section" ||
    isLinkTarget ||
    targetId === "cards-section" ||
    targetId.startsWith("card-")
  ) {
    // Editing button appearance while already in Diseño keeps the visual
    // controls (border, radius, color, typography) visible instead of
    // throwing the user into Enlaces.
    if (isLinkTarget && currentSection === "appearance") return "appearance";
    return "links";
  }
  return "profile";
}

function getLinkTarget(link: Partial<ProfileLink>, index: number) {
  return linkEditTarget(link.id || `profile-link-${index}`);
}

function getToolFocusTarget(targetId: string | null, activeSection: BasicEditorSectionId) {
  if (!targetId) return null;
  if (
    targetId === EDIT_TARGETS.avatar ||
    targetId === EDIT_TARGETS.name ||
    targetId === EDIT_TARGETS.bio ||
    targetId === EDIT_TARGETS.footer ||
    targetId.startsWith("link-")
  ) {
    // When a button is selected while editing Diseño, scroll to the button
    // style controls instead of a (non-rendered) link accordion.
    if (activeSection === "appearance" && targetId.startsWith("link-")) {
      return "button-style";
    }
    return targetId;
  }
  return null;
}

function getLinkLabelForTarget(targetId: string, links: Partial<ProfileLink>[]) {
  const link = links.find((item, index) => getLinkTarget(item, index) === targetId);
  return link?.label || link?.platform || "Enlace";
}

function getEditorContextSegments(
  activeSection: BasicEditorSectionId,
  selectedTarget: string | null,
  isGalleryOpen: boolean,
  links: Partial<ProfileLink>[],
) {
  if (isGalleryOpen) return ["Editar plantilla", "Plantillas"];

  const sectionLabel =
    activeSection === "links"
      ? "Enlaces"
      : activeSection === "appearance"
        ? "Diseño"
        : activeSection === "gallery"
          ? "Galería"
          : "Perfil";
  const detail =
    selectedTarget === EDIT_TARGETS.avatar
      ? "Avatar"
      : selectedTarget === EDIT_TARGETS.name
        ? "Nombre"
        : selectedTarget === EDIT_TARGETS.bio
          ? "Biografía"
          : selectedTarget === EDIT_TARGETS.footer
            ? "Pie de página"
            : selectedTarget === EDIT_TARGETS.hero
              ? "Portada"
              : selectedTarget?.startsWith("link-")
                ? getLinkLabelForTarget(selectedTarget, links)
                : null;

  return detail ? ["Editar plantilla", sectionLabel, detail] : ["Editar plantilla", sectionLabel];
}

function getSafeFusionStrength(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function EditorPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>(DEFAULT_PROFILE);
  const [profileState, setProfileState] = useState<BasicEditorProfileState>("missing");
  const [links, setLinks] = useState<Partial<ProfileLink>[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedPublicId, setSavedPublicId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [activeSection, setActiveSection] = useState<BasicEditorSectionId>("profile");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  const loadedUserId = useRef<string | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef(new Map<string, HTMLElement>());
  const activeSectionRef = useRef<BasicEditorSectionId>(activeSection);
  activeSectionRef.current = activeSection;

  const handleTargetSelect = useCallback((targetId: string) => {
    setSelectedTarget(targetId);
    setActiveSection(getSectionForTarget(targetId, activeSectionRef.current));
    setIsContextPanelOpen(true);
  }, []);

  const targetRegistry = useMemo<EditTargetRegistry>(
    () => ({
      register: (targetId, element) => {
        if (element) targetsRef.current.set(targetId, element);
        else targetsRef.current.delete(targetId);
      },
      select: handleTargetSelect,
    }),
    [handleTargetSelect],
  );

  useEffect(() => {
    if (!selectedTarget) return;
    const viewport = canvasViewportRef.current;
    const target = targetsRef.current.get(selectedTarget);
    if (!viewport || !target) return;
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        targetRect.top -
        viewportRect.top -
        viewport.clientHeight / 2 +
        targetRect.height / 2,
      behavior: "smooth",
    });
  }, [selectedTarget]);

  useEffect(() => {
    loadGoogleFont(profile.font_family || "Inter");
    if (profile.title_font_family) loadGoogleFont(profile.title_font_family);
    if (profile.bio_font_family) loadGoogleFont(profile.bio_font_family);
  }, [profile.font_family, profile.title_font_family, profile.bio_font_family]);

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
        setProfileState("ready");
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
        setProfileState("missing");
        setProfile(DEFAULT_PROFILE);
        setLinks([]);
      }
    } catch (error) {
      console.error(error);
      setProfileState("error");
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
        button_style: normalizeBasicButtonStyle(profile.button_style),
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
        ...(link.platform ? { platform: normalizeBasicPlatform(link.platform) } : {}),
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

      const createdLinkIds: Record<string, string> = {};
      for (const link of normalizedLinks) {
        if (link.id?.startsWith("temp-")) {
          const { id: _id, ...newLink } = link;
          const createdLink = await linkService.createProfileLink(supabase, {
            ...newLink,
            profile_id: currentProfileId,
            platform: newLink.platform || "website",
            label: newLink.label || "Enlace",
            url: newLink.url || "",
          });
          createdLinkIds[link.id] = createdLink.id;
        } else if (link.id) {
          await linkService.updateProfileLink(supabase, link.id, link);
        }
      }

      if (Object.keys(createdLinkIds).length > 0) {
        const templateConfig = remapBasicLinkPresentationIds(
          profilePayload.template_config,
          createdLinkIds,
        );
        finalProfile = await profileService.updateProfile(supabase, currentProfileId, {
          template_config: templateConfig,
        });
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
  if (!session) return <Auth showPlatformMenu />;

  const publicId = profile.public_id || savedPublicId || "";
  const isValid = validate();
  const templates = getTemplates();
  const selectedTemplate = profile.template_id
    ? templates.find((template) => template.id === profile.template_id)
    : undefined;
  const templateContent = buildBasicTemplateContent(profile, links);
  const templateRenderConfig = selectedTemplate
    ? buildConfig(selectedTemplate, templateContent, { profileCustomization: profile })
    : null;

  if (import.meta.env.DEV && profile.template_id && !selectedTemplate) {
    console.warn(
      `Unknown basic template id: ${profile.template_id}. Rendering the legacy profile.`,
    );
  }

  const updateProfile = (updates: Partial<Profile>) =>
    setProfile((current) => ({ ...current, ...updates }));

  const handleSectionChange = (section: BasicEditorSectionId) => {
    if (section === "gallery") {
      setSelectedTarget(null);
      setIsContextPanelOpen(false);
      setIsGalleryOpen(true);
    } else {
      setSelectedTarget(null);
      setActiveSection(section);
      setIsContextPanelOpen(true);
    }
  };

  const handleSignOut = async () => {
    const { error } = await getBrowserSupabaseClient().auth.signOut();
    if (error) {
      toast.error("No se pudo cerrar la sesión.");
      return;
    }
    navigate({ to: "/" });
  };

  const handleDesktopSectionChange = (section: BasicEditorSectionId) => {
    setSelectedTarget(null);
    setIsGalleryOpen(false);
    setActiveSection(section);
    setIsContextPanelOpen(true);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "links":
        return (
          <div className="space-y-10">
            <LinksSection
              links={links}
              onChange={setLinks}
              profile={profile}
              onProfileChange={updateProfile}
              cardPresentationEnabled={selectedTemplate?.supportsCards === true}
              userId={session.user.id}
              selectedTarget={selectedTarget}
              onSelectTarget={handleTargetSelect}
            />
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
      case "gallery":
        return (
          <section className="space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Galería
              </p>
              <h2 className="text-xl font-bold tracking-[-0.03em] text-[#1d1d1b]">
                Plantillas
              </h2>
              <p className="mt-1 text-sm text-stone-500">Elige un diseño para tu página.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => {
                const isSelected = profile.template_id === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => updateProfile({ template_id: template.id, template_version: 1 })}
                    aria-pressed={isSelected}
                    className={`group min-w-0 rounded-2xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected ? "border-[#1d1d1b]" : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex justify-center overflow-hidden rounded-xl bg-stone-100">
                      <TemplateThumbnail
                        template={template}
                        content={getDefaultContent(template.id)}
                        width={120}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-[#1d1d1b]">
                        {template.name}
                      </p>
                      {isSelected && (
                        <span className="shrink-0 rounded-full bg-[#1d1d1b] px-2 py-0.5 text-[10px] font-bold text-[#fffefa]">
                          Activa
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      case "profile":
      default:
        return (
          <ProfileSection profile={profile} onChange={updateProfile} userId={session.user.id} />
        );
    }
  };

  const canvas = templateRenderConfig ? (
    <BasicTemplateRenderer
      config={templateRenderConfig}
      targetRegistry={isPreviewMode ? undefined : targetRegistry}
      highlightedTarget={isPreviewMode ? null : selectedTarget}
    />
  ) : (
    <PublicProfileView profile={profile} links={links} isPreview />
  );

  return (
    <>
      <BasicEditorShell
        account={
          session
            ? ({
                email: session.user.email ?? null,
                fullName:
                  typeof session.user.user_metadata?.full_name === "string"
                    ? session.user.user_metadata.full_name
                    : null,
                avatarUrl:
                  typeof session.user.user_metadata?.avatar_url === "string"
                    ? session.user.user_metadata.avatar_url
                    : null,
              } satisfies BasicEditorAccount)
            : null
        }
        onSignOut={handleSignOut}
        profileState={profileState}
        canvas={canvas}
        canvasViewportRef={canvasViewportRef}
        desktopPanel={<div aria-live="polite">{renderActiveSection()}</div>}
        mobilePanel={<div aria-live="polite">{renderActiveSection()}</div>}
        mobilePanelOpen={isContextPanelOpen}
        onCloseMobilePanel={() => setIsContextPanelOpen(false)}
        onPreview={() => setIsPreviewMode(true)}
        onExitPreview={() => setIsPreviewMode(false)}
        previewMode={isPreviewMode}
        onSaveDraft={() => handleSave(false)}
        onPublish={() => handleSave(true)}
        publishing={saving}
        publishDisabled={!isValid}
        templateSearchItems={templates.map((template) => ({
          id: template.id,
          name: template.name,
        }))}
        templateSearchQuery={templateSearchQuery}
        onTemplateSearchChange={setTemplateSearchQuery}
        onSelectTemplate={(id) => updateProfile({ template_id: id, template_version: 1 })}
        onOpenTemplateGallery={() => setIsGalleryOpen(true)}
        selectedTemplateId={profile.template_id ?? null}
        contextSegments={getEditorContextSegments(activeSection, selectedTarget, isGalleryOpen, links)}
        toolFocusTarget={getToolFocusTarget(selectedTarget, activeSection)}
        activeSection={activeSection}
        onSectionChange={handleDesktopSectionChange}
      />
      <MobileBottomNavbar activeSection={activeSection} onSectionChange={handleSectionChange} />
      <MobileTemplateGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        selectedTemplateId={profile.template_id ?? null}
        onSelectTemplate={(id) => updateProfile({ template_id: id, template_version: 1 })}
        previewProps={{ profile, links }}
      />
    </>
  );
}
