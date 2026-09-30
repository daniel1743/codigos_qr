import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, FileLock2, Globe2, HelpCircle, Home, QrCode, Settings } from "lucide-react";
import Logo from "../brand/Logo";
import type { ShellPageState, ShellUser } from "./AppShell";

type Props = { user: ShellUser | null; pageState: ShellPageState; isAdmin: boolean };

function pageDestination(pageState: ShellPageState, isAdmin: boolean) {
  if (pageState.count === 0 && isAdmin) return { label: "Crear página", to: "/pages/new" as const };
  if (pageState.count === 0) return { label: "Mi página", to: "/profile" as const };
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
  params?: Record<string, string> | undefined;
  label: string;
  icon: typeof Home;
  isActive: boolean;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-cq-sm px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${isActive ? "bg-cq-blue-50 text-cq-blue" : "text-cq-muted hover:bg-cq-canvas hover:text-cq-blue"}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DesktopSidebar({ user, pageState, isAdmin }: Props) {
  const { pathname } = useLocation();
  const page = pageDestination(pageState, isAdmin);
  return (
    <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-cq-line bg-white lg:flex">
      <div className="flex h-[76px] shrink-0 items-center border-b border-cq-line px-6">
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
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cq-subtle">
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
      <div className="shrink-0 border-t border-cq-line p-4">
        <Link
          to="/account"
          className="mb-3 flex items-center gap-3 rounded-cq-sm p-2 transition-colors hover:bg-cq-canvas"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cq-blue-50 text-sm font-bold text-cq-blue">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (user?.name?.charAt(0).toUpperCase() ?? "C")
            )}
          </span>
          {/* F9: no plan/billing label — the shell has no entitlement source. */}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-cq-ink">
              {user?.name ?? "Tu cuenta"}
            </span>
          </span>
          <Settings className="h-4 w-4 shrink-0 text-cq-subtle" aria-hidden />
        </Link>
        <Link
          to="/account"
          className="flex items-center gap-2 px-2 text-xs text-cq-subtle hover:text-cq-blue"
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
          Ayuda y soporte
        </Link>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
