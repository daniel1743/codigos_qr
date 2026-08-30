import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { ColorControl } from "./ColorControl";

interface ProfileSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RING_COLORS = ["#000000", "#ffffff", "#D4AF37", "#C98A7D", "#1E3A5F", "#B76E9E"];

export function ProfileSection({ profile, onChange, userId }: ProfileSectionProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getBrowserSupabaseClient();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato no válido", { description: "Usa JPG, PNG o WEBP." });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Imagen demasiado grande", { description: "El máximo permitido es 3 MB." });
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      onChange({ avatar_url: data.publicUrl });
      toast.success("Avatar subido correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error subiendo la imagen.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Identidad</p>
        <h2 className="text-xl font-bold tracking-[-0.04em] text-[#1d1d1b]">Información del perfil</h2>
        <p className="text-sm text-stone-500">Configura tu avatar y descripción.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="avatar_upload">Avatar</Label>
        <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar actual"
              className="h-16 w-16 rounded-full border-2 border-[#fffefa] object-cover shadow-sm"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-stone-100 text-xs text-stone-500">
              Vacío
            </div>
          )}
          <div className="w-full flex-1">
            <Input
              id="avatar_upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="h-11"
            />
            {uploading && (
              <p
                className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="ring_enabled">Ring del avatar</Label>
            <p className="text-xs text-stone-500">Borde decorativo alrededor del avatar.</p>
          </div>
          <Switch
            id="ring_enabled"
            checked={profile.ring_enabled || false}
            onCheckedChange={(checked) => onChange({ ring_enabled: checked })}
          />
        </div>
        {profile.ring_enabled ? (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-stone-500">Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {RING_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange({ ring_color: color })}
                    aria-label={`Color ${color}`}
                    className={`h-8 w-8 rounded-full border shadow-sm transition-transform hover:scale-105 ${
                      profile.ring_color === color ? "ring-2 ring-[#1d1d1b] ring-offset-1" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <ColorControl
                  value={profile.ring_color || "#000000"}
                  onChange={(value) => onChange({ ring_color: value })}
                  compact
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-stone-500">Grosor</Label>
              <div className="flex gap-2">
                {(["thin", "medium", "thick"] as const).map((thickness) => (
                  <button
                    key={thickness}
                    type="button"
                    onClick={() => onChange({ ring_thickness: thickness })}
                    className={`h-9 flex-1 rounded-lg border text-xs font-medium ${
                      profile.ring_thickness === thickness
                        ? "border-[#1d1d1b] bg-[#1d1d1b] text-[#fffefa]"
                        : "border-stone-200 text-stone-600"
                    }`}
                  >
                    {{ thin: "Fino", medium: "Medio", thick: "Grueso" }[thickness]}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>


      <div className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          value={profile.display_name || ""}
          onChange={(event) => onChange({ display_name: event.target.value })}
          placeholder="Ej: Daniel Falcon"
          maxLength={60}
          className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
          required
        />
      </div>

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          value={profile.bio || ""}
          onChange={(event) => onChange({ bio: event.target.value })}
          placeholder="Un par de líneas sobre ti o tu negocio"
          maxLength={180}
          className="min-h-28 resize-none rounded-xl border-stone-200 bg-[#fffefa]"
        />
      </div>

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="public_alias">Enlace personalizado</Label>
        <div className="flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 text-sm text-stone-500">
            tudominio.com/
          </span>
          <Input
            id="public_alias"
            value={profile.slug || ""}
            onChange={(event) => {
              const value = event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 40);
              onChange({ slug: value });
            }}
            placeholder="mi-perfil"
            className="h-11 rounded-l-none rounded-r-xl border-stone-200 bg-[#fffefa]"
          />
        </div>
      </div>
    </section>
  );
}
