import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MyProfilePage } from "../components/profile/MyProfilePage";
import { AppShell } from "../components/app-shell/AppShell";
import { resolvePostLoginTarget } from "../features/landing-lite/resumeAfterLogin";
import type { CreationResumeTarget } from "../features/landing-lite/resumeCreation";
import {
  resolveGuestDraftClaim,
  type GuestClaimNotice,
} from "../features/guest-editor/claimAfterLogin";
import { GuestClaimBanner } from "../features/guest-editor/GuestClaimBanner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

/**
 * Landing Launch Lite V2 — post-login destination (Option A).
 *
 * `Auth` keeps sending every authenticated visitor here, and this page decides once
 * where the visitor should be:
 *
 *   - a valid GUEST DRAFT exists (Guest Editor G6.1) -> it takes precedence and is
 *     transferred through the canonical claim; the visitor lands in the editor on their
 *     own card. The message is shown first when there is something to report (photos that
 *     still need to be picked again), so success is never claimed before verification;
 *   - no draft, but a pending creation intent -> the legacy canonical boundary runs,
 *     exactly as before (Landing Launch Lite V2, Option A);
 *   - no draft, no intent, no session or any failure -> the page behaves exactly as
 *     before, showing the profile.
 *
 * Nothing else about this route changes: same shell, same page. Both resolvers consume
 * their one-shot state before doing work and return null on every failure path, so this
 * effect cannot loop and cannot navigate twice.
 */
function ProfilePage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<GuestClaimNotice | null>(null);
  const [noticeTarget, setNoticeTarget] = useState<CreationResumeTarget | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const claim = await resolveGuestDraftClaim();
      if (!active) return;
      if (claim.target && !claim.notice?.mediaPendingLocal?.length) {
        await navigate(claim.target);
        return;
      }
      if (claim.notice) {
        setNotice(claim.notice);
        setNoticeTarget(claim.target);
        return;
      }
      const target = await resolvePostLoginTarget();
      if (active && target) await navigate(target);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AppShell>
      <GuestClaimBanner
        notice={notice}
        {...(noticeTarget ? { onOpen: () => void navigate(noticeTarget) } : {})}
      />
      <MyProfilePage />
    </AppShell>
  );
}
