import { createFileRoute } from "@tanstack/react-router";
import { TemplateLabEditor } from "../components/template-lab/TemplateLabEditor";

/**
 * /template-lab — development/review route for the Basic Template Lab.
 * NOT linked from the landing or the public editor. This route is not part of
 * any public navigation.
 */
export const Route = createFileRoute("/template-lab")({
  component: TemplateLabPage,
});

function TemplateLabPage() {
  return <TemplateLabEditor />;
}
