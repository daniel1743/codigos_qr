import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Loader2, ImageIcon } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../../../types/database";
import { getBrowserSupabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { ColorControl } from "../ColorControl";

interface PortadaAvatarSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

export function PortadaAvatarSection({ profile, onChange, userId }: PortadaAvatarSectionProps) {
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

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
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
  );
}
