import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { pageService } from "../../services/page.service";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawer from "./MobileDrawer";
import TopHeader from "./TopHeader";

export type ShellUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  planLabel?: string;
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
        planLabel: "Plan gratuito",
      });
      try {
        const pages = await pageService.listOwnPages(supabase, authUser.id);
        if (active) setPageState({ count: pages.length, primaryPageId: pages[0]?.id ?? null });
      } catch (pageError) {
        console.error("Error resolving shell pages:", pageError);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7faff] text-[#111827]">
      <div className="flex min-h-screen">
        <DesktopSidebar user={user} pageState={pageState} />
        <div className="min-w-0 flex-1">
          <TopHeader user={user} onMenuClick={() => setDrawerOpen(true)} />
          <main className="pb-24 lg:pb-0">{children}</main>
        </div>
      </div>
      <MobileDrawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        user={user}
        pageState={pageState}
      />
      <MobileBottomNav pageState={pageState} onMenuClick={() => setDrawerOpen(true)} />
    </div>
  );
}

export default AppShell;
