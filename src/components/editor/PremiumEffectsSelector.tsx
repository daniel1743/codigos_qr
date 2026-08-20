import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Crown, Sparkles, Zap } from "lucide-react";
import { PREMIUM_GRADIENTS } from "../../lib/premium-qr-presets";

interface PremiumEffectsSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEffect: (effect: {
    gradient: any;
    effect: string;
    dotsType: string;
  }) => void;
  isPremium: boolean;
}

const PREMIUM_PRESETS = [
  {
    id: "holographic-purple",
    name: "Holográfico Púrpura",
    gradient: PREMIUM_GRADIENTS.holographicPurple,
    effect: "holographic",
    dotsType: "rounded",
    tier: "premium",
    preview: "linear-gradient(45deg, #8B5CF6, #EC4899, #3B82F6, #10B981, #F59E0B)",
  },
  {
    id: "holographic-blue",
    name: "Holográfico Azul",
    gradient: PREMIUM_GRADIENTS.holographicBlue,
    effect: "holographic",
    dotsType: "classy",
    tier: "premium",
    preview: "linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6, #EC4899)",
  },
  {
    id: "metallic-gold",
    name: "Oro Metálico",
    gradient: PREMIUM_GRADIENTS.metallicGold,
    effect: "metallic-gold",
    dotsType: "rounded",
    tier: "premium",
    preview: "linear-gradient(90deg, #FFD700, #FFA500, #FFED4E, #D4AF37, #FFD700)",
  },
  {
    id: "metallic-silver",
    name: "Plata Metálica",
    gradient: PREMIUM_GRADIENTS.metallicSilver,
    effect: "metallic-silver",
    dotsType: "rounded",
    tier: "premium",
    preview: "linear-gradient(90deg, #E8E8E8, #FFFFFF, #C0C0C0, #F0F0F0, #D3D3D3)",
  },
  {
    id: "metallic-rose-gold",
    name: "Oro Rosa Metálico",
    gradient: PREMIUM_GRADIENTS.metallicRoseGold,
    effect: "metallic-gold",
    dotsType: "classy",
    tier: "premium",
    preview: "linear-gradient(45deg, #F4C2C2, #E0A899, #FFD4B8, #F4C2C2)",
  },
  {
    id: "aurora",
    name: "Aurora Boreal",
    gradient: PREMIUM_GRADIENTS.aurora,
    effect: "aurora",
    dotsType: "extra-rounded",
    tier: "premium",
    preview: "linear-gradient(180deg, #00FFA3, #03E1FF, #DC1FFF, #03E1FF, #00FFA3)",
  },
  {
    id: "rainbow-premium",
    name: "Rainbow Premium",
    gradient: PREMIUM_GRADIENTS.rainbowPremium,
    effect: "rainbow",
    dotsType: "classy-rounded",
    tier: "premium",
    preview: "linear-gradient(45deg, #FF0080, #FF00FF, #8000FF, #0080FF, #00FFFF, #00FF80, #80FF00)",
  },
  {
    id: "crystal",
    name: "Cristal",
    gradient: PREMIUM_GRADIENTS.crystal,
    effect: "crystal",
    dotsType: "rounded",
    tier: "premium",
    preview: "radial-gradient(circle, #FFFFFF, #E0F2FE, #BAE6FD, #0EA5E9)",
  },
  {
    id: "sunset-premium",
    name: "Sunset Premium",
    gradient: PREMIUM_GRADIENTS.sunsetPremium,
    effect: "glow",
    dotsType: "classy",
    tier: "premium",
    preview: "linear-gradient(135deg, #FF6B6B, #FFD93D, #FF8E53, #C44569)",
  },
  {
    id: "ocean-premium",
    name: "Ocean Premium",
    gradient: PREMIUM_GRADIENTS.oceanPremium,
    effect: "glow",
    dotsType: "rounded",
    tier: "premium",
    preview: "linear-gradient(180deg, #667EEA, #764BA2, #F093FB, #667EEA)",
  },
  {
    id: "neon-cyberpunk",
    name: "Neón Cyberpunk",
    gradient: PREMIUM_GRADIENTS.neonCyberpunk,
    effect: "neon",
    dotsType: "square",
    tier: "premium",
    preview: "linear-gradient(90deg, #FF00FF, #00FFFF, #FF00FF)",
  },
  {
    id: "emerald-luxury",
    name: "Esmeralda Luxury",
    gradient: PREMIUM_GRADIENTS.emeraldLuxury,
    effect: "glow",
    dotsType: "classy-rounded",
    tier: "premium",
    preview: "radial-gradient(circle, #10B981, #059669, #047857)",
  },
  {
    id: "ruby-luxury",
    name: "Rubí Luxury",
    gradient: PREMIUM_GRADIENTS.rubyLuxury,
    effect: "glow",
    dotsType: "classy-rounded",
    tier: "premium",
    preview: "radial-gradient(circle, #DC2626, #EF4444, #B91C1C)",
  },
  {
    id: "sapphire-luxury",
    name: "Zafiro Luxury",
    gradient: PREMIUM_GRADIENTS.sapphireLuxury,
    effect: "glow",
    dotsType: "classy-rounded",
    tier: "premium",
    preview: "radial-gradient(circle, #3B82F6, #2563EB, #1D4ED8)",
  },
];

export function PremiumEffectsSelector({
  open,
  onOpenChange,
  onSelectEffect,
  isPremium,
}: PremiumEffectsSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Efectos Premium Opulentos
          </DialogTitle>
          <DialogDescription>
            Gradientes holográficos, metálicos y efectos avanzados para tu QR
          </DialogDescription>
        </DialogHeader>

        {!isPremium && (
          <div className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Acceso Premium Requerido</p>
                <p className="text-sm text-amber-700 mt-1">
                  Los efectos holográficos y metálicos están disponibles solo para usuarios Premium
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {PREMIUM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                if (isPremium || preset.tier === "free") {
                  onSelectEffect({
                    gradient: preset.gradient,
                    effect: preset.effect,
                    dotsType: preset.dotsType,
                  });
                  onOpenChange(false);
                }
              }}
              disabled={!isPremium && preset.tier === "premium"}
              className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-transparent bg-card p-4 transition-all hover:border-primary hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Preview */}
              <div className="relative">
                <div
                  className="h-20 w-20 rounded-xl shadow-lg transition-transform group-hover:scale-110"
                  style={{ background: preset.preview }}
                />
                {preset.tier === "premium" && (
                  <div className="absolute -top-2 -right-2">
                    <div className="rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 p-1.5 shadow-lg">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <p className="text-xs font-medium">{preset.name}</p>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>Click en cualquier efecto para aplicarlo a tu QR</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
