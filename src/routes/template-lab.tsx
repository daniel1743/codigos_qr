import { createFileRoute } from "@tanstack/react-router";
import { TemplateLabEditor } from "../components/template-lab/TemplateLabEditor";
import { ProtectedRoute } from "../components/route-guards/ProtectedRoute";

/**
 * /template-lab — development/review route for the Basic Template Lab.
 * NOT linked from the landing or the public editor. This route is not part of
 * any public navigation.
 */
export const Route = createFileRoute("/template-lab")({
  component: TemplateLabPage,
});

function TemplateLabPage() {
  return (
    <ProtectedRoute access="admin">
      <TemplateLabEditor />
    </ProtectedRoute>
  );
}
