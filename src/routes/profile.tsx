import { createFileRoute } from "@tanstack/react-router";
import { MyProfilePage } from "../components/profile/MyProfilePage";
import { AppShell } from "../components/app-shell/AppShell";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <MyProfilePage />
    </AppShell>
  );
}
