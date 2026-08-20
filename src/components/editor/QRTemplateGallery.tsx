import { useState, useMemo } from "react";
import { Layers, X } from "lucide-react";
import type { Profile } from "../../types/database";
import {
  QR_TEMPLATES,
  QR_CATEGORIES,
  type QRTemplate,
  type QRTemplateCategory,
  type QRTemplateTier,
} from "../../constants/qr-templates";
import { QRTemplateCard } from "./QRTemplateCard";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface QRTemplateGalleryProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  isPremiumUser: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function QRTemplateGallery({
  profile,
  onChange,
  isPremiumUser,
  isOpen,
  onClose,
}: QRTemplateGalleryProps) {
  const [tierFilter, setTierFilter] = useState<QRTemplateTier | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<QRTemplateCategory | "all">("all");
  const [previewTemplate, setPreviewTemplate] = useState<QRTemplate | null>(null);

  // Detectar plantilla actual
  const currentTemplate = useMemo(() => {
    return QR_TEMPLATES.find(
      (t) =>
        t.qr_foreground_color === profile.qr_foreground_color &&
        t.qr_background_color === profile.qr_background_color &&
        t.qr_logo_enabled === profile.qr_logo_enabled
    );
  }, [profile.qr_foreground_color, profile.qr_background_color, profile.qr_logo_enabled]);

  // Filtrado de plantillas
  const filteredTemplates = useMemo(() => {
    let filtered = QR_TEMPLATES;

    if (tierFilter !== "all") {
      filtered = filtered.filter((t) => t.tier === tierFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    return filtered;
  }, [tierFilter, categoryFilter]);

  const handleApplyTemplate = (template: QRTemplate) => {
    const isPremium = template.tier === "premium";

    // Si es Premium y el usuario no tiene acceso, mostrar preview en lugar de aplicar
    if (isPremium && !isPremiumUser) {
      setPreviewTemplate(template);
      return;
    }

    // Aplicar plantilla
    onChange({
      qr_foreground_color: template.qr_foreground_color,
      qr_background_color: template.qr_background_color,
      qr_logo_enabled: template.qr_logo_enabled,
    });

    toast.success("Diseño aplicado", {
      description: `${template.name} aplicado a tu QR. Puedes personalizarlo desde la pestaña QR.`,
    });
  };

  const handlePreview = (template: QRTemplate) => {
    setPreviewTemplate(template);
  };

  const handleApplyFromPreview = () => {
    if (!previewTemplate) return;

    // Verificar acceso Premium nuevamente
    if (previewTemplate.tier === "premium" && !isPremiumUser) {
      toast.error("Diseño Premium", {
        description: "Este diseño requiere Premium. La vista previa no se guardará.",
      });
      setPreviewTemplate(null);
      return;
    }

    handleApplyTemplate(previewTemplate);
    setPreviewTemplate(null);
  };

  const freeCount = QR_TEMPLATES.filter((t) => t.tier === "free").length;
  const premiumCount = QR_TEMPLATES.filter((t) => t.tier === "premium").length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-[90vh] max-h-[800px] max-w-4xl flex-col gap-0 p-0">
          {/* Header */}
          <DialogHeader className="shrink-0 space-y-3 border-b p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Layers className="h-6 w-6 text-primary" />
                  Diseños QR
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Elige un diseño listo y personalízalo después si quieres.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <span className="font-semibold">{freeCount}</span>
                <span className="text-muted-foreground">Gratis</span>
              </Badge>
              <Badge
                variant="secondary"
                className="gap-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10"
              >
                <span className="font-semibold">{premiumCount}</span>
                <span className="text-muted-foreground">Premium</span>
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <span className="font-semibold">{filteredTemplates.length}</span>
                <span className="text-muted-foreground">Mostrando</span>
              </Badge>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              {/* Tier Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tierFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTierFilter("all")}
                  className="h-8 text-xs"
                >
                  Todos
                </Button>
                <Button
                  variant={tierFilter === "free" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTierFilter("free")}
                  className="h-8 text-xs"
                >
                  Gratis
                </Button>
                <Button
                  variant={tierFilter === "premium" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTierFilter("premium")}
                  className="h-8 text-xs"
                >
                  Premium
                </Button>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {QR_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categoryFilter === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat.id as QRTemplateCategory | "all")}
                    className="h-7 text-xs"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 pb-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <QRTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={currentTemplate?.id === template.id}
                    isPremiumUser={isPremiumUser}
                    onSelect={() => handleApplyTemplate(template)}
                    onPreview={() => handlePreview(template)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No se encontraron diseños con estos filtros.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Los diseños solo cambian la apariencia visual. Tu QR seguirá apuntando a la misma
                página.
              </p>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {previewTemplate?.name}
                  {previewTemplate?.tier === "premium" && (
                    <Badge className="h-5 gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                      Premium
                    </Badge>
                  )}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {previewTemplate?.description}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview QR */}
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border bg-white p-6 shadow-sm">
              {previewTemplate && (
                <QRCodeSVG
                  value="https://qr.link/preview"
                  size={240}
                  level="H"
                  marginSize={4}
                  bgColor={previewTemplate.qr_background_color}
                  fgColor={previewTemplate.qr_foreground_color}
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>

            {/* Info */}
            {previewTemplate?.tier === "premium" && !isPremiumUser && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  <strong>Este diseño forma parte de Premium.</strong>
                  <br />
                  Puedes ver la vista previa, pero para aplicarlo y descargarlo necesitas
                  desbloquear Premium.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPreviewTemplate(null)}
              >
                Volver
              </Button>
              {previewTemplate?.tier === "premium" && !isPremiumUser ? (
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                  onClick={() => {
                    // TODO: Navegar a página Premium
                    alert("Próximamente podrás desbloquear Premium desde aquí.");
                    setPreviewTemplate(null);
                  }}
                >
                  Desbloquear Premium
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleApplyFromPreview}>
                  Usar este diseño
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
