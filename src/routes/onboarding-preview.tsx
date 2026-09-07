import type { CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { OnboardingV2Shell } from "../components/onboarding-v2";

/**
 * Internal-only QA seam for the approved onboarding pack.
 *
 * The current application has the brand artwork component but does not yet
 * expose the V1 token names consumed by this isolated flow. Keeping the
 * compatibility values here avoids changing the global platform theme or the
 * frozen onboarding components. This route is deliberately not linked from
 * signup or any production registration flow.
 */
const onboardingBrandTokens = {
  "--brand-primary": "#0d47a1",
  "--brand-primary-hover": "#0a3b86",
  "--brand-primary-soft": "#eaf1fb",
  "--brand-primary-contrast": "#ffffff",
  "--brand-gold": "#d4af37",
  "--brand-gold-soft": "#f8efcf",
  "--brand-gold-contrast": "#332700",
  "--surface-primary": "#ffffff",
  "--surface-secondary": "#f5f7fb",
  "--surface-inverse": "#0b1220",
  "--text-primary": "#172033",
  "--text-secondary": "#5b6576",
  "--text-inverse": "#ffffff",
  "--border-default": "#d9e0ea",
  "--border-strong": "#0d47a1",
  "--state-error": "#b42318",
  "--text-h1-size": "clamp(1.75rem, 5vw, 2.25rem)",
  "--text-h1-leading": "1.15",
  "--text-body-size": "1rem",
  "--text-body-leading": "1.5",
  "--text-ui-size": "0.875rem",
  "--text-ui-leading": "1.4",
  "--text-caption-size": "0.75rem",
  "--text-caption-leading": "1.4",
  "--text-label-size": "0.6875rem",
  "--tracking-label": "0.08em",
  "--brand-radius-sm": "0.5rem",
  "--brand-radius-md": "0.75rem",
  "--brand-radius-lg": "1rem",
  "--brand-radius-pill": "999px",
  "--space-1": "0.25rem",
  "--space-2": "0.5rem",
  "--space-3": "0.75rem",
  "--space-4": "1rem",
  "--space-5": "1.25rem",
  "--space-6": "1.5rem",
  "--space-7": "1.75rem",
  "--space-8": "2rem",
  "--space-9": "2.25rem",
  "--space-10": "2.5rem",
  "--space-11": "2.75rem",
  "--space-12": "3rem",
  "--space-13": "3.25rem",
  "--space-14": "3.5rem",
  "--space-15": "3.75rem",
  "--space-16": "4rem",
  "--duration-fast": "140ms",
  "--duration-base": "220ms",
  "--duration-slow": "500ms",
  "--ease-standard": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "--touch-target-min": "48px",
} as CSSProperties;

const onboardingTypography = `
  .onboarding-brand-scope .font-brand {
    font-family: Montserrat, Arial, Helvetica, sans-serif;
  }
  .onboarding-brand-scope button,
  .onboarding-brand-scope input,
  .onboarding-brand-scope textarea {
    font-family: inherit;
  }
`;

export const Route = createFileRoute("/onboarding-preview")({
  head: () => ({
    meta: [
      { title: "Onboarding V2 Preview | Cripqer" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: OnboardingPreviewPage,
});

function OnboardingPreviewPage() {
  return (
    <div className="onboarding-brand-scope" style={onboardingBrandTokens}>
      <style>{onboardingTypography}</style>
      <OnboardingV2Shell debug />
    </div>
  );
}
