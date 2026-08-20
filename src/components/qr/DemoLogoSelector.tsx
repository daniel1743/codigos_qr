import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { demoLogoService } from "../../services/demoLogoService";
import type { DemoLogo, DemoLogoCategory } from "../../types/demo-logo";
import { QRCodeSVG } from "qrcode.react";

interface DemoLogoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (logo: DemoLogo) => void;
  currentLogoId?: string | null;
  qrForeground: string;
  qrBackground: string;
}

const CATEGORIES: Array<{ id: DemoLogoCategory | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "business", label: "Negocios" },
  { id: "food", label: "Comida" },
  { id: "beauty", label: "Belleza" },
  { id: "tech", label: "Tecnología" },
  { id: "creative", label: "Creativos" },
];

export function DemoLogoSelector({
  isOpen,
  onClose,
  onSelect,
  currentLogoId,
  qrForeground,
  qrBackground,
}: DemoLogoSelectorProps) {
  const [logos, setLogos] = useState<DemoLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<DemoLogoCategory | "all">("all");
  const [previewLogo, setPreviewLogo] = useState<DemoLogo | null>(null);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (isOpen) {
      loadLogos();
    }
  }, [isOpen]);

  const loadLogos = async () => {
    setLoading(true);
    try {
      const data = await demoLogoService.getAllLogos(supabase);
      setLogos(data);
    } catch (error) {
      console.error("Error loading demo logos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogos =
    categoryFilter === "all" ? logos : logos.filter((l) => l.category === categoryFilter);

  const handleSelect = (logo: DemoLogo) => {
    onSelect(logo);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-[90vh] max-h-[800px] max-w-4xl flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 space-y-3 border-b p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                  Logos Demo Premium
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Elige un logo profesional para tu QR. Solo disponible en Premium.
                </p>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.id as DemoLogoCategory | "all")}
                  className="h-8 text-xs"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </DialogHeader>

          {/* Logo Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando logos...</p>
              </div>
            ) : filteredLogos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredLogos.map((logo) => {
                  const isSelected = currentLogoId === logo.id;

                  return (
                    <div
                      key={logo.id}
                      className={`group relative flex flex-col gap-3 rounded-xl border-2 bg-card p-3 shadow-sm transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      {/* Preview Thumbnail */}
                      <div
                        className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-white p-4"
                        onClick={() => setPreviewLogo(logo)}
                      >
                        <img
                          src={logo.preview_url}
                          alt={logo.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-1.5 px-1">
                        <h3 className="text-sm font-semibold leading-tight">{logo.name}</h3>
                        <Badge
                          variant="outline"
                          className="w-fit text-[9px] font-medium capitalize"
                        >
                          {logo.category}
                        </Badge>
                      </div>

                      {/* Action */}
                      <Button
                        onClick={() => handleSelect(logo)}
                        variant={isSelected ? "default" : "secondary"}
                        size="sm"
                        className="mt-1 h-8 w-full text-xs font-semibold"
                      >
                        {isSelected ? "Seleccionado" : "Usar este logo"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No se encontraron logos en esta categoría.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filteredLogos.length} logo{filteredLogos.length !== 1 ? "s" : ""} disponible
                {filteredLogos.length !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewLogo} onOpenChange={() => setPreviewLogo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewLogo?.name}
              <Badge variant="outline" className="text-xs capitalize">
                {previewLogo?.category}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview QR con logo */}
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border bg-white p-6 shadow-sm">
              {previewLogo && (
                <QRCodeSVG
                  value="https://qr.link/demo"
                  size={240}
                  level="H"
                  marginSize={4}
                  bgColor={qrBackground}
                  fgColor={qrForeground}
                  imageSettings={{
                    src: previewLogo.file_url,
                    height: 43,
                    width: 43,
                    excavate: true,
                  }}
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewLogo(null)}>
                Volver
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (previewLogo) handleSelect(previewLogo);
                  setPreviewLogo(null);
                }}
              >
                Usar este logo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
