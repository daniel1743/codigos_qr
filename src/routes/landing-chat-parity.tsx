import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApprovedChatLanding } from "../features/approved-chat-landing";
import type { StartAt } from "../features/approved-chat-landing/types/cripqer";

/**
 * Review surface for the approved conversational landing
 * (CRIPQER_APPROVED_CHAT_LANDING_EXACT_PORT_V1).
 *
 * The approved experience is ported exactly and can be reviewed here state by
 * state (?state=discover | converse | editor) while the visual parity gate is
 * run. It is deliberately NOT wired to the public entry route yet: the ported
 * flow still ends in the reference prototype editor, and the reference
 * production hand-off (MagicPageDocumentV1 + real Magic Editor) and the
 * assistant service adapters are the next phase.
 *
 * Rendered client-side only: the approved implementation reads
 * window.matchMedia while rendering (useMediaQuery), which would produce a
 * hydration mismatch if it were server-rendered.
 */
export const Route = createFileRoute("/landing-chat-parity")({
  head: () => ({
    meta: [
      { title: "Landing conversacional (revisión de paridad) — Cripqer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LandingChatParity,
});

function readStartAt(): StartAt {
  if (typeof window === "undefined") return "discover";
  const value = new URLSearchParams(window.location.search).get("state");
  return value === "converse" || value === "editor" ? value : "discover";
}

function LandingChatParity() {
  const [mounted, setMounted] = useState(false);
  const [startAt] = useState<StartAt>(readStartAt);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return <ApprovedChatLanding startAt={startAt} />;
}
