import { useState } from "react";
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Profile } from "../../types/database";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ColorControl } from "./ColorControl";

interface DesignSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

const MAX_BANNER_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FONTS = [
  "Inter", "Poppins", "Montserrat", "DM Sans", "Manrope",
  "Raleway", "Nunito", "Lato", "Playfair Display", "Merriweather"
];

function normalizeFusionStrength(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseGradient(val: string | undefined | null) {
  if (!val || !val.includes("linear-gradient")) return null;
  const match = val.match(/linear-gradient\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/);
  if (match) return { dir: match[1], start: match[2], end: match[3] };
  
  const radialMatch = val.match(/radial-gradient\(\s*circle\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/);
  if (radialMatch) return { dir: "radial", start: radialMatch[1], end: radialMatch[2] };
  return null;
}

function buildGradient(dir: string, start: string, end: string) {
  if (dir === "radial") return `radial-gradient(circle, ${start}, ${end})`;
  return `linear-gradient(${dir}, ${start}, ${end})`;
}

export function DesignSection({ profile, onChange, userId }: DesignSectionProps) {
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const supabase = getBrowserSupabaseClient();
  const fusionStrength = normalizeFusionStrength(profile.banner_fusion_strength);

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato no válido", { description: "Usa JPG, PNG o WEBP." });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_BYTES) {
      toast.error("Imagen demasiado grande", { description: "El máximo permitido es 4 MB." });
      event.target.value = "";
      return;
    }

    setUploadingBanner(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/banner-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("banners").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from("banners").getPublicUrl(filePath);
      onChange({ banner_url: data.publicUrl });
      toast.success("Portada subida correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error subiendo la portada.");
    } finally {
      setUploadingBanner(false);
      event.target.value = "";
    }
  };

  const bgGradient = parseGradient(profile.background_color);
  const isBgGradient = bgGradient !== null;
  const btnGradient = parseGradient(profile.button_color);
  const isBtnGradient = btnGradient !== null;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Diseño</h2>
        <p className="text-sm text-muted-foreground">Personaliza colores y portada.</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <Label>Tipografía</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-2">
          {FONTS.map(font => (
            <Button
              key={font}
              variant={profile.font_family === font ? "default" : "outline"}
              onClick={() => onChange({ font_family: font })}
              className="h-10 text-[11px]"
              style={{ fontFamily: font }}
            >
              {font}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <Label>Botones</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          <Button variant={profile.button_radius === "none" && profile.button_style !== "soft" ? "default" : "outline"} onClick={() => onChange({ button_radius: "none", button_style: "solid" })} className="rounded-none h-10 text-xs">Cuadrado</Button>
          <Button variant={profile.button_radius === "rounded" && profile.button_style !== "soft" ? "default" : "outline"} onClick={() => onChange({ button_radius: "rounded", button_style: "solid" })} className="rounded-xl h-10 text-xs">Redondeado</Button>
          <Button variant={profile.button_radius === "full" && profile.button_style !== "soft" ? "default" : "outline"} onClick={() => onChange({ button_radius: "full", button_style: "solid" })} className="rounded-full h-10 text-xs">Píldora</Button>
          <Button variant={profile.button_style === "soft" ? "default" : "outline"} onClick={() => onChange({ button_radius: "full", button_style: "soft" })} className="rounded-full border border-transparent shadow-sm h-10 text-xs">Premium</Button>
        </div>

        <Label>Separación</Label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button variant={profile.theme_spacing === "compact" ? "default" : "outline"} onClick={() => onChange({ theme_spacing: "compact" })} className="h-10 text-xs">Compacto</Button>
          <Button variant={!profile.theme_spacing || profile.theme_spacing === "standard" ? "default" : "outline"} onClick={() => onChange({ theme_spacing: "standard" })} className="h-10 text-xs">Normal</Button>
          <Button variant={profile.theme_spacing === "generous" ? "default" : "outline"} onClick={() => onChange({ theme_spacing: "generous" })} className="h-10 text-xs">Amplio</Button>
        </div>

        <Label>Grosor de borde</Label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <Button variant={!profile.button_border_thickness || profile.button_border_thickness === "none" ? "default" : "outline"} onClick={() => onChange({ button_border_thickness: "none" })} className="h-10 text-[10px] px-1">Ninguno</Button>
          <Button variant={profile.button_border_thickness === "thin" ? "default" : "outline"} onClick={() => onChange({ button_border_thickness: "thin" })} className="h-10 text-[10px] px-1">Fino</Button>
          <Button variant={profile.button_border_thickness === "medium" ? "default" : "outline"} onClick={() => onChange({ button_border_thickness: "medium" })} className="h-10 text-[10px] px-1">Medio</Button>
          <Button variant={profile.button_border_thickness === "strong" ? "default" : "outline"} onClick={() => onChange({ button_border_thickness: "strong" })} className="h-10 text-[10px] px-1">Marcado</Button>
        </div>
        
        {profile.button_border_thickness && profile.button_border_thickness !== "none" && (
          <div className="mt-4">
            <Label className="text-xs mb-2 block">Color del borde</Label>
            <ColorControl value={profile.button_border_color || "#000000"} onChange={(v) => onChange({ button_border_color: v })} compact />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <Label>Fondo</Label>
            <div className="flex gap-2 mt-2 mb-4">
              <Button variant={!isBgGradient ? "default" : "outline"} onClick={() => onChange({ background_color: "#ffffff" })} className="flex-1 h-9 text-xs">Sólido</Button>
              <Button variant={isBgGradient ? "default" : "outline"} onClick={() => onChange({ background_color: buildGradient("180deg", "#ffffff", "#f0f0f0") })} className="flex-1 h-9 text-xs">Degradado</Button>
            </div>
          </div>
          
          {!isBgGradient ? (
             <div>
               <Label className="text-xs mb-2 block text-muted-foreground">Color de fondo</Label>
               <ColorControl value={profile.background_color || "#ffffff"} onChange={(v) => onChange({ background_color: v })} compact />
             </div>
          ) : (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-2 block text-muted-foreground">Color 1</Label>
                    <ColorControl value={bgGradient?.start || "#ffffff"} onChange={(v) => onChange({ background_color: buildGradient(bgGradient?.dir || "180deg", v, bgGradient?.end || "#f0f0f0") })} compact />
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block text-muted-foreground">Color 2</Label>
                    <ColorControl value={bgGradient?.end || "#f0f0f0"} onChange={(v) => onChange({ background_color: buildGradient(bgGradient?.dir || "180deg", bgGradient?.start || "#ffffff", v) })} compact />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block text-muted-foreground">Dirección</Label>
                  <select
                    className="w-full rounded-md border p-2 text-sm"
                    value={bgGradient?.dir || "180deg"}
                    onChange={(e) => onChange({ background_color: buildGradient(e.target.value, bgGradient?.start || "#ffffff", bgGradient?.end || "#f0f0f0") })}
                  >
                    <option value="180deg">Vertical</option>
                    <option value="90deg">Horizontal</option>
                    <option value="135deg">Diagonal</option>
                    <option value="45deg">Diagonal inversa</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
             </div>
          )}
        </div>

        <div className="space-y-4 mt-4 border-t pt-4">
           <Label>Color del botón</Label>
           <div className="flex gap-2 mt-2 mb-4">
              <Button variant={!isBtnGradient ? "default" : "outline"} onClick={() => onChange({ button_color: "#111111" })} className="flex-1 h-9 text-xs">Sólido</Button>
              <Button variant={isBtnGradient ? "default" : "outline"} onClick={() => onChange({ button_color: buildGradient("180deg", "#333333", "#111111") })} className="flex-1 h-9 text-xs">Degradado</Button>
           </div>

           {!isBtnGradient ? (
             <div>
               <Label className="text-xs mb-2 block text-muted-foreground">Color principal</Label>
               <ColorControl value={profile.button_color || "#111111"} onChange={(v) => onChange({ button_color: v })} compact />
             </div>
          ) : (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-2 block text-muted-foreground">Color 1</Label>
                    <ColorControl value={btnGradient?.start || "#333333"} onChange={(v) => onChange({ button_color: buildGradient(btnGradient?.dir || "180deg", v, btnGradient?.end || "#111111") })} compact />
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block text-muted-foreground">Color 2</Label>
                    <ColorControl value={btnGradient?.end || "#111111"} onChange={(v) => onChange({ button_color: buildGradient(btnGradient?.dir || "180deg", btnGradient?.start || "#333333", v) })} compact />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block text-muted-foreground">Dirección</Label>
                  <select
                    className="w-full rounded-md border p-2 text-sm"
                    value={btnGradient?.dir || "180deg"}
                    onChange={(e) => onChange({ button_color: buildGradient(e.target.value, btnGradient?.start || "#333333", btnGradient?.end || "#111111") })}
                  >
                    <option value="180deg">Vertical</option>
                    <option value="90deg">Horizontal</option>
                    <option value="135deg">Diagonal</option>
                    <option value="45deg">Diagonal inversa</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
             </div>
          )}
        </div>
        
        <div className="space-y-2 mt-4 border-t pt-4">
          <Label htmlFor="button_text_color">Texto del botón</Label>
          <div className="mt-2">
            <ColorControl value={profile.button_text_color || "#ffffff"} onChange={(v) => onChange({ button_text_color: v })} compact />
          </div>
        </div>
      </div>
      
      {/* Portada section moved to bottom to fit logical layout of Colors > Banner */}
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Portada
        </Label>
        {profile.banner_url ? (
          <img
            src={profile.banner_url}
            alt="Portada actual"
            className="h-28 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="grid h-28 w-full place-items-center rounded-lg bg-muted text-sm text-muted-foreground">
            Sin portada
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-[1fr_auto]">
          <Input
            id="banner_upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleBannerUpload}
            disabled={uploadingBanner}
            className="h-11"
          />
          {profile.banner_url && (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl text-destructive hover:text-destructive"
              onClick={() => onChange({ banner_url: null })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
        <div className="mt-4">
           <div className="flex items-center justify-between gap-4 mb-2">
             <Label htmlFor="banner_fusion_strength">Difuminación</Label>
             <span className="text-sm font-medium tabular-nums">{fusionStrength}</span>
           </div>
           <Input
             id="banner_fusion_strength"
             type="range"
             min={0}
             max={100}
             step={1}
             value={fusionStrength}
             onChange={(event) =>
               onChange({ banner_fusion_strength: normalizeFusionStrength(event.target.value) })
             }
             className="h-11"
           />
        </div>
      </div>
    </section>
  );
}
