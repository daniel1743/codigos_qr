import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ProfileSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
}

export function ProfileSection({ profile, onChange, userId }: ProfileSectionProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getBrowserSupabaseClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      onChange({ avatar_url: data.publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Hubo un error subiendo la imagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Información del Perfil</h2>

      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Vacío</span>
            </div>
          )}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            {uploading && (
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          value={profile.display_name || ""}
          onChange={(e) => onChange({ display_name: e.target.value })}
          placeholder="Ej: Daniel Falcon"
          maxLength={60}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Descripción / Biografía</Label>
        <Textarea
          id="bio"
          value={profile.bio || ""}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="Un par de líneas sobre ti o tu negocio"
          maxLength={180}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL de tu página)</Label>
        <Input
          id="slug"
          value={profile.slug || ""}
          onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
          placeholder="ejemplo-slug"
          required
        />
        <p className="text-xs text-muted-foreground">Esta será la ruta de tu código QR.</p>
      </div>
    </div>
  );
}
