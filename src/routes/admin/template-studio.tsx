import { createFileRoute } from "@tanstack/react-router";
import { AdminRouteGuard } from "../../components/admin/AdminRouteGuard";
import { EditorPage } from "../editor";

export const Route = createFileRoute("/admin/template-studio")({
  component: AdminTemplateStudioPage,
});

function AdminTemplateStudioPage() {
  return (
    <AdminRouteGuard>
      <EditorPage />
    </AdminRouteGuard>
  );
}
