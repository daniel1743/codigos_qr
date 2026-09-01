import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "../../types/database";
import {
  BASIC_EDITOR_FONTS,
  isBasicProfessionalBadgeEnabled,
  updateBasicProfessionalBadge,
} from "../../lib/basic-templates/config";
import { loadGoogleFont } from "../../lib/fonts";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { EDIT_TARGETS } from "../../types/basic-templates";
import { CANONICAL_PUBLIC_ORIGIN } from "../../lib/url";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { ColorControl } from "./ColorControl";

interface ProfileSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
  showProfessionalBadge?: boolean;
}

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RING_COLORS = ["#000000", "#ffffff", "#D4AF37", "#C98A7D", "#1E3A5F", "#B76E9E"];

function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-stone-500">{label}</Label>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`h-10 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${
              value === option.id
                ? "border-[#1d1d1b] bg-[#1d1d1b] text-[#fffefa]"
                : "border-stone-200 bg-[#fffefa] text-stone-600 hover:bg-stone-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FontChips({ value, onChange }: { value: string; onChange: (font: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-stone-500">Fuente</Label>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BASIC_EDITOR_FONTS.map((font) => (
          <button
            key={font}
            type="button"
            aria-pressed={value === font}
            onClick={() => onChange(font)}
            className={`h-10 shrink-0 rounded-lg border px-3 text-[11px] transition-colors ${
              value === font
                ? "border-[#1d1d1b] bg-[#1d1d1b] text-[#fffefa]"
                : "border-stone-200 bg-[#fffefa] text-stone-600 hover:bg-stone-100"
            }`}
            style={{ fontFamily: font }}
          >
            {font}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProfileSection({
  profile,
  onChange,
  userId,
  showProfessionalBadge = false,
}: ProfileSectionProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (profile.title_font_family) loadGoogleFont(profile.title_font_family);
    if (profile.bio_font_family) loadGoogleFont(profile.bio_font_family);
  }, [profile.title_font_family, profile.bio_font_family]);

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

      <div
        data-tool-target={EDIT_TARGETS.avatar}
        className="space-y-3 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
      >
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
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
          Forma del avatar
        </Label>
        <div className="flex gap-2">
          {(["circle", "rounded", "square", "none"] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onChange({ avatar_shape: shape })}
              className={`h-9 flex-1 rounded-lg border text-xs font-medium ${
                (profile.avatar_shape || "circle") === shape
                  ? "border-[#1d1d1b] bg-[#1d1d1b] text-[#fffefa]"
                  : "border-stone-200 text-stone-600"
              }`}
            >
              {{ circle: "Redondo", rounded: "Suave", square: "Cuadrado", none: "Sin avatar" }[shape]}
            </button>
          ))}
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


      <div
        data-tool-target={EDIT_TARGETS.name}
        className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
      >
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
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-stone-500">Color</Label>
            <ColorControl
              value={profile.title_color || "#000000"}
              onChange={(value) => onChange({ title_color: value })}
              compact
            />
          </div>
          <FontChips
            value={profile.title_font_family || profile.font_family || "Inter"}
            onChange={(font) => {
              loadGoogleFont(font);
              onChange({ title_font_family: font });
            }}
          />
          <ChoiceChips
            label="Alineación"
            options={[
              { id: "left", label: "Izquierda" },
              { id: "center", label: "Centro" },
              { id: "right", label: "Derecha" },
            ]}
            value={profile.title_align || "center"}
            onChange={(value) => onChange({ title_align: value })}
          />
          <ChoiceChips
            label="Tamaño"
            options={[
              { id: "sm", label: "S" },
              { id: "md", label: "M" },
              { id: "lg", label: "L" },
            ]}
            value={profile.title_size || "lg"}
            onChange={(value) => onChange({ title_size: value })}
          />
          <ChoiceChips
            label="Peso"
            options={[
              { id: "normal", label: "Normal" },
              { id: "semibold", label: "Semibold" },
              { id: "bold", label: "Bold" },
            ]}
            value={profile.title_weight || "bold"}
            onChange={(value) => onChange({ title_weight: value })}
          />
        </div>
      </div>

      <div
        data-tool-target={EDIT_TARGETS.subtitle}
        className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
      >
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="profession">
          Profesión / subtítulo
        </Label>
        <Input
          id="profession"
          value={profile.profession || ""}
          onChange={(event) => onChange({ profession: event.target.value })}
          placeholder="Ej: Nutricionista"
          maxLength={80}
          className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
        />
        {showProfessionalBadge ? (
          <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-3">
            <div className="space-y-1">
              <Label htmlFor="professional_badge">Mostrar insignia profesional</Label>
              <p className="text-xs text-stone-500">Decorativa; aparece junto a tu profesión.</p>
            </div>
            <Switch
              id="professional_badge"
              checked={isBasicProfessionalBadgeEnabled(profile)}
              onCheckedChange={(checked) => onChange(updateBasicProfessionalBadge(profile, checked))}
            />
          </div>
        ) : null}
      </div>

      <div
        data-tool-target={EDIT_TARGETS.bio}
        className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
      >
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          value={profile.bio || ""}
          onChange={(event) => onChange({ bio: event.target.value })}
          placeholder="Un par de líneas sobre ti o tu negocio"
          maxLength={180}
          className="min-h-28 resize-none rounded-xl border-stone-200 bg-[#fffefa]"
        />
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-stone-500">Color</Label>
            <ColorControl
              value={profile.bio_color || "#000000"}
              onChange={(value) => onChange({ bio_color: value })}
              compact
            />
          </div>
          <FontChips
            value={profile.bio_font_family || profile.font_family || "Inter"}
            onChange={(font) => {
              loadGoogleFont(font);
              onChange({ bio_font_family: font });
            }}
          />
          <ChoiceChips
            label="Alineación"
            options={[
              { id: "left", label: "Izquierda" },
              { id: "center", label: "Centro" },
              { id: "right", label: "Derecha" },
            ]}
            value={profile.bio_align || "center"}
            onChange={(value) => onChange({ bio_align: value })}
          />
          <ChoiceChips
            label="Tamaño"
            options={[
              { id: "sm", label: "S" },
              { id: "md", label: "M" },
              { id: "lg", label: "L" },
            ]}
            value={profile.bio_size || "md"}
            onChange={(value) => onChange({ bio_size: value })}
          />
          <ChoiceChips
            label="Peso"
            options={[
              { id: "normal", label: "Normal" },
              { id: "semibold", label: "Semibold" },
              { id: "bold", label: "Bold" },
            ]}
            value={profile.bio_weight || "normal"}
            onChange={(value) => onChange({ bio_weight: value })}
          />
        </div>
      </div>

      <div
        data-tool-target={EDIT_TARGETS.footer}
        className="space-y-3 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="footer_enabled">
              Pie de página
            </Label>
            <p className="text-xs text-stone-500">Texto al final de tu perfil.</p>
          </div>
          <Switch
            id="footer_enabled"
            checked={profile.footer_enabled || false}
            onCheckedChange={(checked) => onChange({ footer_enabled: checked })}
          />
        </div>
        {profile.footer_enabled ? (
          <Textarea
            id="footer_text"
            value={profile.footer_text || ""}
            onChange={(event) => onChange({ footer_text: event.target.value })}
            placeholder="Ej: Gracias por visitar mi perfil"
            maxLength={255}
            className="min-h-20 resize-none rounded-xl border-stone-200 bg-[#fffefa]"
          />
        ) : null}
      </div>

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]">
        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500" htmlFor="public_alias">Enlace personalizado</Label>
        <div className="flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 text-sm text-stone-500">
            {CANONICAL_PUBLIC_ORIGIN.replace(/^https?:\/\//, "")}/
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
