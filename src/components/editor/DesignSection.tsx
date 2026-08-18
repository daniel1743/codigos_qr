import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertTriangle, PaintBucket, Palette, Sparkles, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import type { Profile } from "../../types/database";

interface DesignSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const THEME_PRESETS = [
  { id: "minimal-light", name: "Minimal", bg: "#FFFFFF", btn: "#111111", text: "#FFFFFF" },
  { id: "midnight", name: "Midnight", bg: "#111827", btn: "#374151", text: "#FFFFFF" },
  { id: "cream", name: "Cream", bg: "#F6E7D8", btn: "#432E16", text: "#FFFFFF" },
  { id: "violet", name: "Violet", bg: "#F5ECFF", btn: "#7C3AED", text: "#FFFFFF" },
  { id: "forest", name: "Forest", bg: "#E2F0CB", btn: "#2D5A27", text: "#FFFFFF" },
];

const GRADIENT_PRESETS = [
  { name: "Sunset", value: "linear-gradient(135deg, #FF7A59, #FF3D81)" },
  { name: "Ocean", value: "linear-gradient(135deg, #2563EB, #06B6D4)" },
  { name: "Aurora", value: "linear-gradient(135deg, #8B5CF6, #22D3EE)" },
  { name: "Midnight", value: "linear-gradient(135deg, #111827, #312E81)" },
  { name: "Cream", value: "linear-gradient(135deg, #F6E7D8, #FFF7ED)" },
];

const NEON_PRESETS = [
  { name: "Neon Purple", bg: "#09090B", btn: "#7C3AED_NEON", text: "#FFFFFF" },
  { name: "Neon Blue", bg: "#09090B", btn: "#3B82F6_NEON", text: "#FFFFFF" },
  { name: "Neon Green", bg: "#022C22", btn: "#10B981_NEON", text: "#FFFFFF" },
];

