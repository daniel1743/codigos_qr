import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import { toast } from "sonner";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { useState } from "react";
import { Loader2, Bold, Italic } from "lucide-react";

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

      <div className="space-y-2 mt-8 pt-6 border-t border-border/50">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">Descripción / Biografía</Label>
        </div>
        <div className="border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden bg-background">
          <div className="flex items-center border-b px-2 py-1 bg-muted/50 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              aria-label="Negrita"
              title="Negrita"
              onClick={() => {
                const textarea = document.getElementById("bio") as HTMLTextAreaElement;
                if (!textarea) return;

                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = profile.bio || "";

                let newText = "";
                if (start === end) {
                  newText = text.substring(0, start) + "**texto**" + text.substring(end);
                  onChange({ bio: newText });
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 2, start + 7);
                  }, 0);
                } else {
                  newText =
                    text.substring(0, start) +
                    "**" +
                    text.substring(start, end) +
                    "**" +
                    text.substring(end);
                  onChange({ bio: newText });
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start, end + 4);
                  }, 0);
                }
              }}
            >
              <Bold className="w-4 h-4 mr-1" />
              <span className="text-xs">Negrita</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              aria-label="Cursiva"
              title="Cursiva"
              onClick={() => {
                const textarea = document.getElementById("bio") as HTMLTextAreaElement;
                if (!textarea) return;

                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = profile.bio || "";

                let newText = "";
                if (start === end) {
                  newText = text.substring(0, start) + "*texto*" + text.substring(end);
                  onChange({ bio: newText });
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 1, start + 6);
                  }, 0);
                } else {
                  newText =
                    text.substring(0, start) +
                    "*" +
                    text.substring(start, end) +
                    "*" +
                    text.substring(end);
                  onChange({ bio: newText });
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start, end + 2);
                  }, 0);
                }
              }}
            >
              <Italic className="w-4 h-4 mr-1" />
              <span className="text-xs">Cursiva</span>
            </Button>
            <span className="text-xs text-muted-foreground ml-auto pr-2 hidden sm:inline">
              Formato Markdown (*cursiva*, **negrita**)
            </span>
          </div>
          <Textarea
            id="bio"
            value={profile.bio || ""}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Un par de líneas sobre ti o tu negocio"
            maxLength={180}
            className="min-h-28 resize-none border-0 focus-visible:ring-0 rounded-none shadow-none"
          />
        </div>
        <div className="space-y-2 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Grosor de Negrita (Resaltado)</span>
            <span className="font-semibold text-primary capitalize">
              {profile.bio_bold_weight === "medium"
                ? "Medio (500)"
                : profile.bio_bold_weight === "semibold"
                  ? "Seminegrita (600)"
                  : profile.bio_bold_weight === "extrabold"
                    ? "Extra Negrita (800)"
                    : profile.bio_bold_weight === "black"
                      ? "Super Negra (900)"
                      : "Negrita (700) (Normal)"}
            </span>
          </div>
          <Slider
            min={0}
            max={4}
            step={1}
            value={[
              profile.bio_bold_weight === "medium"
                ? 0
                : profile.bio_bold_weight === "semibold"
                  ? 1
                  : profile.bio_bold_weight === "extrabold"
                    ? 3
                    : profile.bio_bold_weight === "black"
                      ? 4
                      : 2,
            ]}
            onValueChange={(val) => {
              const weights = ["medium", "semibold", "bold", "extrabold", "black"];
              const selectedWeight = weights[val[0]] || "bold";
              onChange({ bio_bold_weight: selectedWeight });
            }}
            className="py-2"
          />
        </div>
      </div>

      <div className="space-y-2 mt-8 pt-6 border-t border-border/50">
        <h3 className="font-semibold flex items-center gap-2">Enlace personalizado</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Usa un nombre corto y fácil de recordar para compartirlo en Instagram, TikTok o tarjetas.
        </p>
        <div className="flex rounded-md shadow-sm mt-3">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
            tudominio.com/
          </span>
          <Input
            id="public_alias"
            value={profile.slug || ""}
            onChange={(e) => {
              const val = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 40);
              onChange({ slug: val });
            }}
            placeholder="fusion"
            className="rounded-l-none h-11"
            aria-label="Enlace personalizado"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Si cambias tu enlace personalizado, el enlace anterior dejará de funcionar. Tu QR físico
          seguirá funcionando siempre porque usa su identificador estable.
        </p>
      </div>
      <div className="space-y-4 mt-8 pt-6 border-t border-border/50">
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Pie de página</Label>
            <p className="text-[13px] text-muted-foreground">
              Muestra un mensaje pequeño al final de tu perfil (ej: "Creado por Juan").
            </p>
          </div>
          <Switch
            checked={profile.footer_enabled || false}
            onCheckedChange={(checked) => onChange({ footer_enabled: checked })}
            aria-label="Activar Pie de página"
          />
        </div>

        {profile.footer_enabled && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label htmlFor="footer_text">Mensaje del Pie de página</Label>
            <Input
              id="footer_text"
              value={profile.footer_text || ""}
              onChange={(e) => onChange({ footer_text: e.target.value })}
              placeholder="Ej: Creado con amor por Fusion QR"
              maxLength={80}
              className="h-11"
            />
          </div>
        )}
      </div>
    </div>
  );
}
