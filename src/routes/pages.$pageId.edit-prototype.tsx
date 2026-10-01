import { createFileRoute, notFound } from "@tanstack/react-router";
import { App as PremiumPrototype } from "@/features/experimental-premium-editor/App";

export const Route = createFileRoute("/pages/$pageId/edit-prototype")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: PremiumPrototypePage,
});

function PremiumPrototypePage() {
  const { pageId } = Route.useParams();
  return (
    <div className="w-full h-[100dvh] flex flex-col">
      <PremiumPrototype initialState="default" showAdvancedPanel={false} pageId={pageId} />
    </div>
  );
}
