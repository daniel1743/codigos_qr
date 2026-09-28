import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, FileLock2, Globe2, HelpCircle, Home, QrCode, Settings } from "lucide-react";
import Logo from "../brand/Logo";
import type { ShellPageState, ShellUser } from "./AppShell";

type Props = { user: ShellUser | null; pageState: ShellPageState };

function pageDestination(pageState: ShellPageState) {
  if (pageState.count === 0) return { label: "Crear página", to: "/pages/new" as const };
  if (pageState.count === 1 && pageState.primaryPageId) {
    return {
      label: "Mi página",
      to: "/pages/$pageId" as const,
      params: { pageId: pageState.primaryPageId },
    };
  }
  return { label: "Mis páginas", to: "/pages" as const };
}

function active(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavLink({
  to,
  params,
  label,
  icon: Icon,
  isActive,
}: {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: typeof Home;
  isActive: boolean;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-[#eaf2ff] text-[#0d47a1]" : "text-[#526176] hover:bg-[#f4f7fb] hover:text-[#0d47a1]"}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DesktopSidebar({ user, pageState }: Props) {
  const { pathname } = useLocation();
  const page = pageDestination(pageState);
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-[#e6edf7] bg-white lg:flex">
      <div className="flex h-[76px] shrink-0 items-center border-b border-[#eef2f7] px-6">
        <Link to="/profile" aria-label="Cripqer" className="flex items-center">
          <Logo
            variant="horizontal"
            theme="default"
            responsiveSymbol
            showTagline={false}
            className="h-8"
          />
        </Link>
      </div>
      <nav
        className="scrollbar-none flex-1 overflow-y-auto px-4 py-6"
        aria-label="Navegación principal"
      >
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa7b8]">
          Espacio de trabajo
        </p>
        <div className="space-y-1">
          <NavLink
            to="/profile"
            label="Inicio"
            icon={Home}
            isActive={active(pathname, ["/profile"])}
          />
          <NavLink
            to={page.to}
            params={page.params}
            label={page.label}
            icon={Globe2}
            isActive={active(pathname, ["/page", "/pages"])}
          />
          <NavLink to="/qr" label="QR" icon={QrCode} isActive={active(pathname, ["/qr"])} />
          {pageState.primaryPageId && (
            <NavLink
              to="/pages/$pageId/analytics"
              params={{ pageId: pageState.primaryPageId }}
              label="Analytics"
              icon={BarChart3}
              isActive={pathname.endsWith("/analytics")}
            />
          )}
          <NavLink
            to="/encrypted-documents"
            label="Documentos"
            icon={FileLock2}
            isActive={active(pathname, ["/encrypted-documents"])}
          />
        </div>
      </nav>
      <div className="shrink-0 border-t border-[#eef2f7] p-4">
        <Link
          to="/account"
          className="mb-3 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#f4f7fb]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eaf2ff] text-sm font-bold text-[#0d47a1]">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (user?.name?.charAt(0).toUpperCase() ?? "C")
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#1a2433]">
              {user?.name ?? "Tu cuenta"}
            </span>
            <span className="block truncate text-xs text-[#8290a3]">
              {user?.planLabel ?? "Plan gratuito"}
            </span>
          </span>
          <Settings className="h-4 w-4 shrink-0 text-[#9aa7b8]" aria-hidden />
        </Link>
        <Link
          to="/account"
          className="flex items-center gap-2 px-2 text-xs text-[#8290a3] hover:text-[#0d47a1]"
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
          Ayuda y soporte
        </Link>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
