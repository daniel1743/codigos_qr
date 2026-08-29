import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ProfileLink } from "../../types/database";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

interface LinksSectionProps {
  links: Partial<ProfileLink>[];
  onChange: (links: Partial<ProfileLink>[]) => void;
  userId?: string;
}

const MAX_LINKS = 8;

export function LinksSection({ links, onChange }: LinksSectionProps) {
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Enlaces</h2>
          <p className="text-sm text-muted-foreground">
            {links.length} de {MAX_LINKS} agregados
          </p>
        </div>
        <Button
          type="button"
          onClick={handleAddLink}
          disabled={links.length >= MAX_LINKS}
          className="h-10 w-full rounded-full min-[420px]:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={link.id || index} className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{link.label || "Enlace"}</p>
                <p className="truncate text-xs text-muted-foreground">{link.url || "Sin URL"}</p>
              </div>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`link-label-${link.id || index}`}>Texto</Label>
                <Input
                  id={`link-label-${link.id || index}`}
                  value={link.label || ""}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                  placeholder="Ej: Instagram"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`link-url-${link.id || index}`}>URL</Label>
                <Input
                  id={`link-url-${link.id || index}`}
                  value={link.url || ""}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                  placeholder="https://..."
                  className="h-11"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <Label htmlFor={`link-enabled-${link.id || index}`}>Mostrar enlace</Label>
              <Switch
                id={`link-enabled-${link.id || index}`}
                checked={!!link.enabled}
                onCheckedChange={(checked) => updateLink(index, { enabled: checked })}
              />
            </div>
          </div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">No hay enlaces</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Agrega al menos 3 enlaces para poder publicar tu página.
          </p>
        </div>
      )}
    </section>
  );
}
