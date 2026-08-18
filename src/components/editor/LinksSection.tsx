import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import type { ProfileLink, PlatformType } from "../../types/database";
import { ArrowUp, ArrowDown, Trash2, Plus, Globe, Link as LinkIcon, GripVertical, Linkedin } from "lucide-react";

import {
  SiInstagram,
  SiWhatsapp,
  SiX,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiTelegram,
} from "@icons-pack/react-simple-icons";

interface LinksSectionProps {
  links: Partial<ProfileLink>[];
  onChange: (links: Partial<ProfileLink>[]) => void;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: SiInstagram, color: "#E4405F" },
  { value: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, color: "#25D366" },
  { value: "twitter", label: "X (Twitter)", icon: SiX, color: "#000000" },
  { value: "facebook", label: "Facebook", icon: SiFacebook, color: "#1877F2" },
  { value: "tiktok", label: "TikTok", icon: SiTiktok, color: "#000000" },
  { value: "youtube", label: "YouTube", icon: SiYoutube, color: "#FF0000" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { value: "telegram", label: "Telegram", icon: SiTelegram, color: "#26A5E4" },
  { value: "website", label: "Sitio Web", icon: Globe, color: "#666666" },
  { value: "other", label: "Otro", icon: LinkIcon, color: "#666666" },
] as const;

export function LinksSection({ links, onChange }: LinksSectionProps) {
  const handleAddLink = () => {
    if (links.length >= 8) return;

    onChange([
      ...links,
      {
        id: `temp-${Date.now()}`,
        platform: "website",
        label: "Mi Enlace",
        url: "",
        enabled: true,
        sort_order: links.length,
      },
    ]);
  };

  const updateLink = (index: number, updates: Partial<ProfileLink>) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], ...updates };
    onChange(newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange(newLinks.map((link, i) => ({ ...link, sort_order: i })));
  };

  const moveLink = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === links.length - 1) return;

    const newLinks = [...links];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    onChange(newLinks.map((link, i) => ({ ...link, sort_order: i })));
  };

  const getPlatformInfo = (platformValue: string | undefined) => {
    return PLATFORMS.find((p) => p.value === platformValue) || PLATFORMS[8]; // Default to website
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Enlaces</h2>
          <p className="text-sm text-muted-foreground">{links.length} de 8 agregados</p>
        </div>
        <Button onClick={handleAddLink} disabled={links.length >= 8} size="sm" variant="default" className="h-10 w-full rounded-full shadow-sm min-[380px]:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Agregar
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-3">
        {links.map((link, index) => {
          const platformInfo = getPlatformInfo(link.platform);
          const IconComponent = platformInfo.icon;

          return (
            <AccordionItem
              key={link.id || `temp-${index}`}
              value={link.id || `temp-${index}`}
              className="overflow-hidden rounded-xl border bg-card px-1 shadow-sm ring-border/50 data-[state=open]:ring-2"
            >
              <div className="flex items-center gap-1 pr-2 min-[380px]:gap-2 min-[380px]:pr-4">
                <div className="hidden cursor-grab p-3 text-muted-foreground hover:text-foreground min-[380px]:block">
                  <GripVertical className="w-4 h-4" />
                </div>
                <AccordionTrigger className="flex-1 py-4 hover:no-underline">
                  <div className="flex min-w-0 items-center gap-3 w-full">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${platformInfo.color}15`, color: platformInfo.color }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                      <span className="max-w-[120px] truncate text-sm font-medium text-foreground min-[380px]:max-w-[170px] sm:max-w-[200px]">
                        {link.label || platformInfo.label}
                      </span>
                      <span className="max-w-[120px] truncate text-xs text-muted-foreground min-[380px]:max-w-[170px] sm:max-w-[200px]">
                        {link.url || "Sin URL"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-3 pl-2">
                  <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                     <Switch
                      checked={link.enabled}
                      onCheckedChange={(checked) => updateLink(index, { enabled: checked })}
                    />
                  </div>
                </div>
              </div>

              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <div className="space-y-4 mt-2">
                  <div className="mb-4 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configuración del enlace</p>
                     <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveLink(index, "up")}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === links.length - 1}
                          onClick={() => moveLink(index, "down")}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar este enlace?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se quitará de tu página pública después de guardar los cambios.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-end gap-2">
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeLink(index)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Plataforma</Label>
                      <Select
                        value={link.platform as string}
                        onValueChange={(val) => updateLink(index, { platform: val as PlatformType })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecciona una red" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => {
                            const PIcon = p.icon;
                            return (
                              <SelectItem key={p.value} value={p.value}>
                                <div className="flex items-center gap-2">
                                  <PIcon size={14} />
                                  <span>{p.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Texto del botón</Label>
                      <Input
                        value={link.label || ""}
                        onChange={(e) => updateLink(index, { label: e.target.value })}
                        placeholder="Ej: Sígueme en Instagram"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>URL de destino</Label>
                    <Input
                      value={link.url || ""}
                      onChange={(e) => updateLink(index, { url: e.target.value })}
                      placeholder="https://..."
                      className="h-11"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {links.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl text-center space-y-3">
          <div className="bg-muted p-3 rounded-full">
            <LinkIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No hay enlaces</p>
            <p className="text-xs text-muted-foreground">Agrega al menos 3 enlaces para poder publicar tu página.</p>
          </div>
        </div>
      )}
    </div>
  );
}
