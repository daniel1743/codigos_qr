import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "../components/admin/AdminPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow,noarchive" }],
  }),
  component: AdminPanelPage,
});

function AdminPanelPage() {
  return <AdminPanel />;
}
