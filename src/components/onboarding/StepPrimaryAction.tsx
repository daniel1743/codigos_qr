import { ACTIONS, ACTION_FIELDS } from "@/lib/onboarding/config";
import type { PrimaryActionType } from "@/lib/onboarding/types";
import { validateActionValue } from "@/lib/onboarding/validation";
import { Field, OptionGroup, StepHeading, controlStyle, focusRing } from "./primitives";

export function StepPrimaryAction({
  action,
  error,
  onChangeType,
  onChangeValue,
  onValidate,
}: {
  action: { type: PrimaryActionType | null; value: string };
  error: string | null;
  onChangeType: (type: PrimaryActionType) => void;
  onChangeValue: (value: string) => void;
  onValidate: (error: string | null) => void;
}) {
  const field = action.type ? ACTION_FIELDS[action.type] : null;

  return (
    <>
      <StepHeading
        title="¿Cómo quieres que te contacten?"
        note="Elige la acción principal de tu página."
      />
      <OptionGroup
        label="Acción principal"
        options={ACTIONS}
        value={action.type}
        onChange={onChangeType}
      />
      {action.type && field && (
        <div className="cq-step mt-[var(--space-6)]">
          <Field label={field.label} hint={field.hint} error={error}>
            <input
              type="text"
              inputMode={field.inputMode}
              maxLength={200}
              value={action.value}
              onChange={(e) => onChangeValue(e.target.value)}
              placeholder={field.placeholder}
              onBlur={(e) =>
                onValidate(
                  action.type && e.target.value.trim()
                    ? validateActionValue(action.type, e.target.value)
                    : null,
                )
              }
              aria-invalid={Boolean(error)}
              style={controlStyle(Boolean(error))}
              className={focusRing}
            />
          </Field>
        </div>
      )}
    </>
  );
}
