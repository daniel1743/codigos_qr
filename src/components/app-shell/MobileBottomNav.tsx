import { BarChart3, Globe2, Home, Menu, QrCode } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import type { ShellPageState } from "./AppShell";

function pageDestination(pageState: ShellPageState) {
  if (pageState.count === 0) return { label: "Crear", to: "/pages/new" as const };
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
  onMenuClick,
}: {
  pageState: ShellPageState;
  onMenuClick: () => void;
}) {
  const { pathname } = useLocation();
  const page = pageDestination(pageState);
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
      className="fixed inset-x-3 bottom-3 z-30 grid min-h-[66px] grid-cols-5 rounded-2xl border border-[#e4ebf5] bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(11,26,46,.12)] backdrop-blur lg:hidden"
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
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold ${active ? "bg-[#eaf2ff] text-[#0d47a1]" : "text-[#7a889b]"}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-[#7a889b]"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" aria-hidden />
        <span>Menú</span>
      </button>
    </nav>
  );
}
