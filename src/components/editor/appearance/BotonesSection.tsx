import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { AlertTriangle, Wand2 } from "lucide-react";
import type { Profile } from "../../../types/database";
import { ColorControl } from "../ColorControl";
import {
  evaluateContrast,
  getRecommendedTextColor,
  extractSolidHex,
  mixColorsAlpha,
} from "../../../lib/color-utils";

interface BotonesSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const QUICK_BTN = ["#111111", "#FFFFFF", "#1F2937", "#1D4ED8", "#0F766E", "#7C3AED"];
const QUICK_TEXT = ["#FFFFFF", "#111111", "#374151"];

export function BotonesSection({ profile, onChange }: BotonesSectionProps) {
  const rawBg = profile.background_color || "#ffffff";
  const rawBtn = profile.button_color || "#111111";
  const rawBtnText = profile.button_text_color || "#ffffff";

  const bgHex = extractSolidHex(rawBg);
  const buttonStyle = profile.button_style || "solid";
  let effectiveFg = rawBtn;
  let effectiveBg = bgHex;
  let fixProp: "button_color" | "button_text_color" = "button_color";

  if (buttonStyle === "solid" || buttonStyle === "pill") {
    effectiveFg = rawBtnText;
    effectiveBg = rawBtn;
    fixProp = "button_text_color";
  } else if (buttonStyle === "soft") {
    effectiveFg = rawBtn;
    effectiveBg = mixColorsAlpha(rawBtn, bgHex, 0.08);
    fixProp = "button_color";
  } else if (buttonStyle === "card") {
    effectiveFg = rawBtn;
    effectiveBg = mixColorsAlpha("#FFFFFF", bgHex, 0.9);
    fixProp = "button_color";
  } else {
    effectiveFg = rawBtn;
    effectiveBg = bgHex;
    fixProp = "button_color";
  }

  const contrastState = evaluateContrast(effectiveFg, effectiveBg);
  const recommendedFixColor = getRecommendedTextColor(effectiveBg);

  const handleFixContrast = () => {
    onChange({ [fixProp]: recommendedFixColor });
  };

  const pureBtnColor = rawBtn.replace("_NEON", "");

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-6 min-[430px]:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Color de botón</Label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {QUICK_BTN.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Botón color ${color}`}
                title={color}
                onClick={() => onChange({ button_color: color })}
                className={`w-6 h-6 rounded-md border shadow-sm transition-transform hover:scale-105 ${pureBtnColor.toUpperCase() === color.toUpperCase() ? "ring-2 ring-primary ring-offset-1" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <ColorControl
            compact
            value={pureBtnColor}
            onChange={(val) => onChange({ button_color: val })}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Texto del botón</Label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {QUICK_TEXT.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Texto color ${color}`}
                title={color}
                onClick={() => onChange({ button_text_color: color })}
                className={`w-6 h-6 rounded-md border shadow-sm transition-transform hover:scale-105 ${rawBtnText.toUpperCase() === color.toUpperCase() ? "ring-2 ring-primary ring-offset-1" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <ColorControl
            compact
            value={rawBtnText}
            onChange={(val) => onChange({ button_text_color: val })}
          />
        </div>
      </div>

      {contrastState !== "PASS" && (
        <Alert
          variant="default"
          className={`mt-4 border ${contrastState === "POOR" ? "bg-red-50 text-red-900 border-red-200" : "bg-amber-50 text-amber-900 border-amber-200"}`}
        >
          <AlertTriangle
            className={`w-4 h-4 ${contrastState === "POOR" ? "text-red-600" : "text-amber-600"}`}
          />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] ml-1 gap-2">
            <span>
              Contraste {contrastState === "POOR" ? "muy bajo" : "bajo"}. El texto puede ser
              difícil de leer.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFixContrast}
              className="h-6 text-[10px] px-2 shrink-0 bg-white hover:bg-muted"
            >
              <Wand2 className="w-3 h-3 mr-1" /> Usar color recomendado
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 pt-4 mt-4 border-t border-border/40">
        <Label className="text-xs text-muted-foreground">Forma del botón</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ button_radius: "none" })}
            className={`flex-1 h-9 flex items-center justify-center text-xs font-medium border transition-all ${profile.button_radius === "none" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            Recto
          </button>
          <button
            type="button"
            onClick={() => onChange({ button_radius: "rounded" })}
            className={`flex-1 h-9 flex items-center justify-center text-xs font-medium border rounded-md transition-all ${profile.button_radius === "rounded" || !profile.button_radius ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            Curvo
          </button>
          <button
            type="button"
            onClick={() => onChange({ button_radius: "full" })}
            className={`flex-1 h-9 flex items-center justify-center text-xs font-medium border rounded-full transition-all ${profile.button_radius === "full" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            Píldora
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-4 mt-4 border-t border-border/40">
        <Label className="text-xs text-muted-foreground">Separación entre botones</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "compact", label: "Juntos", preview: "gap-0.5" },
            { id: "standard", label: "Normal", preview: "gap-1.5" },
            { id: "generous", label: "Separados", preview: "gap-3" },
          ].map((option) => {
            const isActive = (profile.theme_spacing || "standard") === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange({ theme_spacing: option.id })}
                className={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border p-2 text-xs font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <div className={`mb-2 flex w-full max-w-[64px] flex-col ${option.preview}`}>
                  <span className="h-2 rounded-full bg-current opacity-80" />
                  <span className="h-2 rounded-full bg-current opacity-55" />
                  <span className="h-2 rounded-full bg-current opacity-35" />
                </div>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 pt-4 mt-4 border-t border-border/40">
        <Label className="text-xs text-muted-foreground">Estilo de enlaces</Label>
        <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3">
          {[
            { id: "solid", label: "Sólido" },
            { id: "outline", label: "Outline" },
            { id: "soft", label: "Soft" },
            { id: "pill", label: "Pill" },
            { id: "minimal", label: "Minimal" },
            { id: "line", label: "Line" },
            { id: "card", label: "Card" },
            { id: "premium_image_right", label: "Pro Max: Derecha" },
            { id: "premium_image_left", label: "Pro Max: Izquierda" },
            { id: "premium_detail_arrow", label: "Pro Max: Detalle" },
            { id: "premium_classic_card", label: "Pro Max: Tarjeta" },
            { id: "premium_minimal_badge", label: "Pro Max: Badge" },
          ].map((style) => {
            const isActive = (profile.button_style || "solid") === style.id;

            const demoBtn = "#111827";
            const demoText = "#FFFFFF";
            const demoSoft = "#F1F5F9";
            const demoBorder = "#CBD5E1";

            let btnClass =
              "flex items-center justify-center gap-2 h-10 w-full text-[10px] font-medium transition-all ";
            let btnStyle: React.CSSProperties = {};

            const radiusClass =
              style.id === "pill"
                ? "rounded-full"
                : profile.button_radius === "none"
                  ? "rounded-none"
                  : profile.button_radius === "full"
                    ? "rounded-full"
                    : "rounded-md";

            if (style.id === "solid" || style.id === "pill") {
              btnClass += `${radiusClass} border border-transparent shadow-sm`;
              btnStyle = { backgroundColor: demoBtn, color: demoText };
            } else if (style.id === "outline") {
              btnClass += `${radiusClass} border-2 bg-transparent`;
              btnStyle = { borderColor: demoBtn, color: demoBtn };
            } else if (style.id === "soft") {
              btnClass += `${radiusClass} border border-transparent`;
              btnStyle = { backgroundColor: demoSoft, color: demoBtn };
            } else if (style.id === "minimal") {
              btnClass += `${radiusClass} bg-transparent border-transparent`;
              btnStyle = { color: demoBtn };
            } else if (style.id === "line") {
              btnClass += `rounded-none border-b bg-transparent justify-start px-2`;
              btnStyle = { borderBottomColor: demoBorder, color: demoBtn };
            } else if (style.id === "card") {
              btnClass += `${radiusClass} bg-white shadow-sm border`;
              btnStyle = { color: demoBtn, borderColor: demoBorder };
            }

            return (
              <button
                key={style.id}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  onChange({
                    button_style: style.id as any,
                  })
                }
                className={`flex flex-col gap-2 p-2 rounded-xl border transition-all ${isActive ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card hover:bg-accent border-border"}`}
              >
                <div className="w-full bg-muted/30 rounded-lg p-2 flex items-center justify-center">
                  <div className={btnClass} style={btnStyle}>
                    {style.id === "card" && (
                      <div className="w-3 h-3 rounded-sm bg-current opacity-20" />
                    )}
                    {style.id === "line" && (
                      <div className="w-3 h-3 rounded-sm bg-current opacity-20" />
                    )}
                    <span>{style.label}</span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium text-center w-full ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
