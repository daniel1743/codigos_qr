import type { ReactNode } from "react";
import PlatformNavbar from "../brand/PlatformNavbar";
import { PLATFORM_NAV_ITEMS } from "../platform/platform-navigation";

const SHELL_NAV_ITEMS = PLATFORM_NAV_ITEMS.filter((item) => item.scope !== "admin");

/**
 * Authenticated Cripqer application frame.
 *
 * Reuses the EXISTING Cripqer `PlatformNavbar` (desktop top nav + mobile
 * hamburger sheet) as the single navigation authority — it reads
 * `PLATFORM_NAV_ITEMS`, so every destination is reachable without manual URLs.
 * There is no custom sidebar or bottom navigation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PlatformNavbar
        variant="editor"
        brandHref="/profile"
        logoTheme="inverse"
        className="sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 px-3 text-[#f5f2ea] backdrop-blur-xl lg:px-6"
        innerClassName="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4"
        brandClassName="shrink-0 transition-opacity hover:opacity-80"
        logoClassName="h-[34px] w-[34px] min-[420px]:w-[146px]"
        navItems={SHELL_NAV_ITEMS}
      />
      {children}
    </div>
  );
}

export default AppShell;
