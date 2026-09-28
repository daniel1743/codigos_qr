import React from "react";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";
import type { HeroFusionMode } from "../../../../../premium-template-studio/types";

/**
 * L0 fusion modes. Fusion is a treatment, not a layout, so it lives in its own
 * control next to «Variante» instead of being merged into the variant list.
 */
export const heroFusionOptions: { value: HeroFusionMode; label: string; hint: string }[] = [
  { value: "none", label: "Ninguna", hint: "La portada conserva su borde y sombra actuales." },
  { value: "fade", label: "Difuminada", hint: "La foto se funde hacia el fondo de la página." },
  { value: "halo", label: "Halo", hint: "Contorno suave con el color de acento." },
  { value: "organic", label: "Orgánica", hint: "Esquinas asimétricas que rompen el rectángulo." },
  { value: "dominant", label: "Dominante", hint: "Sombra amplia que separa la portada del fondo." },
];

interface HeroFusionPickerProps {
  value: HeroFusionMode;
  onChange: (value: HeroFusionMode) => void;
}

export function HeroFusionPicker({ value, onChange }: HeroFusionPickerProps) {
  const hint = heroFusionOptions.find((o) => o.value === value)?.hint ?? "";
  return (
    <PanelSection title="Fusión con la página" hint={hint}>
      <Segmented
        ariaLabel="Fusión de la portada"
        options={heroFusionOptions.map((o) => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={onChange}
      />
    </PanelSection>
  );
}
