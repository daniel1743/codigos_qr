import { createFileRoute } from "@tanstack/react-router";
import { OnboardingTestProfileGate } from "../components/onboarding-v2";

/**
 * Isolated manual QA route for the approved premium onboarding flow.
 *
 * This route intentionally shares the exact implementation used by
 * `/onboarding-preview`; it owns no state, generation or persistence logic.
 */
export const Route = createFileRoute("/onboarding-test")({
  validateSearch: (search: Record<string, unknown>) => ({
    profileId: typeof search["profileId"] === "string" ? search["profileId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onboarding Test | Cripqer" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: OnboardingTestPage,
});

function OnboardingTestPage() {
  const { profileId } = Route.useSearch();
  return <OnboardingTestProfileGate requestedProfileId={profileId ?? null} />;
}
