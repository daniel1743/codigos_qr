import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "../components/Auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  return <Auth showPlatformMenu />;
}
