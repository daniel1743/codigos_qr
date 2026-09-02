import Logo from "@/components/brand/Logo";
import type { OnboardingIntentV1 } from "@/lib/onboarding/types";
import { BrandButton, MotionStyles, surface } from "./primitives";

export function CompletionScreen({
  intent,
  debug = false,
  showPayload,
  onTogglePayload,
  onRestart,
}: {
  intent: OnboardingIntentV1 | null;
  debug?: boolean;
  showPayload: boolean;
  onTogglePayload: () => void;
  onRestart: () => void;
}) {
  const done = Boolean(intent);
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-[var(--space-4)] py-[var(--space-12)]"
      style={surface}
    >
      <div className="cq-step w-full max-w-[520px] text-center">
        <div className="mb-[var(--space-6)] flex justify-center">
          <Logo variant="symbol" width={64} height={64} title="Cripqer" />
        </div>
        <h1
          className="font-brand font-bold"
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-h1-size)",
            lineHeight: "var(--text-h1-leading)",
            letterSpacing: "-0.015em",
          }}
        >
          {done ? "Tus respuestas están listas" : "Estamos preparando tu página"}
        </h1>
        <p
          className="font-brand mx-auto mt-[var(--space-3)] max-w-[38ch]"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-body-size)",
            lineHeight: "var(--text-body-leading)",
          }}
        >
          {done
            ? "Guardamos tu intención de diseño. La generación de la página llega en la siguiente fase."
            : "Un momento mientras ordenamos lo que nos contaste."}
        </p>

        <div
          className="mx-auto mt-[var(--space-8)] overflow-hidden"
          style={{
            width: 200,
            height: 4,
            borderRadius: "var(--brand-radius-pill)",
            backgroundColor: "var(--border-default)",
          }}
          role="progressbar"
          aria-label="Preparando tu página"
          aria-valuenow={done ? 100 : 60}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: "100%",
              width: done ? "100%" : "60%",
              backgroundColor: "var(--brand-primary)",
              transition: "width var(--duration-slow) var(--ease-standard)",
            }}
          />
        </div>

        {done && (
          <>
            <div className="mt-[var(--space-6)] flex justify-center">
              <span
                className="font-brand inline-flex items-center gap-2 px-[var(--space-3)] py-[var(--space-2)] font-semibold"
                style={{
                  backgroundColor: "var(--brand-gold-soft)",
                  color: "var(--brand-gold-contrast)",
                  border: "1px solid var(--brand-gold)",
                  borderRadius: "var(--brand-radius-pill)",
                  fontSize: "var(--text-caption-size)",
                }}
              >
                Onboarding completado
              </span>
            </div>

            <div className="mt-[var(--space-8)] flex flex-wrap justify-center gap-[var(--space-3)]">
              {debug && (
                <BrandButton variant="secondary" onClick={onTogglePayload}>
                  {showPayload ? "Ocultar payload" : "Ver payload (debug)"}
                </BrandButton>
              )}
              <BrandButton variant="ghost" onClick={onRestart}>
                Reiniciar
              </BrandButton>
            </div>

            {debug && showPayload && (
              <pre
                className="cq-step mt-[var(--space-6)] overflow-x-auto text-left"
                style={{
                  backgroundColor: "var(--surface-inverse)",
                  color: "var(--text-inverse)",
                  borderRadius: "var(--brand-radius-md)",
                  padding: "var(--space-4)",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(intent, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
      <MotionStyles />
    </div>
  );
}
