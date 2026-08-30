import { X, Eye, Check } from "lucide-react";
import { Button } from "../ui/button";
import { TemplateThumbnail } from "../template-lab/TemplateThumbnail";
import { TEMPLATES } from "../../lib/basic-templates/catalog";
import { buildConfig, type ButtonCustomizationOverrides } from "../../lib/basic-templates/config";
import { getDefaultContent } from "../../lib/basic-templates/fixtures";
import { useState } from "react";
import type { BasicTemplateContent } from "../../types/basic-templates";
import { BasicTemplateRenderer } from "../basic-template/BasicTemplateRenderer";

interface GalleryPreviewData {
  profile: {
    avatar_url?: string | null;
    banner_url?: string | null;
    bio?: string | null;
    display_name?: string | null;
  } & ButtonCustomizationOverrides;
  links: Array<{
    enabled?: boolean;
    id?: string;
    label?: string | null;
    url?: string | null;
  }>;
}

function getPreviewContent(
  templateId: string,
  previewData: GalleryPreviewData,
): BasicTemplateContent {
  const defaults = getDefaultContent(templateId);

  return {
    ...defaults,
    profile: {
      ...defaults.profile,
      avatarUrl: previewData.profile.avatar_url || defaults.profile.avatarUrl,
      bio: previewData.profile.bio || defaults.profile.bio,
      heroUrl: previewData.profile.banner_url || defaults.profile.heroUrl,
      name: previewData.profile.display_name || defaults.profile.name,
    },
    links: previewData.links.map((link, index) => ({
      id: link.id || `profile-link-${index}`,
      label: link.label || defaults.links[index]?.label || "Enlace",
      url: link.url || defaults.links[index]?.url || "#",
      enabled: link.enabled ?? true,
    })),
  };
}

interface MobileTemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  // Para el preview fullscreen con datos reales o demo:
  previewProps: GalleryPreviewData;
}

export function MobileTemplateGallery({
  isOpen,
  onClose,
  selectedTemplateId,
  onSelectTemplate,
  previewProps,
}: MobileTemplateGalleryProps) {
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPreviewing = previewTemplateId !== null;
  const previewTemplate = previewTemplateId
    ? TEMPLATES.find((template) => template.id === previewTemplateId)
    : null;
  const previewConfig = previewTemplate
    ? buildConfig(previewTemplate, getPreviewContent(previewTemplate.id, previewProps), {
        profileCustomization: previewProps.profile,
      })
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => (isPreviewing ? setPreviewTemplateId(null) : onClose())}
      />

      {/* Bottom Sheet */}
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t border-stone-200 bg-[#fffefa] shadow-[0_-12px_32px_rgba(29,29,27,0.16)] transition-transform"
        style={{
          maxHeight: "90vh",
          height: isPreviewing ? "90vh" : "auto",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Handle */}
        <div
          className="w-full flex justify-center pt-3 pb-2"
          onClick={() => (isPreviewing ? setPreviewTemplateId(null) : onClose())}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Content */}
        {!isPreviewing ? (
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Galería</p>
                <h3 className="text-xl font-bold tracking-[-0.04em] text-[#1d1d1b]">Plantillas</h3>
                <p className="text-sm text-stone-500">Elige un diseño para tu página</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {TEMPLATES.map((template) => {
                const isSelected = selectedTemplateId === template.id;

                return (
                  <div key={template.id} className="flex flex-col gap-2">
                    <div
                      className={`relative aspect-[9/16] w-full overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all ${isSelected ? "border-[#1d1d1b] shadow-[0_8px_20px_rgba(29,29,27,0.12)]" : "border-stone-200"}`}
                    >
                      <TemplateThumbnail
                        template={template}
                        content={getDefaultContent(template.id)}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[#1d1d1b] px-2 py-0.5 text-[10px] font-bold text-[#fffefa] shadow-sm">
                          <Check className="h-3 w-3" />
                          Activa
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="truncate text-sm font-semibold leading-tight text-[#1d1d1b]">
                        {template.name}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 mt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-full rounded-lg border-stone-200 text-xs font-medium"
                        onClick={() => setPreviewTemplateId(template.id)}
                      >
                        <Eye className="w-3 h-3 mr-1.5" />
                        Vista previa
                      </Button>
                      <Button
                        variant={isSelected ? "outline" : "default"}
                        size="sm"
                        className="h-8 w-full rounded-lg bg-[#1d1d1b] text-xs font-medium text-[#fffefa] hover:bg-[#343432]"
                        onClick={() => {
                          onSelectTemplate(template.id);
                          onClose();
                        }}
                      >
                        {isSelected ? "Seleccionada" : "Usar plantilla"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-4 right-4 z-50">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewTemplateId(null)}
                className="rounded-full shadow-md font-medium px-4"
              >
                <X className="h-4 w-4 mr-1.5" />
                Volver a Galería
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto w-full bg-[#f1efe9]">
              {/* Render actual template preview with current user data */}
              <div className="min-h-full w-full">
                {previewConfig && <BasicTemplateRenderer config={previewConfig} />}
              </div>
            </div>

            <div className="z-20 shrink-0 border-t border-stone-200 bg-[#fffefa] p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <Button
                className="h-12 w-full rounded-xl bg-[#1d1d1b] text-base font-semibold text-[#fffefa] hover:bg-[#343432]"
                onClick={() => {
                  if (!previewTemplate) return;
                  onSelectTemplate(previewTemplate.id);
                  setPreviewTemplateId(null);
                  onClose();
                }}
              >
                Usar plantilla
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
