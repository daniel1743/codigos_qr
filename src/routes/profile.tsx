import { createFileRoute } from "@tanstack/react-router";
import { MyProfilePage } from "../components/profile/MyProfilePage";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return <MyProfilePage />;
}
