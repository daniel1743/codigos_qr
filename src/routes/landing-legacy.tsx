import { createFileRoute } from "@tanstack/react-router";
import CripqerLanding from "../components/CripqerLanding";

/**
 * Rollback surface for the public root.
 *
 * The approved conversational landing owns `/` since the landing activation.
 * This route keeps the previous Premium Black narrative landing fully mounted
 * and reachable so the cutover can be reversed without restoring code:
 * point `/` back at this component (or redirect `/` here) if the activation
 * has to be rolled back. It is deliberately not linked from anywhere and is
 * marked noindex so it cannot compete with the public root in search.
 */
export const Route = createFileRoute("/landing-legacy")({
  head: () => ({
    meta: [
      { title: "Cripqer — Landing anterior (rollback)" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: LandingLegacy,
});

function LandingLegacy() {
  return <CripqerLanding />;
}
