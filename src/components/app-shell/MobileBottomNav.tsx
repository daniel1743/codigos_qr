import { BarChart3, Globe2, Home, Menu, QrCode } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import type { ShellPageState } from "./AppShell";

function pageDestination(pageState: ShellPageState, isAdmin: boolean) {
  if (pageState.count === 0 && isAdmin) return { label: "Crear", to: "/pages/new" as const };
  if (pageState.count === 0) return { label: "Mi página", to: "/profile" as const };
  if (pageState.count === 1 && pageState.primaryPageId)
    return {
      label: "Mi página",
      to: "/pages/$pageId" as const,
      params: { pageId: pageState.primaryPageId },
    };
  return { label: "Mis páginas", to: "/pages" as const };
}

export default function MobileBottomNav({
  pageState,
  isAdmin,
  onMenuClick,
}: {
  pageState: ShellPageState;
  isAdmin: boolean;
  onMenuClick: () => void;
}) {
  const { pathname } = useLocation();
  const page = pageDestination(pageState, isAdmin);
  const items = [
    { label: "Inicio", to: "/profile", icon: Home },
    { label: page.label, to: page.to, params: page.params, icon: Globe2 },
    { label: "QR", to: "/qr", icon: QrCode },
    ...(pageState.primaryPageId
      ? [
          {
            label: "Analytics",
            to: "/pages/$pageId/analytics",
            params: { pageId: pageState.primaryPageId },
            icon: BarChart3,
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-30 mx-auto grid min-h-[68px] max-w-[440px] grid-cols-5 rounded-cq-2xl bg-white/95 p-1.5 shadow-nav ring-1 ring-cq-line/80 backdrop-blur-sm lg:hidden"
    >
      {items.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.label}
            to={item.to as never}
            params={item.params as never}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-cq-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${active ? "bg-cq-blue-50 ring-1 ring-inset ring-cq-blue-100" : ""}`}
          >
            <Icon
              className={`h-[21px] w-[21px] transition-colors ${active ? "text-cq-blue" : "text-cq-subtle"}`}
              strokeWidth={active ? 2.3 : 1.7}
              fill={active ? "rgba(30, 86, 224, 0.14)" : "none"}
              aria-hidden
            />
            <span
              className={`max-w-full truncate text-[10.5px] leading-none transition-colors ${active ? "font-semibold text-cq-blue" : "font-medium text-cq-muted"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-cq-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200"
        aria-label="Abrir menú"
      >
        <Menu className="h-[21px] w-[21px] text-cq-subtle" strokeWidth={1.7} aria-hidden />
        <span className="text-[10.5px] font-medium leading-none text-cq-muted">Menú</span>
      </button>
    </nav>
  );
}
