import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminPanelPage,
});

function AdminPanelPage() {
  return <Outlet />;
}
