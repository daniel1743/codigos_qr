import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { Auth } from "../components/Auth";
import { linkService } from "../services/link.service";
import { profileService } from "../services/profile.service";
import { createTemplate, updateTemplate } from "../services/template.service";
import { templateConfigToPreviewData } from "../lib/template-factory/preview";
import { getBrowserSupabaseClient } from "../lib/supabase/client";

export const Route = createFileRoute("/template-builder")({
  head: () => ({
    meta: [
      { title: "Template Builder — Canvas Engine" },
      {
        name: "description",
        content: "Visual template builder for creating reusable bio link templates",
      },
    ],
  }),
  component: TemplateBuilderPage,
});

function TemplateBuilderPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(currentSession);
        setLoadingSession(false);
      }
    };

    loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!cancelled) {
        setSession(currentSession);
        setLoadingSession(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    async function handleSaveDefaultTemplate(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "cripqer-template-builder:save-default-template") return;

      const reply = (payload: Record<string, unknown>) => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "cripqer-template-builder:save-default-template-result", ...payload },
          window.location.origin,
        );
      };

      try {
        const config = event.data.config;
        if (!config || typeof config !== "object") {
          throw new Error("Config inválida");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Debes iniciar sesión para guardar la plantilla.");

        const profile = await profileService.getProfileByUserId(supabase, user.id);
        if (!profile) throw new Error("No se encontró tu perfil principal.");

        const sourceTemplateId =
          typeof event.data.templateId === "string" && event.data.templateId.trim()
            ? event.data.templateId.trim()
            : window.localStorage.getItem("selected-source-template-id");

        const templatePayload = {
          name: "Plantilla predefinida",
          config_json: config,
          template_type: "private" as const,
          is_public: false,
          publication_status: "GENERATED_PRIVATE",
          generation_source: "USER_DEFAULT_TEMPLATE",
        };

        const savedTemplate = sourceTemplateId
          ? await updateTemplate(sourceTemplateId, templatePayload)
          : await createTemplate(templatePayload);

        window.localStorage.setItem("selected-source-template-id", savedTemplate.id);

        const preview = templateConfigToPreviewData(config as any);
        const {
          id: _previewId,
          user_id: _previewUserId,
          public_id: _previewPublicId,
          slug: _previewSlug,
          scan_count: _previewScanCount,
          created_at: _previewCreatedAt,
          updated_at: _previewUpdatedAt,
          published: _previewPublished,
          ...profileUpdates
        } = preview.profile;

        await profileService.updateProfile(supabase, profile.id, {
          ...profileUpdates,
          published: true,
        });

        const existingLinks = await linkService.getProfileLinks(supabase, profile.id);
        await Promise.all(existingLinks.map((link) => linkService.deleteProfileLink(supabase, link.id)));
        await Promise.all(
          preview.links.map((link, index) =>
            linkService.createProfileLink(supabase, {
              profile_id: profile.id,
              platform: String(link.platform || "website"),
              label: String(link.label || `Enlace ${index + 1}`),
              url: String(link.url || "#"),
              icon_key: link.icon_key || null,
              subtitle: link.subtitle || null,
              social_cover_image_mode: link.social_cover_image_mode || "platform_icon",
              social_cover_image_url: link.social_cover_image_url || null,
              sort_order: index,
              enabled: link.enabled ?? true,
            }),
          ),
        );

        toast.success("Plantilla predefinida guardada");
        reply({ ok: true, templateId: savedTemplate.id });
      } catch (error) {
        console.error("Error saving default template:", error);
        const message = error instanceof Error ? error.message : "No se pudo guardar la plantilla.";
        toast.error(message);
        reply({ ok: false, error: message });
      }
    }

    window.addEventListener("message", handleSaveDefaultTemplate);
    return () => window.removeEventListener("message", handleSaveDefaultTemplate);
  }, [supabase]);

  if (loadingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b1020]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <iframe
      ref={iframeRef}
      src="/template-builder.html"
      className="h-[100dvh] w-full border-0"
      title="Template Builder"
    />
  );
}
