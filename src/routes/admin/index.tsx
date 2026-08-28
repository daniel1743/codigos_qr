import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "../../components/admin/AdminPanel";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

function AdminIndexPage() {
  return <AdminPanel />;
}