// Helper para parsear hex a rgb
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Luminancia relativa
function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Contraste (1 a 21)
function getContrastRatio(color1: string, color2: string) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 21; // fallback
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function DesignSection({ profile, onChange }: DesignSectionProps) {
  const [bgTab, setBgTab] = useState<"solid" | "gradient">("solid");

  const rawBg = profile.background_color || "#ffffff";
  const rawBtn = profile.button_color || "#111111";
  const rawBtnText = profile.button_text_color || "#ffffff";

  // Gradient parser
  const gradientRegex = /linear-gradient\(\s*(\d+)deg\s*,\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/;
  const gradientMatch = rawBg.match(gradientRegex);
  
  const isGradient = !!gradientMatch;
  const gradAngle = gradientMatch ? gradientMatch[1] : "135";
  const gradColor1 = gradientMatch ? gradientMatch[2] : "#111111";
  const gradColor2 = gradientMatch ? gradientMatch[3] : "#3B82F6";

  const solidBgColor = isGradient ? "#ffffff" : rawBg;
  const isNeon = rawBtn.endsWith("_NEON");
  const pureBtnColor = isNeon ? rawBtn.replace("_NEON", "") : rawBtn;

  // Warning de contraste
  const contrastWarning = useMemo(() => {
    const ratio = getContrastRatio(pureBtnColor, rawBtnText);
    return ratio < 3.5;
  }, [pureBtnColor, rawBtnText]);

  const handleSolidChange = (val: string) => {
    onChange({ background_color: val });
  };

  const handleGradientChange = (c1: string, c2: string, angle: string) => {
    onChange({ background_color: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
  };

  const applyTheme = (bg: string, btn: string, text: string) => {
    onChange({ background_color: bg, button_color: btn, button_text_color: text });
    if (bg.includes("gradient")) {
      setBgTab("gradient");
    } else {
      setBgTab("solid");
    }
  };

  return (
    <div className="space-y-8 pb-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Diseño</h2>
        <p className="text-sm text-muted-foreground">Personaliza colores y estilo visual.</p>
      </div>

      {/* PRESETS */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Temas Rápidos</Label>
        <ScrollArea className="w-full whitespace-nowrap pb-3 -mx-1 px-1">
          <div className="flex gap-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyTheme(preset.bg, preset.btn, preset.text)}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div 
                  className="w-14 h-20 rounded-xl border-2 border-border shadow-sm flex items-end justify-center p-2 hover:border-primary/50 overflow-hidden relative"
                  style={{ background: preset.bg }}
                >
                  <div className="w-full h-3 rounded-full shadow-sm" style={{ background: preset.btn }}></div>
                </div>
                <span className="text-[10px] font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* BACKGROUND */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-2"><PaintBucket className="w-4 h-4" /> Fondo</Label>
        </div>
        
        <div className="flex p-1 bg-muted rounded-lg mb-4">
          <button 
            onClick={() => { setBgTab("solid"); handleSolidChange(solidBgColor); }}
            className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${bgTab === "solid" && !isGradient ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sólido
          </button>
          <button 
            onClick={() => { setBgTab("gradient"); handleGradientChange(gradColor1, gradColor2, gradAngle); }}
            className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${bgTab === "gradient" || isGradient ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Degradado
          </button>
        </div>

        {(!isGradient && bgTab === "solid") ? (
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={solidBgColor}
              onChange={(e) => handleSolidChange(e.target.value)}
              className="h-12 w-12 shrink-0 cursor-pointer rounded-lg p-1"
            />
            <Input
              type="text"
              value={solidBgColor}
              onChange={(e) => handleSolidChange(e.target.value)}
              className="h-11 min-w-0 flex-1 font-mono uppercase"
              maxLength={7}
            />
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Color 1</Label>
                <div className="flex gap-2">
                  <Input type="color" value={gradColor1} onChange={(e) => handleGradientChange(e.target.value, gradColor2, gradAngle)} className="w-9 h-9 p-0.5 rounded" />
                  <Input type="text" value={gradColor1} onChange={(e) => handleGradientChange(e.target.value, gradColor2, gradAngle)} className="h-10 min-w-0 text-xs uppercase" maxLength={7} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Color 2</Label>
                <div className="flex gap-2">
                  <Input type="color" value={gradColor2} onChange={(e) => handleGradientChange(gradColor1, e.target.value, gradAngle)} className="w-9 h-9 p-0.5 rounded" />
                  <Input type="text" value={gradColor2} onChange={(e) => handleGradientChange(gradColor1, e.target.value, gradAngle)} className="h-10 min-w-0 text-xs uppercase" maxLength={7} />
                </div>
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8 flex justify-between">
                  Degradados sugeridos <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-1">
                 <div className="grid grid-cols-5 gap-2 max-[360px]:grid-cols-3">
                   {GRADIENT_PRESETS.map((gp, i) => (
                     <button
                       key={i}
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

      {/* BUTTONS */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Label className="flex items-center gap-2"><Palette className="w-4 h-4" /> Botones</Label>
        
        <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 min-[430px]:gap-6">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Color de botón</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={pureBtnColor}
                onChange={(e) => onChange({ button_color: isNeon ? `${e.target.value}_NEON` : e.target.value })}
                className="h-11 w-11 cursor-pointer rounded-lg p-1"
              />
              <Input
                type="text"
                value={pureBtnColor}
                onChange={(e) => onChange({ button_color: isNeon ? `${e.target.value}_NEON` : e.target.value })}
                className="h-11 min-w-0 flex-1 font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Texto del botón</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={rawBtnText}
                onChange={(e) => onChange({ button_text_color: e.target.value })}
                className="h-11 w-11 cursor-pointer rounded-lg p-1"
              />
              <Input
                type="text"
                value={rawBtnText}
                onChange={(e) => onChange({ button_text_color: e.target.value })}
                className="h-11 min-w-0 flex-1 font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {contrastWarning && (
          <Alert variant="destructive" className="py-2 px-3 bg-destructive/10 border-destructive/20 text-destructive mt-4 animate-in fade-in zoom-in-95 duration-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">
              Bajo contraste detectado entre el texto y el botón. Podría ser difícil de leer.
            </AlertDescription>
          </Alert>
        )}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs mt-4 h-9">
              Ver Estilos Neón
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
             <div className="grid grid-cols-3 gap-2">
                {NEON_PRESETS.map((neon, i) => (
                  <button
                    key={i}
                    onClick={() => applyTheme(neon.bg, neon.btn, neon.text)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
                  >
                    <div 
                      className="w-full h-6 rounded-md" 
                      style={{ 
                        background: neon.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div className="w-3/4 h-2 rounded-full" style={{ 
                         background: neon.btn.replace("_NEON", ""), 
                         boxShadow: `0 0 8px ${neon.btn.replace("_NEON", "")}` 
                      }}></div>
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground">{neon.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => onChange({ button_color: pureBtnColor })}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg border bg-muted/30 hover:bg-muted transition-colors col-span-3 mt-1"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">Quitar efecto neón del botón actual</span>
                </button>
             </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
