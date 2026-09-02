import { GOALS } from "@/lib/onboarding/config";
import type { PrimaryGoal } from "@/lib/onboarding/types";
import { OptionGroup, StepHeading } from "./primitives";

export function StepGoal({
  value,
  onChange,
}: {
  value: PrimaryGoal | null;
  onChange: (goal: PrimaryGoal) => void;
}) {
  return (
    <>
      <StepHeading title="¿Qué quieres conseguir?" note="Elige un objetivo principal." />
      <OptionGroup label="Objetivo principal" options={GOALS} value={value} onChange={onChange} />
    </>
  );
}
