import { PERSONALITIES } from "@/lib/onboarding/config";
import type { VisualPersonality } from "@/lib/onboarding/types";
import { OptionGroup, StepHeading } from "./primitives";

function PersonalityVisual({ p }: { p: (typeof PERSONALITIES)[number] }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: p.radius,
        background: `linear-gradient(135deg, ${p.swatch[0]} 0%, ${p.swatch[1]} 100%)`,
      }}
    >
      <span
        className="font-brand"
        style={{ color: "#FFFFFF", fontWeight: p.weight, fontSize: 15, letterSpacing: "-0.01em" }}
      >
        Aa
      </span>
    </span>
  );
}

export function StepPersonality({
  value,
  onChange,
}: {
  value: VisualPersonality | null;
  onChange: (personality: VisualPersonality) => void;
}) {
  return (
    <>
      <StepHeading
        title="¿Cómo quieres que se sienta tu página?"
        note="Solo el carácter visual. Podrás ajustarlo después."
      />
      <OptionGroup
        label="Personalidad visual"
        options={PERSONALITIES.map((p) => ({
          id: p.id,
          label: p.label,
          caption: p.caption,
          visual: <PersonalityVisual p={p} />,
        }))}
        value={value}
        onChange={onChange}
      />
    </>
  );
}
