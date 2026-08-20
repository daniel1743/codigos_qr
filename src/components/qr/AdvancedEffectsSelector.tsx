import { useState } from "react";
import { Sparkles, X, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { QRCodeSVG } from "qrcode.react";
import type { Profile } from "../../types/database";

interface AdvancedEffectsSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const EFFECTS = [
  {
    id: "neon",
    name: "Neón",
    description: "Efecto de brillo neón brillante",
    effect: "neon",
  },
  {
    id: "glow",
    name: "Glow",
    description: "Efecto de resplandor suave",
    effect: "glow",
  },
  {
    id: "none",
    name: "Ninguno",
    description: "Sin efectos especiales",
    effect: "none",
  },
];

const DOTS_STYLES = [
  { id: "square", name: "Cuadrado", style: "square" },
  { id: "rounded", name: "Redondeado", style: "rounded" },
  { id: "dots", name: "Puntos", style: "dots" },
  { id: "classy", name: "Clásico", style: "classy" },
  { id: "extra-rounded", name: "Extra Redondeado", style: "extra-rounded" },
];

export function AdvancedEffectsSelector({
  isOpen,
  onClose,
  profile,
  onChange,
}: AdvancedEffectsSelectorProps) {
  const [selectedEffect, setSelectedEffect] = useState(profile.qr_effect || "none");
  const [selectedDotsStyle, setSelectedDotsStyle] = useState(profile.qr_dots_type || "square");

  const handleApplyEffects = () => {
    onChange({
      qr_effect: selectedEffect,
      qr_dots_type: selectedDotsStyle,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Efectos Avanzados Premium
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
              <Crown className="h-3 w-3 mr-1 fill-white" />
              Premium
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex justify-center rounded-2xl border bg-white p-6">
            <QRCodeSVG
              value="https://qr.link/preview"
              size={200}
              level="H"
              marginSize={2}
              bgColor={profile.qr_background_color || "#FFFFFF"}
              fgColor={profile.qr_foreground_color || "#000000"}
              style={{
                filter:
                  selectedEffect === "neon" || selectedEffect === "glow"
                    ? "drop-shadow(0 0 8px currentColor) brightness(1.1)"
                    : "none",
                color: profile.qr_foreground_color || "#000000",
              }}
            />
          </div>

          {/* Effects Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Efectos Visuales</h4>
            <div className="grid grid-cols-3 gap-2">
              {EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  onClick={() => setSelectedEffect(effect.effect)}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    selectedEffect === effect.effect
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium">{effect.name}</div>
                  <div className="text-xs text-muted-foreground">{effect.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dots Style Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Estilo de Puntos</h4>
            <div className="grid grid-cols-5 gap-2">
              {DOTS_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedDotsStyle(style.style)}
                  className={`rounded-lg border-2 p-2 text-center transition-all ${
                    selectedDotsStyle === style.style
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-xs font-medium">{style.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
              onClick={handleApplyEffects}
            >
              <Sparkles className="h-4 w-4" />
              Aplicar Efectos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
