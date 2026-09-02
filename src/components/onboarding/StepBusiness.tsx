import { BUSINESS_TYPES, OTHER_BUSINESS_ID } from "@/lib/onboarding/config";
import { Field, OptionGroup, StepHeading, controlStyle, focusRing } from "./primitives";

export function StepBusiness({
  businessType,
  businessOther,
  onChangeType,
  onChangeOther,
}: {
  businessType: string | null;
  businessOther: string | null;
  onChangeType: (id: string) => void;
  onChangeOther: (value: string) => void;
}) {
  return (
    <>
      <StepHeading title="¿Qué haces?" note="Elige la categoría que mejor te describe." />
      <OptionGroup
        label="Tipo de negocio"
        options={BUSINESS_TYPES}
        value={businessType}
        onChange={onChangeType}
      />
      {businessType === OTHER_BUSINESS_ID && (
        <div className="cq-step mt-[var(--space-4)]">
          <Field label="¿A qué te dedicas?" hint="Una línea es suficiente.">
            <input
              type="text"
              maxLength={60}
              value={businessOther ?? ""}
              onChange={(e) => onChangeOther(e.target.value)}
              placeholder="Ej: estudio de tatuajes"
              style={controlStyle()}
              className={focusRing}
            />
          </Field>
        </div>
      )}
    </>
  );
}
