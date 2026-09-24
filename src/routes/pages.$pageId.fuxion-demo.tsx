import { createFileRoute } from "@tanstack/react-router";
import { App as PremiumPrototype } from "@/features/experimental-premium-editor/App";
import { FuxionAssistant } from "@/components/fuxion-assistant/FuxionAssistant";

export const Route = createFileRoute("/pages/$pageId/fuxion-demo")({
  component: PremiumPrototypePage,
});

function PremiumPrototypePage() {
  const { pageId } = Route.useParams();
  return (
    <div className="w-full h-[100dvh] flex flex-col relative">
      <PremiumPrototype initialState="default" showAdvancedPanel={false} pageId={pageId} />
      <FuxionAssistant />
    </div>
  );
}
