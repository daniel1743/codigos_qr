import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "../components/Auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "register" ? "register" : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { mode } = Route.useSearch();
  return (
    <Auth
      showPlatformMenu
      navigateAfterLogin
      premium
      initialMode={mode === "register" ? "signup" : "login"}
    />
  );
}
