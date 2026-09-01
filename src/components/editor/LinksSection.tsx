import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProfileLink } from "../../types/database";
import type { Profile } from "../../types/database";
import {
  BASIC_CARD_CTA_PRESETS,
  type CardCornerStyle,
  type CardMediaMode,
  linkEditTarget,
} from "../../types/basic-templates";
import {
  detectBasicPlatformFromUrl,
  getBasicLinkPresentation,
  updateBasicLinkPresentation,
} from "../../lib/basic-templates/config";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { PlatformPicker } from "../profile/PlatformPicker";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";

interface LinksSectionProps {
  links: Partial<ProfileLink>[];
  onChange: (links: Partial<ProfileLink>[]) => void;
  profile: Partial<Profile>;
  onProfileChange: (updates: Partial<Profile>) => void;
  cardPresentationEnabled?: boolean;
  userId?: string;
  selectedTarget?: string | null;
  onSelectTarget?: (targetId: string) => void;
}

const MAX_LINKS = 8;

function getLinkTarget(link: Partial<ProfileLink>, index: number) {
  return linkEditTarget(link.id || `profile-link-${index}`);
}

export function LinksSection({
  links,
  onChange,
  profile,
  onProfileChange,
  cardPresentationEnabled = true,
  userId,
  selectedTarget,
  onSelectTarget,
}: LinksSectionProps) {
  const manualPlatformOverrides = useRef(new Set<string>());
  const autoDetectedPlatforms = useRef(new Set<string>());
  const [uploadingCardImage, setUploadingCardImage] = useState<number | null>(null);
  const supabase = getBrowserSupabaseClient();
  const [openLinkTarget, setOpenLinkTarget] = useState<string | null>(() =>
    links[0] ? getLinkTarget(links[0], 0) : null,
  );

  useEffect(() => {
    if (selectedTarget?.startsWith("link-")) setOpenLinkTarget(selectedTarget);
  }, [selectedTarget]);

  useEffect(() => {
    if (links.length === 0) {
      setOpenLinkTarget(null);
      return;
    }
    if (!openLinkTarget || !links.some((link, index) => getLinkTarget(link, index) === openLinkTarget)) {
      setOpenLinkTarget(getLinkTarget(links[0], 0));
    }
  }, [links, openLinkTarget]);

  const handleAddLink = () => {
    if (links.length >= MAX_LINKS) return;

    onChange([
      ...links,
      {
        id: `temp-${Date.now()}`,
        platform: "website",
        label: "Mi enlace",
        url: "",
        enabled: true,
        sort_order: links.length,
      },
    ]);
  };

  const updateLink = (index: number, updates: Partial<ProfileLink>) => {
    const nextLinks = [...links];
    nextLinks[index] = { ...nextLinks[index], ...updates };
    onChange(nextLinks);
  };

  const updateLinkUrl = (index: number, url: string) => {
    const link = links[index];
    const linkId = link.id || `profile-link-${index}`;
    const nextLink = { ...link, url };
    const detected = detectBasicPlatformFromUrl(url);
    const canAutoDetect =
      !manualPlatformOverrides.current.has(linkId) &&
      (link.platform === undefined ||
        link.platform === "" ||
        link.platform === "website" ||
        link.platform === "other" ||
        autoDetectedPlatforms.current.has(linkId));

    if (detected && canAutoDetect) {
      nextLink.platform = detected;
      autoDetectedPlatforms.current.add(linkId);
    }

    const nextLinks = [...links];
    nextLinks[index] = nextLink;
    onChange(nextLinks);
  };

  const updateCardPresentation = (
    index: number,
    updates: Parameters<typeof updateBasicLinkPresentation>[2],
  ) => {
    const linkId = links[index].id || `profile-link-${index}`;
    onProfileChange(updateBasicLinkPresentation(profile, linkId, updates));
  };

  const handlePlatformChange = (index: number, platform: string) => {
    const linkId = links[index].id || `profile-link-${index}`;
    manualPlatformOverrides.current.add(linkId);
    autoDetectedPlatforms.current.delete(linkId);
    updateLink(index, { platform });
  };

  const handleCardImageUpload = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!userId) {
      toast.error("Inicia sesión para subir imágenes.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato no válido", { description: "Usa JPG, PNG o WEBP." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagen demasiado grande", { description: "El máximo permitido es 3 MB." });
      return;
    }

    setUploadingCardImage(index);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/basic-cards/card-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      updateLink(index, {
        social_cover_image_mode: "custom_image",
        social_cover_image_url: data.publicUrl,
      });
      updateCardPresentation(index, { card: { mediaMode: "image" } });
      toast.success("Imagen de tarjeta subida correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploadingCardImage(null);
    }
  };

  const removeLink = (index: number) => {
    onChange(
      links
        .filter((_, linkIndex) => linkIndex !== index)
        .map((link, i) => ({ ...link, sort_order: i })),
    );
  };

  const moveLink = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const nextLinks = [...links];
    [nextLinks[index], nextLinks[targetIndex]] = [nextLinks[targetIndex], nextLinks[index]];
    onChange(nextLinks.map((link, i) => ({ ...link, sort_order: i })));
  };

  const openLink = (targetId: string) => {
    setOpenLinkTarget(targetId);
    onSelectTarget?.(targetId);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Contenido</p>
          <h2 className="text-xl font-bold tracking-[-0.04em] text-[#1d1d1b]">Enlaces</h2>
          <p className="text-sm text-stone-500">
            {links.length} de {MAX_LINKS} agregados
          </p>
        </div>
        <Button
          type="button"
          onClick={handleAddLink}
          disabled={links.length >= MAX_LINKS}
          className="h-10 w-full rounded-full bg-[#1d1d1b] text-[#fffefa] hover:bg-[#343432] min-[420px]:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => {
          const targetId = getLinkTarget(link, index);
          const isOpen = openLinkTarget === targetId;
          const contentId = `link-editor-${link.id || index}`;

          return (
          <div
            key={link.id || index}
            data-tool-target={targetId}
            className="space-y-4 rounded-2xl border border-stone-200 bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(29,29,27,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => openLink(targetId)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1d1d1b]">{link.label || "Enlace"}</p>
                  <p className="truncate text-xs text-stone-500">{link.url || "Sin URL"}</p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveLink(index, "up")}
                  aria-label="Mover enlace hacia arriba"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === links.length - 1}
                  onClick={() => moveLink(index, "down")}
                  aria-label="Mover enlace hacia abajo"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeLink(index)}
                  aria-label="Eliminar enlace"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

             {isOpen ? (
               <div id={contentId} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor={`link-platform-${link.id || index}`}>Red o tipo de enlace</Label>
                   <PlatformPicker
                     value={link.platform || "website"}
                     onChange={(platform) => handlePlatformChange(index, platform)}
                   />
                 </div>
                 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`link-label-${link.id || index}`}>Texto</Label>
                    <Input
                      id={`link-label-${link.id || index}`}
                      value={link.label || ""}
                      onChange={(event) => updateLink(index, { label: event.target.value })}
                      placeholder="Ej: Instagram"
                      className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`link-url-${link.id || index}`}>URL</Label>
                    <Input
                      id={`link-url-${link.id || index}`}
                      value={link.url || ""}
                      onChange={(event) => updateLinkUrl(index, event.target.value)}
                      placeholder="https://..."
                      className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <Label htmlFor={`link-enabled-${link.id || index}`}>Mostrar enlace</Label>
                  <Switch
                    id={`link-enabled-${link.id || index}`}
                    checked={!!link.enabled}
                    onCheckedChange={(checked) => updateLink(index, { enabled: checked })}
                  />
                </div>

                {cardPresentationEnabled ? (() => {
                  const presentation = getBasicLinkPresentation(profile, link);
                  const card = presentation.card;
                  const isCard = presentation.presentation === "card";

                  return (
                    <div className="space-y-4 rounded-xl border border-stone-200 bg-[#fffefa] p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <Label htmlFor={`link-card-${link.id || index}`}>Convertir en tarjeta</Label>
                          <p className="text-xs text-stone-500">
                            Mantiene este mismo enlace y su destino.
                          </p>
                        </div>
                        <Switch
                          id={`link-card-${link.id || index}`}
                          checked={isCard}
                          onCheckedChange={(checked) =>
                            updateCardPresentation(index, {
                              presentation: checked ? "card" : "button",
                            })
                          }
                        />
                      </div>

                      {isCard ? (
                        <div className="space-y-4 border-t border-stone-200 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor={`card-title-${link.id || index}`}>Título de tarjeta</Label>
                            <Input
                              id={`card-title-${link.id || index}`}
                              value={card.title}
                              onChange={(event) =>
                                updateCardPresentation(index, {
                                  card: { title: event.target.value },
                                })
                              }
                              placeholder="Ej: Reserva tu hora"
                              maxLength={80}
                              className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`card-description-${link.id || index}`}>Descripción</Label>
                            <Input
                              id={`card-description-${link.id || index}`}
                              value={card.description || ""}
                              onChange={(event) => {
                                const description = event.target.value;
                                updateLink(index, { subtitle: description });
                                updateCardPresentation(index, { card: { description } });
                              }}
                              placeholder="Una descripción breve"
                              maxLength={160}
                              className="h-11 rounded-xl border-stone-200 bg-[#fffefa]"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`card-cta-${link.id || index}`}>Llamada a la acción</Label>
                              <select
                                id={`card-cta-${link.id || index}`}
                                value={card.ctaLabel}
                                onChange={(event) =>
                                  updateCardPresentation(index, {
                                    card: { ctaLabel: event.target.value },
                                  })
                                }
                                className="h-11 w-full rounded-xl border border-stone-200 bg-[#fffefa] px-3 text-sm text-[#1d1d1b]"
                              >
                                {BASIC_CARD_CTA_PRESETS.map((cta) => (
                                  <option key={cta} value={cta}>
                                    {cta}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`card-corners-${link.id || index}`}>Esquinas</Label>
                              <select
                                id={`card-corners-${link.id || index}`}
                                value={card.cornerStyle}
                                onChange={(event) =>
                                  updateCardPresentation(index, {
                                    card: { cornerStyle: event.target.value as CardCornerStyle },
                                  })
                                }
                                className="h-11 w-full rounded-xl border border-stone-200 bg-[#fffefa] px-3 text-sm text-[#1d1d1b]"
                              >
                                <option value="soft">Suaves</option>
                                <option value="square">Cuadradas</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`card-media-${link.id || index}`}>Media de tarjeta</Label>
                            <select
                              id={`card-media-${link.id || index}`}
                              value={card.mediaMode}
                              onChange={(event) =>
                                updateCardPresentation(index, {
                                  card: { mediaMode: event.target.value as CardMediaMode },
                                })
                              }
                              className="h-11 w-full rounded-xl border border-stone-200 bg-[#fffefa] px-3 text-sm text-[#1d1d1b]"
                            >
                              <option value="platform_icon">Icono de plataforma</option>
                              <option value="image">Imagen subida</option>
                              <option value="none">Sin media</option>
                            </select>
                          </div>
                          {card.mediaMode === "image" ? (
                            <div className="space-y-2">
                              <Label htmlFor={`card-image-${link.id || index}`}>Imagen</Label>
                              <Input
                                id={`card-image-${link.id || index}`}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => handleCardImageUpload(index, event)}
                                disabled={uploadingCardImage === index}
                                className="h-11"
                              />
                              {uploadingCardImage === index ? (
                                <p className="flex items-center gap-2 text-xs text-stone-500" role="status">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Subiendo imagen...
                                </p>
                              ) : card.imageUrl ? (
                                <p className="text-xs text-stone-500">Imagen lista para guardar.</p>
                              ) : (
                                <p className="text-xs text-amber-700">Sube una imagen para usar este modo.</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })() : null}
              </div>
            ) : null}
          </div>
          );
        })}
      </div>

      {links.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#fffefa]/70 p-8 text-center">
          <p className="text-sm font-medium text-[#1d1d1b]">No hay enlaces</p>
          <p className="mt-1 text-xs text-stone-500">
            Agrega al menos 3 enlaces para poder publicar tu página.
          </p>
        </div>
      )}
    </section>
  );
}
