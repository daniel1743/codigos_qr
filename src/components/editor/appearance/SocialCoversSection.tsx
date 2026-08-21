import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Sparkles, ImageIcon, ArrowRight } from "lucide-react";
import type { Profile, ProfileLink } from "../../../types/database";
import { SOCIAL_COVER_STYLE_OPTIONS } from "../../../constants/social-cover-styles";

interface SocialCoversSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  links?: Partial<ProfileLink>[];
  onManageLinkImages?: () => void;
}

function SocialCoverStylePreview({ id }: { id: string }) {
  const base =
    "relative mb-2 block h-8 w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 shadow-sm";

  if (id === "split_capsule") {
    return (
      <span className={base}>
        <span className="absolute inset-0 bg-white" />
        <span className="absolute left-0 top-0 h-full w-12 bg-blue-600" />
      </span>
    );
  }

  if (id === "ribbon_label") {
    return (
      <span className={base}>
        <span className="absolute left-0 top-0 h-full w-12 bg-pink-600 [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "avatar_capsule") {
    return (
      <span className={base}>
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-white bg-slate-200" />
      </span>
    );
  }

  if (id === "solid_subscribe") {
    return (
      <span className={`${base} bg-gradient-to-r from-pink-600 to-rose-500`}>
        <span className="absolute bottom-1 left-4 right-4 h-2 rounded-full bg-white/15" />
        <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-md bg-white/90" />
      </span>
    );
  }

  if (id === "raised_gloss") {
    return (
      <span
        className={`${base} border-2 border-white bg-gradient-to-r from-blue-700 to-cyan-500 shadow-[0_3px_0_rgba(148,163,184,0.8)]`}
      >
        <span className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white" />
        <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent_45%)]" />
      </span>
    );
  }

  if (id === "heart_badge") {
    return (
      <span className={`${base} overflow-visible bg-gradient-to-r from-blue-700 to-pink-500`}>
        <span className="absolute -left-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-2xl bg-blue-600 shadow-sm" />
        <span className="absolute -left-0.5 top-0 h-4 w-4 rounded-full bg-blue-600" />
        <span className="absolute left-3 top-0 h-4 w-4 rounded-full bg-blue-600" />
      </span>
    );
  }

  if (id === "angled_tab") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-r-full border-2 border-blue-600 bg-white shadow-sm">
        <span className="absolute left-0 top-0 h-full w-12 bg-blue-600 [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "leaf_outline") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-[999px_14px_999px_999px] border-2 border-cyan-500 bg-white shadow-sm">
        <span className="absolute left-0 top-0 h-full w-12 rounded-l-full bg-gradient-to-r from-pink-500 to-yellow-400 [clip-path:polygon(0_0,82%_0,100%_50%,82%_100%,0_100%)]" />
      </span>
    );
  }

  if (id === "metal_coin") {
    return (
      <span className={`${base} overflow-visible bg-gradient-to-r from-blue-700 to-blue-500`}>
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-[conic-gradient(from_25deg,#f8fafc,#94a3b8,#fff,#64748b,#f8fafc)] shadow-sm" />
      </span>
    );
  }

  if (id === "neon_lumen") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-full bg-gradient-to-r from-slate-950 via-blue-600 to-cyan-400 shadow-sm">
        <span className="absolute -inset-y-6 left-8 w-14 rotate-12 bg-white/30 blur-lg" />
        <span className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white" />
      </span>
    );
  }

  if (id === "glass_orbit") {
    return (
      <span className="relative mb-2 block h-8 w-full overflow-hidden rounded-[18px] border border-white bg-white shadow-sm">
        <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-30" />
        <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600" />
      </span>
    );
  }

  return (
    <span className={base}>
      <span className="absolute -left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600" />
    </span>
  );
}

export function SocialCoversSection({
  profile,
  onChange,
  links = [],
  onManageLinkImages,
}: SocialCoversSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Activar Social Covers</Label>
            <p className="text-xs text-muted-foreground">Transforma redes en tarjetas visuales</p>
          </div>
          <Switch
            checked={profile.social_covers_enabled || false}
            onCheckedChange={(checked) => onChange({ social_covers_enabled: checked })}
          />
        </div>

        {profile.social_covers_enabled && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-2 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Alto premium</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajusta el grosor sin cambiar el largo
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      onChange({
                        social_cover_height: Math.max(
                          48,
                          Number(profile.social_cover_height || 64) - 4,
                        ),
                      })
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={48}
                    max={88}
                    step={2}
                    value={profile.social_cover_height || 64}
                    onChange={(e) =>
                      onChange({
                        social_cover_height: Math.min(
                          88,
                          Math.max(48, Number(e.target.value) || 64),
                        ),
                      })
                    }
                    className="h-9 w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      onChange({
                        social_cover_height: Math.min(
                          88,
                          Number(profile.social_cover_height || 64) + 4,
                        ),
                      })
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
              <input
                type="range"
                min={48}
                max={88}
                step={2}
                value={profile.social_cover_height || 64}
                onChange={(e) => onChange({ social_cover_height: Number(e.target.value) || 64 })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Ancho premium</Label>
                  <p className="text-xs text-muted-foreground">
                    Haz las tarjetas mas compactas o mas anchas
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      onChange({
                        social_cover_width: Math.max(
                          88,
                          Number(profile.social_cover_width || 100) - 4,
                        ),
                      })
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={88}
                    max={116}
                    step={2}
                    value={profile.social_cover_width || 100}
                    onChange={(e) =>
                      onChange({
                        social_cover_width: Math.min(
                          116,
                          Math.max(88, Number(e.target.value) || 100),
                        ),
                      })
                    }
                    className="h-9 w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      onChange({
                        social_cover_width: Math.min(
                          116,
                          Number(profile.social_cover_width || 100) + 4,
                        ),
                      })
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
              <input
                type="range"
                min={88}
                max={116}
                step={2}
                value={profile.social_cover_width || 100}
                onChange={(e) => onChange({ social_cover_width: Number(e.target.value) || 100 })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-sm">Modelos premium</Label>
              <p className="text-xs text-muted-foreground">
                Elige la forma visual de tus botones sociales
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_COVER_STYLE_OPTIONS.map((option) => {
                const active = (profile.social_cover_style || "badge_left") === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ social_cover_style: option.id })}
                    className={`flex min-h-[88px] flex-col rounded-lg border p-2 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <SocialCoverStylePreview id={option.id} />
                    <span
                      className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onManageLinkImages}
              className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-background"
              disabled={!onManageLinkImages}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-foreground">
                  Imagen por enlace
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  Sube una foto propia para el logo de cada botón.
                </span>
              </span>
              {onManageLinkImages && (
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        <div className="w-full h-px bg-border/50" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Hero Social</Label>
              <p className="text-xs text-muted-foreground">
                Destaca un enlace como portada superior
              </p>
            </div>
          </div>

          <Select
            value={profile.hero_link_id || "off"}
            onValueChange={(val) => onChange({ hero_link_id: val === "off" ? null : val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar enlace principal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">
                <span className="text-muted-foreground">Desactivado (OFF)</span>
              </SelectItem>
              {links
                ?.filter((l) => l.id && l.enabled)
                .map((link) => (
                  <SelectItem key={link.id} value={link.id as string}>
                    {link.label || link.platform}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
