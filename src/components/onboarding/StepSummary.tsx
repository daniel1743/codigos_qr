import { ACTIONS, BUSINESS_TYPES, GOALS, OTHER_BUSINESS_ID, PERSONALITIES } from "@/lib/onboarding/config";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";
import { StepHeading, focusRing } from "./primitives";

export function StepSummary({
  draft,
  onEdit,
}: {
  draft: OnboardingDraft;
  onEdit: (step: number) => void;
}) {
  const business = BUSINESS_TYPES.find((b) => b.id === draft.business_type);
  const goal = GOALS.find((g) => g.id === draft.primary_goal);
  const personality = PERSONALITIES.find((p) => p.id === draft.visual_personality);
  const action = ACTIONS.find((a) => a.id === draft.primary_action.type);

  const rows: { label: string; value: string; step: number }[] = [
    {
      label: "Tu actividad",
      value:
        draft.business_type === OTHER_BUSINESS_ID && draft.business_other
          ? draft.business_other
          : (business?.label ?? "—"),
      step: 1,
    },
    { label: "Objetivo", value: goal?.label ?? "—", step: 2 },
    { label: "Personalidad", value: personality?.label ?? "—", step: 3 },
    {
      label: "Identidad",
      value: [draft.identity.name, draft.identity.profession].filter(Boolean).join(" · ") || "—",
      step: 4,
    },
    {
      label: "Acción principal",
      value: action ? `${action.label} · ${draft.primary_action.value}` : "—",
      step: 5,
    },
  ];

  return (
    <>
      <StepHeading
        title="Tu página está lista para tomar forma"
        note="Revisa tus respuestas antes de continuar."
      />
      <ul
        className="overflow-hidden"
        style={{
          borderRadius: "var(--brand-radius-lg)",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--surface-primary)",
        }}
      >
        {rows.map((r, i) => (
          <li
            key={r.label}
            className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-4)]"
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-default)" }}
          >
            <span className="min-w-0 flex-1">
              <span
                className="font-brand block"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-label-size)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {r.label}
              </span>
              <span
                className="font-brand mt-[2px] block break-words font-semibold"
                style={{ color: "var(--text-primary)", fontSize: "var(--text-body-size)" }}
              >
                {r.value}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onEdit(r.step)}
              aria-label={`Editar ${r.label}`}
              className={cn("font-brand shrink-0 px-[var(--space-2)] font-semibold", focusRing)}
              style={{
                color: "var(--brand-primary)",
                minHeight: "var(--touch-target-min)",
                fontSize: "var(--text-ui-size)",
                borderRadius: "var(--brand-radius-sm)",
              }}
            >
              Editar
            </button>
          </li>
        ))}
      </ul>
      <p
        className="font-brand mt-[var(--space-4)]"
        style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption-size)" }}
      >
        Aún no se publica nada. Solo guardamos tus respuestas en este dispositivo.
      </p>
    </>
  );
}
