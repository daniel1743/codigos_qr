import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { ProfileLink } from "../../types/database";
import { linkEditTarget } from "../../types/basic-templates";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { PlatformPicker } from "../profile/PlatformPicker";

interface LinksSectionProps {
  links: Partial<ProfileLink>[];
  onChange: (links: Partial<ProfileLink>[]) => void;
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
  selectedTarget,
  onSelectTarget,
}: LinksSectionProps) {
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
                     onChange={(platform) => updateLink(index, { platform })}
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
                      onChange={(event) => updateLink(index, { url: event.target.value })}
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
