import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import Logo from "../brand/Logo";
import type { ShellUser } from "./AppShell";

export default function TopHeader({
  user,
  onMenuClick,
}: {
  user: ShellUser | null;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-cq-line/70 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="grid h-10 w-10 place-items-center rounded-cq-sm text-cq-muted hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link to="/profile" className="lg:hidden" aria-label="Cripqer">
          <Logo
            variant="horizontal"
            theme="default"
            responsiveSymbol
            showTagline={false}
            className="h-7"
          />
        </Link>
        <p className="hidden text-[14px] font-semibold text-cq-ink lg:block">Inicio</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/account"
          className="hidden h-9 w-9 overflow-hidden rounded-full bg-cq-blue-50 text-center text-sm font-bold leading-9 text-cq-blue sm:block"
          aria-label="Abrir cuenta"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (user?.name?.charAt(0).toUpperCase() ?? "C")
          )}
        </Link>
      </div>
    </header>
  );
}
