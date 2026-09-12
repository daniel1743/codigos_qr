import { Link, useLocation } from "@tanstack/react-router";
import { FileLock2, Globe, Home, Pencil, UserCircle } from "lucide-react";
import { PLATFORM_BRAND } from "../platform/platform-brand";

const ITEMS = [
  { id: "inicio", label: "Inicio", href: "/profile", icon: Home },
  { id: "pagina", label: "Página", href: "/page", icon: Globe },
  { id: "editar", label: "Editar", href: "/editor", icon: Pencil },
  { id: "docs", label: "Docs", href: "/encrypted-documents", icon: FileLock2 },
  { id: "perfil", label: "Perfil", href: "/account", icon: UserCircle },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname === `${href}/`;
}

export function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            to={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors"
            style={{ color: active ? PLATFORM_BRAND.colors.blue : PLATFORM_BRAND.colors.textSecondary }}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{item.label}</span>
            {active && (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: PLATFORM_BRAND.colors.gold }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
