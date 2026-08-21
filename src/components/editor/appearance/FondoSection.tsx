import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../../../types/database";
import { ColorControl } from "../ColorControl";
import { extractSolidHex } from "../../../lib/color-utils";

interface FondoSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const GRADIENT_PRESETS = [
  { name: "Ocean", value: "linear-gradient(135deg, #2563EB, #06B6D4)" },
  { name: "Sunset", value: "linear-gradient(135deg, #FB7185, #FDBA74)" },
  { name: "Lavender", value: "linear-gradient(135deg, #8B5CF6, #C4B5FD)" },
  { name: "Midnight", value: "linear-gradient(135deg, #111827, #312E81)" },
  { name: "Warm", value: "linear-gradient(135deg, #F2E4D5, #FFF7ED)" },
  { name: "Forest", value: "linear-gradient(135deg, #14532D, #0F766E)" },
];

const QUICK_BG = ["#FFFFFF", "#F7F7F5", "#F4EFE8", "#ECEAE5", "#EEF4FF", "#111111"];

const GRADIENT_DIRECTIONS = [
  { label: "↗", value: "135" },
  { label: "↘", value: "45" },
  { label: "→", value: "90" },
  { label: "↓", value: "180" },
  { label: "↑", value: "0" },
  { label: "←", value: "270" },
];

export function FondoSection({ profile, onChange }: FondoSectionProps) {
  const rawBg = profile.background_color || "#ffffff";
  const bgHex = extractSolidHex(rawBg);

  const linearRegex =
    /linear-gradient\(\s*(\d+)deg\s*,\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/;
  const radialRegex =
    /radial-gradient\(\s*circle\s*,\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/;

  const linearMatch = rawBg.match(linearRegex);
  const radialMatch = rawBg.match(radialRegex);

  const isGradient = !!linearMatch || !!radialMatch;
  const gradType = radialMatch ? "radial" : "linear";
  const gradAngle = linearMatch ? linearMatch[1] || "135" : "135";
  const gradColor1 = linearMatch
    ? linearMatch[2] || "#111111"
    : radialMatch
      ? radialMatch[1] || "#111111"
      : "#111111";
  const gradColor2 = linearMatch
    ? linearMatch[3] || "#3B82F6"
    : radialMatch
      ? radialMatch[2] || "#3B82F6"
      : "#3B82F6";

  const [bgTab, setBgTab] = useState<"solid" | "gradient">(isGradient ? "gradient" : "solid");
  const solidBgColor = isGradient ? "#ffffff" : rawBg;

  const handleSolidChange = (val: string) => {
    onChange({ background_color: val });
  };

  const handleGradientChange = (
    c1: string,
    c2: string,
    type: "linear" | "radial",
    angle: string,
  ) => {
    if (type === "radial") {
      onChange({ background_color: `radial-gradient(circle, ${c1}, ${c2})` });
    } else {
      onChange({ background_color: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => {
            setBgTab("solid");
            handleSolidChange(solidBgColor);
          }}
          className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${bgTab === "solid" && !isGradient ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sólido
        </button>
        <button
          type="button"
          onClick={() => {
            setBgTab("gradient");
            handleGradientChange(gradColor1, gradColor2, gradType, gradAngle);
          }}
          className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${bgTab === "gradient" || isGradient ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Degradado
        </button>
      </div>

      {!isGradient && bgTab === "solid" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 pb-1">
            {QUICK_BG.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Fondo color ${color}`}
                title={color}
                onClick={() => handleSolidChange(color)}
                className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-105 ${solidBgColor.toUpperCase() === color.toUpperCase() ? "ring-2 ring-primary ring-offset-2" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <ColorControl value={solidBgColor} onChange={handleSolidChange} />
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Color 1</Label>
              <ColorControl
                compact
                value={gradColor1}
                onChange={(val) => handleGradientChange(val, gradColor2, gradType, gradAngle)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Color 2</Label>
              <ColorControl
                compact
                value={gradColor2}
                onChange={(val) => handleGradientChange(gradColor1, val, gradType, gradAngle)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleGradientChange(gradColor1, gradColor2, "linear", gradAngle)}
                className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${gradType === "linear" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                Lineal
              </button>
              <button
                type="button"
                onClick={() => handleGradientChange(gradColor1, gradColor2, "radial", gradAngle)}
                className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${gradType === "radial" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                Radial
              </button>
            </div>
          </div>

          {gradType === "linear" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dirección</Label>
              <div className="flex gap-1">
                {GRADIENT_DIRECTIONS.map((dir) => (
                  <button
                    key={dir.value}
                    type="button"
                    onClick={() => handleGradientChange(gradColor1, gradColor2, "linear", dir.value)}
                    className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${gradAngle === dir.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  >
                    {dir.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground h-8 flex justify-between"
              >
                Degradados sugeridos <ChevronDown className="w-3 h-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid grid-cols-6 gap-2 max-[360px]:grid-cols-3">
                {GRADIENT_PRESETS.map((gp, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Degradado ${gp.name}`}
                    title={gp.name}
                    onClick={() => onChange({ background_color: gp.value })}
                    className="h-8 rounded-md shadow-sm border border-border/50 hover:scale-105 transition-transform"
                    style={{ background: gp.value }}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
