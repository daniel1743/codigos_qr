import { Menu, Plus } from "lucide-react";
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
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e6edf7] bg-white/95 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="grid h-10 w-10 place-items-center rounded-xl text-[#526176] hover:bg-[#f2f6fc] lg:hidden"
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
        <p className="hidden text-sm font-medium text-[#8290a3] lg:block">Inicio</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/pages/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0d47a1] px-3 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(13,71,161,.16)] transition-colors hover:bg-[#0a3b87] sm:px-4"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Crear página</span>
          <span className="sm:hidden">Crear</span>
        </Link>
        <Link
          to="/account"
          className="hidden h-9 w-9 overflow-hidden rounded-full bg-[#eaf2ff] text-center text-sm font-bold leading-9 text-[#0d47a1] sm:block"
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
