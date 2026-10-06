import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { selectLandingPage } from "../../lib/editor-routing/resolveCanonicalMagicPage";
import { pageService } from "../../services/page.service";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawer from "./MobileDrawer";
import TopHeader from "./TopHeader";
import { isUserAdmin } from "../../lib/admin-check";

export type ShellUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
};

export type ShellPageState = { count: number; primaryPageId: string | null };

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<ShellUser | null>(null);
  const [pageState, setPageState] = useState<ShellPageState>({ count: 0, primaryPageId: null });

  useEffect(() => {
    let active = true;
    const supabase = getBrowserSupabaseClient();
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || !active) return;
      const authUser = data.user;
      const admin = await isUserAdmin(supabase, authUser.id);
      setUser({
        name:
          (typeof authUser.user_metadata?.full_name === "string" &&
            authUser.user_metadata.full_name) ||
          (typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name) ||
          authUser.email?.split("@")[0] ||
          "Tu cuenta",
        email: authUser.email ?? "",
        avatarUrl:
          typeof authUser.user_metadata?.avatar_url === "string"
            ? authUser.user_metadata.avatar_url
            : null,
        isAdmin: admin,
      });
      try {
        const pages = await pageService.listOwnPages(supabase, authUser.id);
        // C3.2.1 — the shell's primary page is the landing, never the full
        // catalog child (`page_type = "catalog"`) that C3.2 made editable.
        if (active) setPageState({ count: pages.length, primaryPageId: selectLandingPage(pages)?.id ?? null });
      } catch (pageError) {
        console.error("Error resolving shell pages:", pageError);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-cq-canvas font-cq text-cq-ink">
      <div className="flex min-h-screen">
        <DesktopSidebar user={user} pageState={pageState} isAdmin={user?.isAdmin ?? false} />
        <div className="min-w-0 flex-1">
          <TopHeader user={user} onMenuClick={() => setDrawerOpen(true)} />
          <main className="pb-28 lg:pb-0">{children}</main>
        </div>
      </div>
      <MobileDrawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        user={user}
        pageState={pageState}
        isAdmin={user?.isAdmin ?? false}
      />
      <MobileBottomNav pageState={pageState} isAdmin={user?.isAdmin ?? false} onMenuClick={() => setDrawerOpen(true)} />
    </div>
  );
}

export default AppShell;
