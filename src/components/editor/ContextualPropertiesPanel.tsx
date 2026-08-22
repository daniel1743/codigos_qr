import { useState, type ChangeEvent } from "react";
import { Bold, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LinkImageMode, Profile, ProfileLink } from "../../types/database";
import type { EditorTarget } from "../../routes/editor";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { ColorControl } from "./ColorControl";
import { TemplatePicker } from "./TemplatePicker";
import { PremiumMaxProPicker } from "./PremiumMaxProPicker";
import { ShareSection } from "./ShareSection";
import { PlatformPicker } from "../profile/PlatformPicker";
import { getPlatformDef } from "../../constants/platforms";
import { BotonesSection } from "./appearance/BotonesSection";
import { DecoracionSection } from "./appearance/DecoracionSection";
import { SocialCoversSection } from "./appearance/SocialCoversSection";

interface ContextualPropertiesPanelProps {
  selectedTarget: EditorTarget | null;
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
  userId: string;
  publicId: string;
  published: boolean;
  saving: boolean;
  isValid: boolean;
  onProfileChange: (updates: Partial<Profile>) => void;
  onLinksChange: (links: Partial<ProfileLink>[]) => void;
  onSave: (publish: boolean) => void;
  onSelectTarget: (target: EditorTarget) => void;
}

