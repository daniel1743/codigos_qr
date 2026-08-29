import { useState } from "react";
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Profile } from "../../types/database";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface DesignSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

const MAX_BANNER_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function normalizeFusionStrength(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
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

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Diseño</h2>
        <p className="text-sm text-muted-foreground">Personaliza colores y portada.</p>
      </div>

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
              aria-label="Eliminar portada"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
        {uploadingBanner && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo portada...
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="banner_fusion_strength">Difuminación del banner</Label>
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

      <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 shadow-sm min-[420px]:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="background_color">Color de fondo</Label>
          <Input
            id="background_color"
            type="color"
            value={profile.background_color || "#ffffff"}
            onChange={(event) => onChange({ background_color: event.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="button_color">Color del botón</Label>
          <Input
            id="button_color"
            type="color"
            value={profile.button_color || "#111111"}
            onChange={(event) => onChange({ button_color: event.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="button_text_color">Texto del botón</Label>
          <Input
            id="button_text_color"
            type="color"
            value={profile.button_text_color || "#ffffff"}
            onChange={(event) => onChange({ button_text_color: event.target.value })}
            className="h-11"
          />
        </div>
      </div>
    </section>
  );
}
