import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertTriangle, PaintBucket, Palette, ChevronDown, Wand2, ArrowRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { TemplatePicker } from "./TemplatePicker";
import type { Profile, AvatarShape, ProfileLink } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, CircleUserRound, Star, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { SOCIAL_COVER_STYLE_OPTIONS } from "../../constants/social-cover-styles";

interface DesignSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
  links?: Partial<ProfileLink>[];
  onManageLinkImages?: () => void;
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
const QUICK_BTN = ["#111111", "#FFFFFF", "#1F2937", "#1D4ED8", "#0F766E", "#7C3AED"];
const QUICK_TEXT = ["#FFFFFF", "#111111", "#374151"];

const GRADIENT_DIRECTIONS = [
  { label: "↗", value: "135" },
  { label: "↘", value: "45" },
  { label: "→", value: "90" },
  { label: "↓", value: "180" },
  { label: "↑", value: "0" },
  { label: "←", value: "270" },
];

import {
  evaluateContrast,
  getRecommendedTextColor,
  contrastRatio,
  extractSolidHex,
  mixColorsAlpha,
} from "../../lib/color-utils";

import { ColorControl } from "./ColorControl";

function SocialCoverStylePreview({ id }: { id: string }) {
  const base =
    "relative mb-2 block h-8 w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 shadow-sm";

  if (id === "split_capsule") {
    return (
      <span className={base}>
        <span className="absolute inset-0 bg-white" />
        <span className="absolute left-0 top-0 h-full w-12 bg-blue-600" />
      </span>
    );
  }

  if (id === "ribbon_label") {
    return (
      <span className={base}>
        <span className="absolute left-0 top-0 h-full w-12 bg-pink-600 [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "avatar_capsule") {
    return (
      <span className={base}>
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-white bg-slate-200" />
      </span>
    );
  }

  if (id === "solid_subscribe") {
    return (
      <span className={`${base} bg-gradient-to-r from-pink-600 to-rose-500`}>
        <span className="absolute bottom-1 left-4 right-4 h-2 rounded-full bg-white/15" />
        <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-md bg-white/90" />
      </span>
    );
  }

  if (id === "raised_gloss") {
    return (
      <span
        className={`${base} border-2 border-white bg-gradient-to-r from-blue-700 to-cyan-500 shadow-[0_3px_0_rgba(148,163,184,0.8)]`}
      >
        <span className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white" />
        <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent_45%)]" />
      </span>
    );
  }

  if (id === "heart_badge") {
    return (
      <span className={`${base} overflow-visible bg-gradient-to-r from-blue-700 to-pink-500`}>
        <span className="absolute -left-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-2xl bg-blue-600 shadow-sm" />
        <span className="absolute -left-0.5 top-0 h-4 w-4 rounded-full bg-blue-600" />
        <span className="absolute left-3 top-0 h-4 w-4 rounded-full bg-blue-600" />
      </span>
    );
  }

  if (id === "angled_tab") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-r-full border-2 border-blue-600 bg-white shadow-sm">
        <span className="absolute left-0 top-0 h-full w-12 bg-blue-600 [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "leaf_outline") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-[999px_14px_999px_999px] border-2 border-cyan-500 bg-white shadow-sm">
        <span className="absolute left-0 top-0 h-full w-12 rounded-l-full bg-gradient-to-r from-pink-500 to-yellow-400 [clip-path:polygon(0_0,82%_0,100%_50%,82%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "metal_coin") {
    return (
      <span className={`${base} overflow-visible bg-gradient-to-r from-blue-700 to-blue-500`}>
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-[conic-gradient(from_25deg,#f8fafc,#94a3b8,#fff,#64748b,#f8fafc)] shadow-sm" />
      </span>
    );
  }

  if (id === "neon_lumen") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-full bg-gradient-to-r from-slate-950 via-blue-600 to-cyan-400 shadow-sm">
        <span className="absolute -inset-y-6 left-8 w-14 rotate-12 bg-white/30 blur-lg" />
        <span className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white" />
      </span>
    );
  }

  if (id === "glass_orbit") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-[18px] border border-white bg-white shadow-sm">
        <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-30" />
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600" />
      </span>
    );
  }

  return (
    <span className={base}>
      <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600" />
    </span>
  );
}

