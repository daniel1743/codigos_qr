import { Link, useLocation } from "@tanstack/react-router";
import { FileLock2, Globe, Home, Pencil, UserCircle } from "lucide-react";
import Logo from "../brand/Logo";
import { PLATFORM_BRAND } from "../platform/platform-brand";

type NavItem = { id: string; label: string; href: string; icon: typeof Home };

const PRIMARY_ITEMS: NavItem[] = [
  { id: "inicio", label: "Inicio", href: "/profile", icon: Home },
  { id: "pagina", label: "Mi página", href: "/page", icon: Globe },
  { id: "editor", label: "Editor", href: "/editor", icon: Pencil },
  { id: "docs", label: "Documentos", href: "/encrypted-documents", icon: FileLock2 },
];

const ACCOUNT_ITEM: NavItem = { id: "perfil", label: "Perfil", href: "/account", icon: UserCircle };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname === `${href}/`;
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#0D47A1] text-white"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function DesktopSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link to="/profile" aria-label="Cripqer" className="flex items-center">
          <Logo variant="horizontal" theme="default" responsiveSymbol showTagline={false} className="h-7" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {PRIMARY_ITEMS.map((item) => (
          <SidebarLink key={item.id} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <SidebarLink item={ACCOUNT_ITEM} active={isActive(pathname, ACCOUNT_ITEM.href)} />
      </div>

      <p className="shrink-0 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        Cripqer · v1.0.0
      </p>
    </aside>
  );
}

export default DesktopSidebar;
