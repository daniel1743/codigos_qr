import { useState, useEffect } from "react";
import { Crown, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { QRTemplate } from "../../constants/qr-templates";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

function DeferredQRCodeSVG({ template, demoUrl }: { template: QRTemplate, demoUrl: string }) {
  const [shouldRender, setShouldRender] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), 50);
    return () => clearTimeout(timer);
  }, []);
  if (!shouldRender) return <div className="w-[120px] h-[120px] bg-slate-100 rounded-md animate-pulse" />;
  return (
    <QRCodeSVG
      value={demoUrl}
      size={120}
      level="H"
      marginSize={2}
      bgColor={template.qr_background_color}
      fgColor={template.qr_foreground_color}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

interface QRTemplateCardProps {
  template: QRTemplate;
  isSelected: boolean;
  isPremiumUser: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

export function QRTemplateCard({
  template,
  isSelected,
  isPremiumUser,
  onSelect,
  onPreview,
}: QRTemplateCardProps) {
  const isPremium = template.tier === "premium";
  const canApply = !isPremium || isPremiumUser;

  // URL de ejemplo para preview del QR
  const DEMO_URL = "https://qr.link/demo";

  return (
    <div
      className={`group relative flex flex-col gap-3 rounded-2xl border-2 bg-card p-3 shadow-sm transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* Badge Premium */}
      {isPremium && (
        <div className="absolute right-2 top-2 z-10">
          <Badge
            variant="secondary"
            className="h-6 gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md"
          >
            <Crown className="h-3 w-3 fill-white" />
            <span className="text-[10px] font-bold">Premium</span>
          </Badge>
        </div>
      )}

      {/* Check si está seleccionado */}
      {isSelected && (
        <div className="absolute left-2 top-2 z-10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-md">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Preview del QR */}
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
        <DeferredQRCodeSVG template={template} demoUrl={DEMO_URL} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{template.name}</h3>
          <Badge variant="outline" className="shrink-0 text-[9px] font-medium capitalize">
            {template.category}
          </Badge>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{template.description}</p>
      </div>

      {/* Actions */}
      <div className="mt-1 flex gap-2">
        {canApply ? (
          <Button
            onClick={onSelect}
            variant={isSelected ? "default" : "secondary"}
            className="h-9 flex-1 text-xs font-semibold"
          >
            {isSelected ? "Aplicado" : "Usar diseño"}
          </Button>
        ) : (
          <>
            <Button
              onClick={onPreview}
              variant="outline"
              className="h-9 flex-1 text-xs font-semibold"
            >
              Vista previa
            </Button>
            <Button
              onClick={() => {
                // TODO: Navegar a página de Premium cuando exista
                alert(
                  "Este diseño forma parte de Premium.\n\nPróximamente podrás desbloquear plantillas Premium.",
                );
              }}
              className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 px-3 text-xs font-bold text-white hover:from-amber-600 hover:to-yellow-600"
            >
              <Crown className="h-3.5 w-3.5 fill-white" />
              Premium
            </Button>
          </>
        )}
      </div>

      {/* Preview note si existe */}
      {template.preview_note && (
        <p className="mt-1 px-1 text-[10px] italic text-muted-foreground">
          {template.preview_note}
        </p>
      )}
    </div>
  );
}
