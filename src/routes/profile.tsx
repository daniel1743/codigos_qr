import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MyProfilePage } from "../components/profile/MyProfilePage";
import { AppShell } from "../components/app-shell/AppShell";
import { resolvePostLoginTarget } from "../features/landing-lite/resumeAfterLogin";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

/**
 * Landing Launch Lite V2 — post-login destination (Option A).
 *
 * `Auth` keeps sending every authenticated visitor here, and this page decides once
 * where the visitor should be: a pending creation intent resolves through the
 * canonical boundary and the visitor lands in the editor; with no intent, no
 * session, or on any failure the resolver returns `null` and the page behaves
 * exactly as before, showing the profile.
 *
 * The resolver consumes its one-shot state before doing work and returns `null`
 * on every failure path, so this effect cannot loop and cannot navigate twice.
 */
function ProfilePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void (async () => {
      const target = await resolvePostLoginTarget();
      if (active && target) await navigate(target);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AppShell>
      <MyProfilePage />
    </AppShell>
  );
}
