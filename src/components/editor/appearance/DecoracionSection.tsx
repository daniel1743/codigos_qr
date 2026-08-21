import type { ElementType } from "react";
import { Circle, Cloud, Layers, Minus, RotateCcw, Sparkles, Square } from "lucide-react";
import type { Profile } from "../../../types/database";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";

interface DecoracionSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

type DecorativeOption = {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  updates: Partial<Profile> | ((profile: Partial<Profile>) => Partial<Profile>);
  active: (profile: Partial<Profile>) => boolean;
};

const shapeOptions: DecorativeOption[] = [
  {
    id: "none",
    title: "Minimalista",
    description: "Sin geometría visible.",
    icon: RotateCcw,
    updates: { decor_shape: "none" },
    active: (profile) => !profile.decor_shape || profile.decor_shape === "none",
  },
  {
    id: "circles",
    title: "Anillos Base",
    description: "Órbitas concéntricas SVG.",
    icon: Circle,
    updates: { decor_shape: "circles" },
    active: (profile) => profile.decor_shape === "circles",
  },
  {
    id: "squares",
    title: "Malla Cuadrada",
    description: "Marcos rotados técnicos.",
    icon: Square,
    updates: { decor_shape: "squares" },
    active: (profile) => profile.decor_shape === "squares",
  },
  {
    id: "lines",
    title: "Flowlines",
    description: "Líneas de trazado premium.",
    icon: Minus,
    updates: { decor_shape: "lines" },
    active: (profile) => profile.decor_shape === "lines",
  },
  {
    id: "mixed",
    title: "Vanguardia",
    description: "Geometría avanzada.",
    icon: Sparkles,
    updates: { decor_shape: "mixed" },
    active: (profile) => profile.decor_shape === "mixed",
  },
];

const effectOptions: DecorativeOption[] = [
  {
    id: "particles_none",
    title: "Plano",
    description: "Fondo estático.",
    icon: RotateCcw,
    updates: { decor_particles: "none" },
    active: (profile) => !profile.decor_particles || profile.decor_particles === "none",
  },
  {
    id: "particles_dots",
    title: "Cinemático",
    description: "Nodos flotantes 3D.",
    icon: Sparkles,
    updates: { decor_particles: "dots" },
    active: (profile) => profile.decor_particles === "dots",
  },
  {
    id: "smoke_soft",
    title: "Aura / Glow",
    description: "Backdrop-filter radial.",
    icon: Cloud,
    updates: (profile) => ({ decor_smoke: profile.decor_smoke === "soft" ? "none" : "soft" }),
    active: (profile) => profile.decor_smoke === "soft",
  },
  {
    id: "shadow_soft",
    title: "Shadow Base",
    description: "Gradiente de profundidad.",
    icon: Layers,
    updates: (profile) => ({ decor_shadow: profile.decor_shadow === "soft" ? "none" : "soft" }),
    active: (profile) => profile.decor_shadow === "soft",
  },
];

const intensityOptions = [
  { id: "subtle", title: "Sutil" },
  { id: "medium", title: "Media" },
  { id: "strong", title: "Alta" },
];

function OptionCard({
  option,
  active,
  onApply,
}: {
  option: DecorativeOption;
  active: boolean;
  onApply: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onApply}
      aria-pressed={active}
      className={`min-w-[136px] shrink-0 rounded-2xl border p-3 text-left transition-all ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-md"
          : "border-border bg-card text-foreground hover:border-slate-300 hover:bg-muted/60"
      }`}
    >
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-white/12 text-white" : "bg-muted text-slate-700"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="block text-sm font-semibold leading-tight">{option.title}</span>
      <span
        className={`mt-1 block text-xs leading-snug ${active ? "text-white/70" : "text-muted-foreground"}`}
      >
        {option.description}
      </span>
    </button>
  );
}

function OptionRow({
  options,
  profile,
  onChange,
}: {
  options: DecorativeOption[];
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
      {options.map((option) => (
        <OptionCard
          key={option.id}
          option={option}
          active={option.active(profile)}
          onApply={() =>
            onChange(
              typeof option.updates === "function" ? option.updates(profile) : option.updates,
            )
          }
        />
      ))}
    </div>
  );
}

export function DecoracionSection({ profile, onChange }: DecoracionSectionProps) {
  const activeIntensity = profile.decor_intensity || "subtle";

  return (
    <div className="space-y-7 rounded-xl border bg-card p-4 shadow-sm">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Formas de fondo</Label>
          <span className="text-[11px] text-muted-foreground">Desliza</span>
        </div>
        <OptionRow options={shapeOptions} profile={profile} onChange={onChange} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Ambiente</Label>
          <span className="text-[11px] text-muted-foreground">Tap para activar</span>
        </div>
        <OptionRow options={effectOptions} profile={profile} onChange={onChange} />
      </section>

      <section className="space-y-3 rounded-2xl border bg-muted/30 p-4">
        <Label className="text-sm font-semibold">Intensidad</Label>
        <div className="grid grid-cols-3 gap-2">
          {intensityOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={activeIntensity === option.id ? "default" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => onChange({ decor_intensity: option.id })}
            >
              {option.title}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/30 p-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={() =>
            onChange({
              decor_shape: "none",
              decor_particles: "none",
              decor_smoke: "none",
              decor_shadow: "none",
              decor_intensity: "subtle",
            })
          }
        >
          Limpiar elementos
        </Button>
      </section>
    </div>
  );
}
