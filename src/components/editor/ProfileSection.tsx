import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
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
      console.error(error);
      toast.error("Hubo un error subiendo la imagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Información del Perfil</h2>
        <p className="text-sm text-muted-foreground">Configura tu avatar y descripción.</p>
      </div>

      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="flex flex-col gap-4 min-[380px]:flex-row min-[380px]:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className={`w-16 h-16 object-cover ${profile.avatar_shape === "rounded" || profile.avatar_shape === "square" ? "rounded-xl" : "rounded-full"}`}
            />
          ) : (
            <div
              className={`w-16 h-16 bg-muted flex items-center justify-center ${profile.avatar_shape === "rounded" || profile.avatar_shape === "square" ? "rounded-xl" : "rounded-full"}`}
            >
              <span className="text-xs text-muted-foreground">Vacío</span>
            </div>
          )}
          <div className="w-full flex-1">
            <Input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="h-11"
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
          className="h-11"
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
          className="min-h-28 resize-none"
        />
      </div>
    </div>
  );
}
