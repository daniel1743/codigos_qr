import { createFileRoute } from "@tanstack/react-router";
import { PremiumOnboardingFlow } from "../components/onboarding-v2";
import { ProtectedRoute } from "../components/route-guards/ProtectedRoute";

/**
 * Internal-only QA seam for the approved premium onboarding pack.
 *
 * This route is deliberately not linked from signup or any production
 * registration flow.
 */
export const Route = createFileRoute("/onboarding-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    profileId: typeof search["profileId"] === "string" ? search["profileId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onboarding V2 Preview | Cripqer" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: OnboardingPreviewPage,
});

function OnboardingPreviewPage() {
  const { profileId } = Route.useSearch();
  return (
    <ProtectedRoute access="authenticated">
      <PremiumOnboardingFlow profileId={profileId ?? null} />
    </ProtectedRoute>
  );
}
