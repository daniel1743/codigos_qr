import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  FileLock2,
  Globe2,
  HelpCircle,
  Home,
  QrCode,
  Shield,
} from "lucide-react";
import Logo from "../brand/Logo";
import type { ShellPageState, ShellUser } from "./AppShell";

type Props = { user: ShellUser | null; pageState: ShellPageState; isAdmin: boolean };

function pageDestination(pageState: ShellPageState) {
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
      className={`flex h-10 items-center gap-3 rounded-cq-sm px-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${isActive ? "bg-cq-blue-50 text-cq-blue" : "text-cq-muted hover:bg-cq-canvas hover:text-cq-ink"}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DesktopSidebar({ user, pageState, isAdmin }: Props) {
  const { pathname } = useLocation();
  const page = pageDestination(pageState);
  return (
    <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-cq-line bg-white px-5 py-6 lg:flex">
      <div className="shrink-0 px-2">
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
        className="scrollbar-none mt-10 min-h-0 flex-1 overflow-y-auto"
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
          {isAdmin && (
            <NavLink
              to="/admin"
              label="Admin"
              icon={Shield}
              isActive={active(pathname, ["/admin"])}
            />
          )}
        </div>
        <div className="my-5 h-px bg-cq-line" />
        <div className="space-y-1">
          <NavLink to="/account" label="Ayuda y soporte" icon={HelpCircle} isActive={false} />
        </div>
      </nav>
      <div className="shrink-0 pt-4">
        <Link
          to="/account"
          className="flex items-center gap-3 rounded-cq-md bg-white p-2.5 ring-1 ring-cq-line transition-colors hover:bg-cq-canvas"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-cq-blue-50 text-sm font-bold text-cq-blue">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (user?.name?.charAt(0).toUpperCase() ?? "C")
            )}
          </span>
          {/* F9: no plan/billing label — the shell has no entitlement source. */}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13.5px] font-semibold text-cq-ink">
              {user?.name ?? "Tu cuenta"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-cq-subtle" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
