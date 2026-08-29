import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface ProfileSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Información del perfil</h2>
        <p className="text-sm text-muted-foreground">Configura tu avatar y descripción.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar_upload">Avatar</Label>
        <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar actual"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-muted text-xs text-muted-foreground">
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

      <div className="space-y-2">
        <Label htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          value={profile.display_name || ""}
          onChange={(event) => onChange({ display_name: event.target.value })}
          placeholder="Ej: Daniel Falcon"
          maxLength={60}
          className="h-11"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          value={profile.bio || ""}
          onChange={(event) => onChange({ bio: event.target.value })}
          placeholder="Un par de líneas sobre ti o tu negocio"
          maxLength={180}
          className="min-h-28 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="public_alias">Enlace personalizado</Label>
        <div className="flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
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
            className="h-11 rounded-l-none"
          />
        </div>
      </div>
    </section>
  );
}
