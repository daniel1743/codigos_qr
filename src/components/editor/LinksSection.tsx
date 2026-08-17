import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { ProfileLink, PlatformType } from "../../types/database";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

interface LinksSectionProps {
  links: Partial<ProfileLink>[];
  onChange: (links: Partial<ProfileLink>[]) => void;
}

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
    // Recalculate sort_order
    onChange(newLinks.map((link, i) => ({ ...link, sort_order: i })));
  };

  const moveLink = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === links.length - 1) return;

    const newLinks = [...links];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    // Recalculate sort_order
    onChange(newLinks.map((link, i) => ({ ...link, sort_order: i })));
  };

  const PLATFORMS: { value: PlatformType | "website"; label: string }[] = [
    { value: "instagram", label: "Instagram" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "twitter", label: "X (Twitter)" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "telegram", label: "Telegram" },
    { value: "website", label: "Sitio Web" },
    { value: "other", label: "Otro" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Enlaces ({links.length}/8)</h2>
        <Button onClick={handleAddLink} disabled={links.length >= 8} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Agregar Enlace
        </Button>
      </div>

      <div className="space-y-4">
        {links.map((link, index) => (
          <div key={link.id} className="p-4 border rounded-lg bg-card space-y-4 relative">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={link.enabled}
                  onCheckedChange={(checked) => updateLink(index, { enabled: checked })}
                />
                <Label className="text-sm text-muted-foreground">
                  {link.enabled ? "Visible" : "Oculto"}
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveLink(index, "up")}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === links.length - 1}
                  onClick={() => moveLink(index, "down")}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeLink(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select
                  value={link.platform as string}
                  onValueChange={(val) => updateLink(index, { platform: val as PlatformType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una red" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Texto del botón</Label>
                <Input
                  value={link.label || ""}
                  onChange={(e) => updateLink(index, { label: e.target.value })}
                  placeholder="Ej: Sígueme en Instagram"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={link.url || ""}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
            No tienes enlaces. Agrega al menos 3 para poder publicar.
          </p>
        )}
      </div>
    </div>
  );
}
