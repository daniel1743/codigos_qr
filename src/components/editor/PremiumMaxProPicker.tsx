import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Crown, Sparkles, Check, Palette, Zap } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../../types/database";
import {
  PREMIUM_MAX_PRO_TEMPLATES,
  applyPremiumMaxProTemplate,
  type PremiumTemplate,
} from "../../lib/design/premium-max-pro-templates";
import { ScrollArea } from "../ui/scroll-area";

interface PremiumMaxProPickerProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const CATEGORY_LABELS: Record<PremiumTemplate["category"], string> = {
  luxury: "Lujo",
  minimal: "Minimal",
  artistic: "Artístico",
  modern: "Moderno",
  elegant: "Elegante",
};

const CATEGORY_ICONS: Record<PremiumTemplate["category"], typeof Crown> = {
  luxury: Crown,
  minimal: Zap,
  artistic: Palette,
  modern: Sparkles,
  elegant: Crown,
};

function TemplatePreview({ template }: { template: PremiumTemplate }) {
  const bg = template.config.background_color || "#FFFFFF";
  const btnColor = template.config.button_color?.replace("_NEON", "") || "#000000";
  const btnTextColor = template.config.button_text_color || "#FFFFFF";
  const titleColor = template.config.title_color || "#000000";
  const ringColor = template.config.ring_color || "#000000";

  const isGradient = bg.includes("gradient");
  const radius =
    template.config.button_radius === "full"
      ? "rounded-full"
      : template.config.button_radius === "none"
        ? "rounded-none"
        : "rounded-md";

  return (
    <div
      className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg border border-border/50"
      style={{
        background: bg,
      }}
    >
      {/* Decorative elements */}
      {template.config.decor_particles === "dots" && (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-1 h-1 rounded-full bg-white" />
          <div className="absolute top-8 right-6 w-1.5 h-1.5 rounded-full bg-white" />
          <div className="absolute bottom-6 left-8 w-1 h-1 rounded-full bg-white" />
        </div>
      )}

      {/* Avatar mockup */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 ${template.config.ring_enabled ? "ring-2" : ""}`}
          style={{
            ringColor: template.config.ring_enabled ? ringColor : undefined,
          }}
        />
        <div
          className="text-[8px] font-bold text-center px-2"
          style={{ color: titleColor }}
        >
          {template.name}
        </div>
      </div>

      {/* Button mockups */}
      <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
        <div
          className={`h-6 ${radius} shadow-sm flex items-center px-2 text-[7px] font-semibold`}
          style={{
            backgroundColor: btnColor,
            color: btnTextColor,
          }}
        >
          {template.config.button_style?.includes("image") && (
            <div className="w-3 h-3 rounded-sm bg-white/20 mr-1" />
          )}
          <span className="truncate">Instagram</span>
        </div>
        <div
          className={`h-6 ${radius} shadow-sm flex items-center px-2 text-[7px] font-semibold opacity-80`}
          style={{
            backgroundColor: btnColor,
            color: btnTextColor,
          }}
        >
          {template.config.button_style?.includes("image") && (
            <div className="w-3 h-3 rounded-sm bg-white/20 mr-1" />
          )}
          <span className="truncate">Website</span>
        </div>
      </div>

      {/* Premium badge */}
      <div className="absolute top-2 right-2">
        <div className="bg-amber-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Crown className="w-2 h-2" />
          PRO
        </div>
      </div>
    </div>
  );
}

export function PremiumMaxProPicker({ profile, onChange }: PremiumMaxProPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<PremiumTemplate["category"] | "all">(
    "all",
  );
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  const filteredTemplates =
    selectedCategory === "all"
      ? PREMIUM_MAX_PRO_TEMPLATES
      : PREMIUM_MAX_PRO_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleApplyTemplate = (templateId: string) => {
    const updated = applyPremiumMaxProTemplate(templateId, profile);
    onChange(updated);
    setAppliedTemplate(templateId);

    // Reset applied indicator after 2 seconds
    setTimeout(() => setAppliedTemplate(null), 2000);
  };

  const categories: Array<PremiumTemplate["category"] | "all"> = [
    "all",
    "luxury",
    "minimal",
    "modern",
    "elegant",
    "artistic",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
              Premium Max Pro
              <Badge variant="default" className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                ELITE
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Diseños profesionales inspirados en Envato Elements
            </p>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Categoría</Label>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const Icon = cat !== "all" ? CATEGORY_ICONS[cat] : Sparkles;
              const label = cat === "all" ? "Todos" : CATEGORY_LABELS[cat];

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredTemplates.map((template) => {
          const Icon = CATEGORY_ICONS[template.category];
          const isApplied = appliedTemplate === template.id;

          return (
            <div
              key={template.id}
              className="group relative space-y-2 rounded-xl border border-border/50 bg-card p-3 transition-all hover:border-amber-500/50 hover:shadow-lg"
            >
              {/* Preview */}
              <TemplatePreview template={template} />

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {template.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Apply button */}
                <Button
                  type="button"
                  onClick={() => handleApplyTemplate(template.id)}
                  size="sm"
                  className={`w-full h-8 text-xs font-semibold transition-all ${
                    isApplied
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                  }`}
                  disabled={isApplied}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Aplicado
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Aplicar diseño
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-amber-700">Nota:</span> Estos templates premium
            aplican configuraciones completas de colores, tipografía, botones y decoración. Puedes
            personalizarlos después en cada sección.
          </div>
        </div>
      </div>
    </div>
  );
}
