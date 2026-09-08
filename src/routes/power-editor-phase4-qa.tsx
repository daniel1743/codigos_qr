import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { PremiumTemplateStudio } from "@/premium-template-studio";
import { createPhase4SelectionQaConfig } from "@/premium-template-studio/fixtures/powerEditorPhase4SelectionQaFixture";

/**
 * DEV-ONLY QA seam for Phase 4 selection autofocus (SELECT-01..08).
 *
 * Loads a deterministic, valid Power Editor document without touching any
 * Supabase profile, canonical persistence, or production storage. It is
 * unreachable in production (guarded by `import.meta.env.DEV` + `notFound()`),
 * is absent from navigation, and disables autosave so no writes occur.
 */
export const Route = createFileRoute("/power-editor-phase4-qa")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow, noarchive" }],
  }),
  component: PowerEditorPhase4QaPage,
});

function PowerEditorPhase4QaPage() {
  const config = useMemo(() => createPhase4SelectionQaConfig(), []);
  return <PremiumTemplateStudio config={config} autoSave={false} />;
}