export function DesignSection({
  profile,
  onChange,
  userId,
  links = [],
  onManageLinkImages,
}: DesignSectionProps) {
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
    // outline, minimal, line
    effectiveFg = rawBtn;
    effectiveBg = bgHex;
    fixProp = "button_color";
  }

  const contrastState = evaluateContrast(effectiveFg, effectiveBg);
  const recommendedFixColor = getRecommendedTextColor(effectiveBg);

  const handleFixContrast = () => {
    onChange({ [fixProp]: recommendedFixColor });
  };

  const supabase = getBrowserSupabaseClient();
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("banners").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("banners").getPublicUrl(filePath);

      onChange({ banner_url: data.publicUrl });
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error subiendo la portada.");
    } finally {
      setUploadingCover(false);
    }
  };

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

  // Mantenemos compatibilidad por si la base de datos trae un botón NEON
  const pureBtnColor = rawBtn.replace("_NEON", "");

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
    <div className="space-y-8 pb-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Diseño</h2>
        <p className="text-sm text-muted-foreground">Personaliza colores y estilo visual.</p>
      </div>

      <TemplatePicker profile={profile} onChange={onChange} />

      {/* SOCIAL COVERS & HERO SOCIAL */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Apariencia Social (Premium)
        </Label>

        <div className="space-y-4 pt-2">
          {/* Social Covers Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Activar Social Covers</Label>
              <p className="text-xs text-muted-foreground">Transforma redes en tarjetas visuales</p>
            </div>
            <Switch
              checked={profile.social_covers_enabled || false}
              onCheckedChange={(checked) => onChange({ social_covers_enabled: checked })}
            />
          </div>

          {profile.social_covers_enabled && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-2 rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Alto premium</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajusta el grosor sin cambiar el largo
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() =>
                        onChange({
                          social_cover_height: Math.max(
                            48,
                            Number(profile.social_cover_height || 64) - 4,
                          ),
                        })
                      }
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={48}
                      max={88}
                      step={2}
                      value={profile.social_cover_height || 64}
                      onChange={(e) =>
                        onChange({
                          social_cover_height: Math.min(
                            88,
                            Math.max(48, Number(e.target.value) || 64),
                          ),
                        })
                      }
                      className="h-9 w-16 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() =>
                        onChange({
                          social_cover_height: Math.min(
                            88,
                            Number(profile.social_cover_height || 64) + 4,
                          ),
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <input
                  type="range"
                  min={48}
                  max={88}
                  step={2}
                  value={profile.social_cover_height || 64}
                  onChange={(e) => onChange({ social_cover_height: Number(e.target.value) || 64 })}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-sm">Modelos premium</Label>
                <p className="text-xs text-muted-foreground">
                  Elige la forma visual de tus botones sociales
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_COVER_STYLE_OPTIONS.map((option) => {
                  const active = (profile.social_cover_style || "badge_left") === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ social_cover_style: option.id })}
                      className={`flex min-h-[88px] flex-col rounded-lg border p-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      <SocialCoverStylePreview id={option.id} />
                      <span
                        className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}
                      >
                        {option.label}
                      </span>
                      <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onManageLinkImages}
                className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-background"
                disabled={!onManageLinkImages}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground">
                    Imagen por enlace
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    Sube una foto propia para el logo de cada botón.
                  </span>
                </span>
                {onManageLinkImages && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </div>
          )}

          <div className="w-full h-px bg-border/50" />

          {/* Hero Social Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Hero Social</Label>
                <p className="text-xs text-muted-foreground">
                  Destaca un enlace como portada superior
                </p>
              </div>
            </div>

            <Select
              value={profile.hero_link_id || "off"}
              onValueChange={(val) => onChange({ hero_link_id: val === "off" ? null : val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar enlace principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">
                  <span className="text-muted-foreground">Desactivado (OFF)</span>
                </SelectItem>
                {links
                  ?.filter((l) => l.id && l.enabled)
                  .map((link) => (
                    <SelectItem key={link.id} value={link.id as string}>
                      {link.label || link.platform}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* PORTADA Y AVATAR */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Label className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Portada y Avatar
        </Label>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Imagen de portada</Label>
          <div className="flex flex-col gap-3">
            {profile.banner_url ? (
              <div className="relative w-full h-24 rounded-lg overflow-hidden border">
                <img
                  src={profile.banner_url}
                  alt="Portada"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-7 px-2 text-xs"
                  onClick={() => onChange({ banner_url: null })}
                >
                  Eliminar
                </Button>
              </div>
            ) : (
              <div className="relative w-full h-24 rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center bg-muted/30">
                <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Sin portada</span>
              </div>
            )}

            <div className="w-full">
              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
                className="h-10 text-xs"
              />
              {uploadingCover && (
                <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border/40">
          <Label className="text-xs text-muted-foreground">Forma del avatar</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ avatar_shape: "circle" })}
              className={`flex-1 h-9 flex flex-col items-center justify-center text-[11px] font-medium border rounded-md transition-all ${profile.avatar_shape === "circle" || !profile.avatar_shape ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              Redondo
            </button>
            <button
              type="button"
              onClick={() => onChange({ avatar_shape: "rounded" })}
              className={`flex-1 h-9 flex flex-col items-center justify-center text-[11px] font-medium border rounded-md transition-all ${profile.avatar_shape === "rounded" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              Cuadrado
            </button>
            <button
              type="button"
              onClick={() => onChange({ avatar_shape: "none" })}
              className={`flex-1 h-9 flex flex-col items-center justify-center text-[11px] font-medium border rounded-md transition-all ${profile.avatar_shape === "none" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              Sin avatar
            </button>
          </div>
        </div>

        {profile.avatar_shape !== "none" && (
          <div className="space-y-3 pt-4 border-t border-border/40">
            <Label className="text-xs text-muted-foreground">Aro del avatar</Label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => onChange({ ring_enabled: false })}
                className={`flex-1 h-9 flex flex-col items-center justify-center text-[11px] font-medium border rounded-md transition-all ${!profile.ring_enabled ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                Sin aro
              </button>
              <button
                type="button"
                onClick={() => onChange({ ring_enabled: true })}
                className={`flex-1 h-9 flex flex-col items-center justify-center text-[11px] font-medium border rounded-md transition-all ${profile.ring_enabled ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                Con aro
              </button>
            </div>

            {profile.ring_enabled && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 bg-muted/30 p-3 rounded-lg border">
                <div className="space-y-3">
                  <Label className="text-[11px] text-muted-foreground">Color del aro</Label>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { name: "Negro", value: "#111111" },
                      { name: "Blanco", value: "#FFFFFF" },
                      { name: "Dorado", value: "#D4AF37" },
                      { name: "Azul", value: "#2563EB" },
                      { name: "Rosa", value: "#EC4899" },
                      { name: "Morado", value: "#7C3AED" },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        aria-label={`Color ${preset.name}`}
                        title={preset.name}
                        onClick={() => onChange({ ring_color: preset.value })}
                        className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-105 ${profile.ring_color?.toUpperCase() === preset.value.toUpperCase() ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                  </div>
                  <ColorControl
                    compact
                    value={profile.ring_color || "#000000"}
                    onChange={(val) => onChange({ ring_color: val })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground">Grosor</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onChange({ ring_thickness: "thin" })}
                      className={`flex-1 h-8 flex flex-col items-center justify-center text-[10px] font-medium border rounded-md transition-all ${profile.ring_thickness === "thin" || !profile.ring_thickness ? "bg-primary/20 text-primary border-primary" : "bg-background text-muted-foreground hover:bg-accent"}`}
                    >
                      Fino
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ring_thickness: "medium" })}
                      className={`flex-1 h-8 flex flex-col items-center justify-center text-[10px] font-medium border rounded-md transition-all ${profile.ring_thickness === "medium" ? "bg-primary/20 text-primary border-primary" : "bg-background text-muted-foreground hover:bg-accent"}`}
                    >
                      Medio
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BACKGROUND */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Label className="flex items-center gap-2">
          <PaintBucket className="w-4 h-4" /> Fondo
        </Label>

        <div className="flex p-1 bg-muted rounded-lg mb-4">
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
                      onClick={() =>
                        handleGradientChange(gradColor1, gradColor2, "linear", dir.value)
                      }
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

      {/* BUTTONS */}
      <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Label className="flex items-center gap-2">
          <Palette className="w-4 h-4" /> Botones
        </Label>

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

        {/* CONTRAST WARNING */}
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

              // Paleta neutral para demos (nunca falla el contraste visual)
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
    </div>
  );
}
