import { createFileRoute } from "@tanstack/react-router";
import { App as PremiumPrototype } from "@/features/experimental-premium-editor/App";

export const Route = createFileRoute("/pages/$pageId/edit-prototype")({
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
