import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkEditTarget } from "@/types/basic-templates";
import type { LinkItem } from "@/types/basic-templates";

/* ------------------------------------------------------------------ */
/* Image input (upload local -> data URL, or paste URL)                */
/* ------------------------------------------------------------------ */

interface ImageInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocusTarget?: () => void;
}

export function ImageInput({ label, value, onChange, onFocusTarget }: ImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
      setBusy(false);
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}
      <div className="flex items-center gap-2">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          onFocus={onFocusTarget}
          disabled={busy}
          className="shrink-0"
        >
          {busy ? "Cargando…" : "Subir"}
        </Button>
        <Input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocusTarget}
          placeholder="o pega una URL"
          className="h-9"
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Links editor                                                        */
/* ------------------------------------------------------------------ */

interface LinksEditorProps {
  links: LinkItem[];
  onChange: (links: LinkItem[]) => void;
  onFocusTarget?: (targetId: string) => void;
}

export function LinksEditor({ links, onChange, onFocusTarget }: LinksEditorProps) {
  const update = (id: string, patch: Partial<LinkItem>) =>
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...links];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const currentLink = next[index];
    const targetLink = next[target];
    if (!currentLink || !targetLink) return;
    [next[index], next[target]] = [targetLink, currentLink];
    onChange(next);
  };

  const add = () =>
    onChange([...links, { id: `link-${Date.now()}`, label: "", url: "", enabled: true }]);

  const remove = (id: string) => onChange(links.filter((l) => l.id !== id));

  return (
    <div className="space-y-3">
      {links.map((link, i) => (
        <div key={link.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={link.enabled}
              onChange={(e) => update(link.id, { enabled: e.target.checked })}
              onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
              className="h-4 w-4 accent-primary"
              title="Mostrar / ocultar"
            />
            <Input
              value={link.label}
              onChange={(e) => update(link.id, { label: e.target.value })}
              onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
              placeholder="Título"
              className="h-9 flex-1"
            />
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
                onClick={() => move(i, 1)}
                disabled={i === links.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
                onClick={() => remove(link.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            value={link.url}
            onChange={(e) => update(link.id, { url: e.target.value })}
            onFocus={() => onFocusTarget?.(linkEditTarget(link.id))}
            placeholder="https://…"
            className="h-9"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Agregar enlace
      </Button>
    </div>
  );
}
