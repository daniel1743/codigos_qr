import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cardEditTarget, socialEditTarget } from "@/types/basic-templates";
import type { CardItem, SocialItem, SocialPlatform } from "@/types/basic-templates";
import { ImageInput } from "./controls";

/* ------------------------------------------------------------------ */
/* Socials editor                                                      */
/* ------------------------------------------------------------------ */

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Sitio web" },
];

interface SocialsEditorProps {
  socials: SocialItem[];
  onChange: (socials: SocialItem[]) => void;
  onFocusTarget?: (targetId: string) => void;
}

export function SocialsEditor({ socials, onChange, onFocusTarget }: SocialsEditorProps) {
  const update = (id: string, patch: Partial<SocialItem>) =>
    onChange(socials.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      {socials.map((social) => (
        <div key={social.id} className="flex items-center gap-2 rounded-lg border p-2">
          <input
            type="checkbox"
            checked={social.enabled}
            onChange={(e) => update(social.id, { enabled: e.target.checked })}
            onFocus={() => onFocusTarget?.(socialEditTarget(social.id))}
            className="h-4 w-4 accent-primary"
            title="Mostrar / ocultar"
          />
          <select
            value={social.platform}
            onChange={(e) => update(social.id, { platform: e.target.value as SocialPlatform })}
            onFocus={() => onFocusTarget?.(socialEditTarget(social.id))}
            className="h-9 shrink-0 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Input
            value={social.url}
            onChange={(e) => update(social.id, { url: e.target.value })}
            onFocus={() => onFocusTarget?.(socialEditTarget(social.id))}
            placeholder="https://…"
            className="h-9 flex-1"
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards editor (catalog templates)                                    */
/* ------------------------------------------------------------------ */

interface CardsEditorProps {
  cards: CardItem[];
  onChange: (cards: CardItem[]) => void;
  maxCards: number;
  onFocusTarget?: (targetId: string) => void;
}

export function CardsEditor({ cards, onChange, maxCards, onFocusTarget }: CardsEditorProps) {
  const update = (id: string, patch: Partial<CardItem>) =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const add = () => {
    if (cards.length >= maxCards) return;
    onChange([
      ...cards,
      {
        id: `card-${Date.now()}`,
        imageUrl: "",
        title: "",
        description: "",
        ctaLabel: "",
        ctaUrl: "",
        enabled: true,
      },
    ]);
  };

  const remove = (id: string) => onChange(cards.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div key={card.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={card.enabled}
              onChange={(e) => update(card.id, { enabled: e.target.checked })}
              onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
              className="h-4 w-4 accent-primary"
              title="Mostrar / ocultar"
            />
            <span className="flex-1 text-sm font-medium">Card</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
              onClick={() => remove(card.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ImageInput
            label=""
            value={card.imageUrl}
            onFocusTarget={() => onFocusTarget?.(cardEditTarget(card.id))}
            onChange={(v) => update(card.id, { imageUrl: v })}
          />
          <Input
            value={card.title}
            onChange={(e) => update(card.id, { title: e.target.value })}
            onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
            placeholder="Título"
            className="h-9"
          />
          <Textarea
            value={card.description}
            onChange={(e) => update(card.id, { description: e.target.value })}
            onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
            placeholder="Descripción"
            className="min-h-16"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={card.ctaLabel}
              onChange={(e) => update(card.id, { ctaLabel: e.target.value })}
              onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
              placeholder="Texto CTA"
              className="h-9"
            />
            <Input
              value={card.ctaUrl}
              onChange={(e) => update(card.id, { ctaUrl: e.target.value })}
              onFocus={() => onFocusTarget?.(cardEditTarget(card.id))}
              placeholder="URL CTA"
              className="h-9"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={cards.length >= maxCards}
      >
        <Plus className="mr-1 h-4 w-4" /> Agregar card
      </Button>
    </div>
  );
}