const titleSizes = ["sm", "md", "lg", "xl"] as const;
const bioSizes = ["sm", "md", "lg"] as const;
const textWeights = ["light", "normal", "semibold", "bold"] as const;
const alignments = ["left", "center", "right"] as const;
const fonts = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Manrope",
  "Playfair Display",
  "Lora",
  "Bebas Neue",
  "Caveat",
];

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`min-h-9 rounded-md border px-2 text-xs font-medium transition-colors ${
              value === option.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ContextualPropertiesPanel({
  selectedTarget,
  profile,
  links,
  userId,
  publicId,
  published,
  saving,
  isValid,
  onProfileChange,
  onLinksChange,
  onSave,
  onSelectTarget,
}: ContextualPropertiesPanelProps) {
  const supabase = getBrowserSupabaseClient();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLinkImageId, setUploadingLinkImageId] = useState<string | null>(null);

  const updateLink = (linkId: string, updates: Partial<ProfileLink>) => {
    onLinksChange(links.map((link) => (link.id === linkId ? { ...link, ...updates } : link)));
  };

  const addLink = () => {
    if (links.length >= 8) return;
    const newLink: Partial<ProfileLink> = {
      id: `temp-${Date.now()}`,
      platform: "website",
      label: "Mi Enlace",
      url: "",
      enabled: true,
      sort_order: links.length,
    };
    onLinksChange([...links, newLink]);
    onSelectTarget({ type: "link", linkId: newLink.id || "" });
  };

  const removeLink = (linkId: string) => {
    const link = links.find((item) => item.id === linkId);
    if (!link) return;
    if (!window.confirm(`¿Eliminar "${link.label || "este enlace"}"?`)) return;
    const nextLinks = links
      .filter((item) => item.id !== linkId)
      .map((item, index) => ({ ...item, sort_order: index }));
    onLinksChange(nextLinks);
    onSelectTarget(
      nextLinks[0]?.id ? { type: "link", linkId: nextLinks[0].id } : { type: "links.manage" },
    );
  };

  const moveLink = (linkId: string, direction: "up" | "down") => {
    const index = links.findIndex((link) => link.id === linkId);
    if (index < 0) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === links.length - 1) return;
    const nextLinks = [...links];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const current = nextLinks[index];
    const target = nextLinks[targetIndex];
    if (!current || !target) return;
    nextLinks[index] = target;
    nextLinks[targetIndex] = current;
    onLinksChange(nextLinks.map((link, sortOrder) => ({ ...link, sort_order: sortOrder })));
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      onProfileChange({ avatar_url: data.publicUrl });
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error subiendo la imagen.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/banner-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("banners").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(filePath);
      onProfileChange({ banner_url: data.publicUrl });
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error subiendo la portada.");
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleLinkImageUpload = async (linkId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const link = links.find((item) => item.id === linkId);
    if (!link) return;
    setUploadingLinkImageId(linkId);
    try {
      const fileExt = file.name.split(".").pop();
      const platform = link.platform || "link";
      const filePath = `${userId}/social-covers/social-cover-${platform}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      updateLink(linkId, {
        social_cover_image_mode: "custom_image",
        social_cover_image_url: data.publicUrl,
      });
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir la foto de esta red.");
    } finally {
      setUploadingLinkImageId(null);
      event.target.value = "";
    }
  };

  const insertBoldBioText = () => {
    const textarea = document.getElementById("contextual-bio") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = profile.bio || "";
    const selected = text.substring(start, end);
    const wrapped = selected ? `**${selected}**` : "**texto**";
    onProfileChange({ bio: text.substring(0, start) + wrapped + text.substring(end) });
    setTimeout(() => {
      textarea.focus();
      const cursorEnd = selected ? end + 4 : start + 7;
      textarea.setSelectionRange(start + 2, cursorEnd - 2);
    }, 0);
  };

  if (!selectedTarget) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Selecciona un elemento para editar sus propiedades.
      </div>
    );
  }

  if (selectedTarget.type === "profile.photo") {
    return (
      <div className="space-y-4">
        <FieldGroup title="Foto">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Foto actual"
                className="h-20 w-20 rounded-full border object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full border bg-muted text-xs text-muted-foreground">
                Sin foto
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                aria-label="Subir o reemplazar foto"
              />
              {uploadingAvatar && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo...
                </p>
              )}
            </div>
          </div>
          {profile.avatar_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onProfileChange({ avatar_url: null })}
            >
              Quitar foto
            </Button>
          )}
        </FieldGroup>
        <FieldGroup title="Forma y aro">
          <Segmented
            label="Forma"
            value={profile.avatar_shape || "circle"}
            options={[
              { id: "circle", label: "Redonda" },
              { id: "rounded", label: "Cuadrada" },
              { id: "none", label: "Ocultar" },
            ]}
            onChange={(value) =>
              onProfileChange({ avatar_shape: value as Profile["avatar_shape"] })
            }
          />
          {profile.avatar_shape !== "none" && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="avatar-ring">Aro</Label>
                <Switch
                  id="avatar-ring"
                  checked={!!profile.ring_enabled}
                  onCheckedChange={(checked) => onProfileChange({ ring_enabled: checked })}
                />
              </div>
              {profile.ring_enabled && (
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Color del aro</Label>
                  <ColorControl
                    compact
                    value={profile.ring_color || "#000000"}
                    onChange={(value) => onProfileChange({ ring_color: value })}
                  />
                  <Segmented
                    label="Grosor"
                    value={profile.ring_thickness || "thin"}
                    options={[
                      { id: "thin", label: "Fino" },
                      { id: "medium", label: "Medio" },
                    ]}
                    onChange={(value) =>
                      onProfileChange({ ring_thickness: value as Profile["ring_thickness"] })
                    }
                  />
                </div>
              )}
            </>
          )}
        </FieldGroup>
      </div>
    );
  }

  if (selectedTarget.type === "profile.name") {
    return (
      <div className="space-y-4">
        <FieldGroup title="Nombre">
          <div className="space-y-2">
            <Label htmlFor="contextual-name">Nombre para mostrar</Label>
            <Input
              id="contextual-name"
              value={profile.display_name || ""}
              onChange={(event) => onProfileChange({ display_name: event.target.value })}
              maxLength={60}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fuente</Label>
            <select
              value={profile.font_family || "Inter"}
              onChange={(event) => onProfileChange({ font_family: event.target.value })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {fonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <Segmented
            label="Tamaño"
            value={profile.title_size || "lg"}
            options={titleSizes.map((size) => ({ id: size, label: size.toUpperCase() }))}
            onChange={(value) => onProfileChange({ title_size: value })}
          />
          <Segmented
            label="Peso"
            value={profile.title_weight || "bold"}
            options={textWeights.map((weight) => ({ id: weight, label: weight }))}
            onChange={(value) => onProfileChange({ title_weight: value })}
          />
          <Segmented
            label="Alineación"
            value={profile.title_align || "center"}
            options={alignments.map((align) => ({ id: align, label: align }))}
            onChange={(value) => onProfileChange({ title_align: value })}
          />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <ColorControl
              compact
              value={profile.title_color || "#111111"}
              onChange={(value) => onProfileChange({ title_color: value })}
            />
          </div>
        </FieldGroup>
      </div>
    );
  }

  if (selectedTarget.type === "profile.bio") {
    return (
      <div className="space-y-4">
        <FieldGroup title="Biografía">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="contextual-bio">Texto</Label>
              <Button type="button" variant="ghost" size="sm" onClick={insertBoldBioText}>
                <Bold className="mr-1 h-4 w-4" />
                Negrita
              </Button>
            </div>
            <Textarea
              id="contextual-bio"
              value={profile.bio || ""}
              onChange={(event) => onProfileChange({ bio: event.target.value })}
              maxLength={180}
              className="min-h-28 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fuente</Label>
            <select
              value={profile.font_family || "Inter"}
              onChange={(event) => onProfileChange({ font_family: event.target.value })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {fonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <Segmented
            label="Tamaño"
            value={profile.bio_size || "md"}
            options={bioSizes.map((size) => ({ id: size, label: size.toUpperCase() }))}
            onChange={(value) => onProfileChange({ bio_size: value })}
          />
          <Segmented
            label="Peso"
            value={profile.bio_weight || "normal"}
            options={textWeights.map((weight) => ({ id: weight, label: weight }))}
            onChange={(value) => onProfileChange({ bio_weight: value })}
          />
          <Segmented
            label="Alineación"
            value={profile.bio_align || "center"}
            options={alignments.map((align) => ({ id: align, label: align }))}
            onChange={(value) => onProfileChange({ bio_align: value })}
          />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <ColorControl
              compact
              value={profile.bio_color || "#374151"}
              onChange={(value) => onProfileChange({ bio_color: value })}
            />
          </div>
        </FieldGroup>
      </div>
    );
  }

  if (selectedTarget.type === "profile.alias") {
    return (
      <FieldGroup title="Enlace personalizado">
        <div className="space-y-2">
          <Label htmlFor="contextual-alias">Alias público</Label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
              tudominio.com/
            </span>
            <Input
              id="contextual-alias"
              value={profile.slug || ""}
              onChange={(event) =>
                onProfileChange({
                  slug: event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 40),
                })
              }
              className="rounded-l-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            El QR estable sigue usando el identificador público aunque cambies este alias.
          </p>
        </div>
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "profile.cover") {
    return (
      <FieldGroup title="Portada">
        {profile.banner_url ? (
          <div className="overflow-hidden rounded-lg border">
            <img
              src={profile.banner_url}
              alt="Portada actual"
              className="h-28 w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid h-28 place-items-center rounded-lg border border-dashed bg-muted text-sm text-muted-foreground">
            Sin portada
          </div>
        )}
        <Input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleCoverUpload}
          disabled={uploadingCover}
          aria-label="Subir o reemplazar portada"
        />
        {uploadingCover && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Subiendo...
          </p>
        )}
        {profile.banner_url && (
          <Button variant="outline" size="sm" onClick={() => onProfileChange({ banner_url: null })}>
            Quitar portada
          </Button>
        )}
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "profile.footer") {
    return (
      <FieldGroup title="Pie de página">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="contextual-footer">Mostrar pie</Label>
          <Switch
            id="contextual-footer"
            checked={!!profile.footer_enabled}
            onCheckedChange={(checked) => onProfileChange({ footer_enabled: checked })}
          />
        </div>
        {profile.footer_enabled && (
          <div className="space-y-2">
            <Label htmlFor="contextual-footer-text">Mensaje</Label>
            <Input
              id="contextual-footer-text"
              value={profile.footer_text || ""}
              onChange={(event) => onProfileChange({ footer_text: event.target.value })}
              maxLength={80}
            />
          </div>
        )}
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "appearance.templates") {
    return (
      <div className="space-y-4">
        <TemplatePicker profile={profile} onChange={onProfileChange} />
        <PremiumMaxProPicker profile={profile} onChange={onProfileChange} />
      </div>
    );
  }

  if (selectedTarget.type === "appearance.typography") {
    return (
      <FieldGroup title="Tipografía">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fuente principal</Label>
          <select
            value={profile.font_family || "Inter"}
            onChange={(event) => onProfileChange({ font_family: event.target.value })}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
        <Segmented
          label="Nombre"
          value={profile.title_size || "lg"}
          options={titleSizes.map((size) => ({ id: size, label: size.toUpperCase() }))}
          onChange={(value) => onProfileChange({ title_size: value })}
        />
        <Segmented
          label="Biografía"
          value={profile.bio_size || "md"}
          options={bioSizes.map((size) => ({ id: size, label: size.toUpperCase() }))}
          onChange={(value) => onProfileChange({ bio_size: value })}
        />
        <Segmented
          label="Peso del nombre"
          value={profile.title_weight || "bold"}
          options={textWeights.map((weight) => ({ id: weight, label: weight }))}
          onChange={(value) => onProfileChange({ title_weight: value })}
        />
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "appearance.colors") {
    return (
      <FieldGroup title="Colores">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fondo</Label>
          <ColorControl
            compact
            value={profile.background_color || "#ffffff"}
            onChange={(value) => onProfileChange({ background_color: value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Texto del nombre</Label>
          <ColorControl
            compact
            value={profile.title_color || "#111111"}
            onChange={(value) => onProfileChange({ title_color: value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Texto de biografía</Label>
          <ColorControl
            compact
            value={profile.bio_color || "#374151"}
            onChange={(value) => onProfileChange({ bio_color: value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Botón</Label>
          <ColorControl
            compact
            value={profile.button_color || "#111111"}
            onChange={(value) => onProfileChange({ button_color: value })}
          />
        </div>
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "appearance.buttons") {
    return <BotonesSection profile={profile} onChange={onProfileChange} />;
  }

  if (selectedTarget.type === "appearance.spacing") {
    return (
      <FieldGroup title="Espaciado">
        <Segmented
          label="Separación"
          value={profile.theme_spacing || "standard"}
          options={[
            { id: "compact", label: "Compacto" },
            { id: "standard", label: "Normal" },
            { id: "generous", label: "Amplio" },
          ]}
          onChange={(value) => onProfileChange({ theme_spacing: value })}
        />
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "appearance.decoration") {
    return <DecoracionSection profile={profile} onChange={onProfileChange} />;
  }

  if (selectedTarget.type === "social_cover" || selectedTarget.type === "hero_social") {
    return (
      <SocialCoversSection
        profile={profile}
        onChange={onProfileChange}
        links={links}
        onManageLinkImages={() => onSelectTarget({ type: "links.manage" })}
      />
    );
  }

  if (selectedTarget.type === "links.manage") {
    return (
      <FieldGroup title="Añadir / administrar enlaces">
        <Button onClick={addLink} disabled={links.length >= 8} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar enlace
        </Button>
        <div className="space-y-2">
          {links.map((link, index) => (
            <button
              key={link.id || index}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted"
              onClick={() => onSelectTarget({ type: "link", linkId: link.id || "" })}
            >
              <span className="min-w-0 truncate text-sm font-medium">
                {link.label || link.platform || "Enlace"}
              </span>
              <span className="text-xs text-muted-foreground">
                {link.enabled ? "Activo" : "Oculto"}
              </span>
            </button>
          ))}
        </div>
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "link") {
    const link = links.find((item) => item.id === selectedTarget.linkId);
    const index = links.findIndex((item) => item.id === selectedTarget.linkId);
    if (!link || !selectedTarget.linkId) {
      return (
        <FieldGroup title="Editar enlace">
          <p className="text-sm text-muted-foreground">No hay enlace seleccionado.</p>
          <Button onClick={addLink}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar enlace
          </Button>
        </FieldGroup>
      );
    }
    const platformInfo = getPlatformDef((link.platform as string) || "website");
    const PlatformIcon = platformInfo.icon;
    return (
      <FieldGroup title="Editar enlace">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor={`link-enabled-${selectedTarget.linkId}`}>Visible</Label>
          <Switch
            id={`link-enabled-${selectedTarget.linkId}`}
            checked={!!link.enabled}
            onCheckedChange={(checked) => updateLink(selectedTarget.linkId, { enabled: checked })}
          />
        </div>
        <div className="space-y-2">
          <Label>Plataforma</Label>
          <PlatformPicker
            value={(link.platform as string) || "website"}
            onChange={(value) => updateLink(selectedTarget.linkId, { platform: value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`link-label-${selectedTarget.linkId}`}>Título</Label>
          <Input
            id={`link-label-${selectedTarget.linkId}`}
            value={link.label || ""}
            onChange={(event) => updateLink(selectedTarget.linkId, { label: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`link-subtitle-${selectedTarget.linkId}`}>Descripción</Label>
          <Input
            id={`link-subtitle-${selectedTarget.linkId}`}
            value={link.subtitle || ""}
            onChange={(event) =>
              updateLink(selectedTarget.linkId, { subtitle: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`link-url-${selectedTarget.linkId}`}>URL</Label>
          <Input
            id={`link-url-${selectedTarget.linkId}`}
            value={link.url || ""}
            onChange={(event) => updateLink(selectedTarget.linkId, { url: event.target.value })}
            dir="ltr"
          />
        </div>
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <Label className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4" />
            Imagen premium
          </Label>
          <Segmented
            label="Modo"
            value={link.social_cover_image_mode || "platform_icon"}
            options={[
              { id: "platform_icon", label: "Logo" },
              { id: "main_avatar", label: "Avatar" },
              { id: "custom_image", label: "Foto" },
            ]}
            onChange={(value) =>
              updateLink(selectedTarget.linkId, {
                social_cover_image_mode: value as LinkImageMode,
              })
            }
          />
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border bg-background">
              {link.social_cover_image_mode === "custom_image" && link.social_cover_image_url ? (
                <img
                  src={link.social_cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <PlatformIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(event) => handleLinkImageUpload(selectedTarget.linkId, event)}
                disabled={uploadingLinkImageId === selectedTarget.linkId}
                aria-label="Subir imagen premium del enlace"
              />
              {uploadingLinkImageId === selectedTarget.linkId && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo...
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => moveLink(selectedTarget.linkId, "up")}
          >
            Subir
          </Button>
          <Button
            variant="outline"
            disabled={index === links.length - 1}
            onClick={() => moveLink(selectedTarget.linkId, "down")}
          >
            Bajar
          </Button>
        </div>
        <Button variant="destructive" onClick={() => removeLink(selectedTarget.linkId)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar enlace
        </Button>
      </FieldGroup>
    );
  }

  if (selectedTarget.type === "qr") {
    return (
      <ShareSection
        publicId={publicId}
        published={published}
        saving={saving}
        onSave={onSave}
        isValid={isValid}
        profile={profile}
        onChange={onProfileChange}
      />
    );
  }

  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      Selecciona un elemento para editar sus propiedades.
    </div>
  );
}
