"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import Settings01Icon from "@hugeicons/core-free-icons/Settings01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import QrCodeIcon from "@hugeicons/core-free-icons/QrCodeIcon";
import Home01Icon from "@hugeicons/core-free-icons/Home01Icon";
import AddCircleIcon from "@hugeicons/core-free-icons/AddCircleIcon";
import AiTemplateIcon from "@hugeicons/core-free-icons/AiTemplateIcon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ZapIcon from "@hugeicons/core-free-icons/ZapIcon";
import type { Session } from "@supabase/supabase-js";
import type { IconSvgElement } from "@hugeicons/core-free-icons";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { profileService } from "../../services/profile.service";
import { isAdminEmail, isUserAdmin } from "../../lib/admin-check";
import {
  getPremiumOverrideByEmail,
  getUserEntitlements,
  type UserEntitlements,
} from "../../lib/entitlements";
import { cn } from "../../lib/utils";

type NavItem = {
  id: "home" | "qrs" | "create" | "templates" | "security";
  label: string;
  to: "/" | "/editor" | "/template-builder" | "/template-bank" | "/encrypted-documents";
  icon: IconSvgElement;
  active: (pathname: string) => boolean;
  emphasized?: boolean;
};

const navItems = [
  { id: "home", label: "Inicio", to: "/", active: (pathname: string) => pathname === "/" },
  { id: "qrs", label: "Mis QR", to: "/editor", active: (pathname: string) => pathname === "/editor" },
  { id: "templates", label: "Biblioteca", to: "/template-bank", active: (pathname: string) => pathname === "/template-bank" },
  { id: "create", label: "Editor", to: "/template-builder", active: (pathname: string) => pathname === "/template-builder", emphasized: true },
  { id: "security", label: "Documentos Seguros", to: "/encrypted-documents", active: (pathname: string) => pathname === "/encrypted-documents" },
];

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "CR";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

export function DesktopNavbar() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileWrapRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);

  const canRenderPrivateNav =
    pathname === "/" ||
    pathname === "/editor" ||
    pathname === "/profile" ||
    pathname === "/encrypted-documents" ||
    pathname === "/admin" ||
    pathname === "/template-builder" ||
    pathname === "/template-bank";

  const hiddenForRoute =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/d/") ||
    !canRenderPrivateNav ||
    (pathname === "/" && !session);

  useEffect(() => {
    if (!canRenderPrivateNav || pathname.startsWith("/p/") || pathname.startsWith("/d/")) return;
    let cancelled = false;

    const loadUser = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
        setEntitlements(null);
        setIsAdmin(false);
        return;
      }

      const email = currentSession.user.email || "";
      const [loadedProfile, loadedEntitlements, adminStatus] = await Promise.all([
        profileService.getProfileByUserId(supabase, currentSession.user.id).catch(() => null),
        getUserEntitlements(currentSession.user.id).catch(() => null),
        isUserAdmin(supabase, currentSession.user.id).catch(() => false),
      ]);
      if (cancelled) return;
      setProfile(loadedProfile);
      setEntitlements(getPremiumOverrideByEmail(email) || loadedEntitlements);
      setIsAdmin(adminStatus || isAdminEmail(email));
    };

    loadUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [canRenderPrivateNav, pathname, supabase]);

  useEffect(() => {
    if (hiddenForRoute) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) setSearchOpen(false);
      if (profileWrapRef.current && !profileWrapRef.current.contains(target)) setProfileOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (isEditableTarget(event.target) && event.target !== searchInputRef.current) return;
        event.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        searchInputRef.current?.blur();
        profileButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hiddenForRoute]);

  if (hiddenForRoute) return null;

  const displayName =
    profile?.display_name ||
    session?.user.user_metadata?.["full_name"] ||
    session?.user.email ||
    "Cuenta";
  const email = session?.user.email || "Sesión no iniciada";
  const isPremium = entitlements?.plan === "premium";

  const goTo = (to: "/" | "/profile") => {
    setProfileOpen(false);
    router.navigate({ to });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-[70] hidden h-[76px] border-b border-[#21242c] bg-[#111318] text-white shadow-[0_1px_0_rgba(255,255,255,0.02)] lg:block">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-5 xl:px-6">
        <div className="flex min-w-0 items-center gap-5 xl:gap-8">
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Ir a Inicio"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-lg font-bold text-white shadow-sm transition-colors hover:bg-indigo-500">
              C
            </span>
            <span className="text-xl font-bold tracking-tight">Cripqer</span>
          </a>

          <nav className="flex items-center gap-1 xl:gap-2" aria-label="Navegación principal">
            {navItems.map((item) => {
              const isActive = item.active(pathname);
              return (
                <a
                  key={item.id}
                  href={item.to}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500",
                    item.emphasized
                      ? "mx-1 border border-indigo-500/20 bg-indigo-600/15 px-4 text-indigo-300 shadow-sm hover:bg-indigo-600/25 hover:text-indigo-200"
                      : isActive
                        ? "bg-[#232734] text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-100",
                  )}
                >
                  
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div
          ref={searchWrapRef}
          className="hidden min-w-[260px] flex-1 md:block md:max-w-[340px] xl:max-w-[420px]"
        >
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={20}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Búsqueda global"
              aria-expanded={searchOpen}
              aria-controls="desktop-navbar-search-panel"
              placeholder="Buscar plantillas, QR o contenido..."
              onFocus={() => setSearchOpen(true)}
              className="h-11 w-full rounded-full border border-[#2A2E39] bg-[#191C23] pl-11 pr-16 text-sm text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-indigo-500 focus:bg-[#111318]"
            />
            <div className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 xl:flex">
              <kbd className="rounded bg-[#232734] px-2 py-1 text-[10px] font-semibold tracking-wider text-gray-400">
                Ctrl K
              </kbd>
            </div>
            {searchOpen && (
              <div
                id="desktop-navbar-search-panel"
                className="absolute left-0 top-[calc(100%+8px)] w-full overflow-hidden rounded-2xl border border-[#2A2E39] bg-[#191C23] shadow-2xl"
              >
                <div className="p-3">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Búsqueda
                  </p>
                  <div className="flex items-start gap-3 rounded-xl px-3 py-3 text-sm text-gray-300">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-indigo-300">
                      <HugeiconsIcon icon={ZapIcon} size={17} strokeWidth={1.8} />
                    </span>
                    <span>
                      <span className="block font-medium text-white">Búsqueda global próximamente</span>
                      <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                        El campo queda integrado para conectar resultados reales sin mostrar datos ficticios.
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 xl:gap-4">
          {isPremium && (
            <div className="hidden items-center rounded-full border border-indigo-500/20 bg-indigo-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-indigo-300 xl:flex">
              Pro
            </div>
          )}

          <div ref={profileWrapRef} className="relative">
            <button
              ref={profileButtonRef}
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-controls="desktop-navbar-profile-menu"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-2 pr-1 outline-none transition-colors hover:border-gray-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-sm font-medium text-white shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(displayName, session?.user.email)
                )}
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.8} className="text-gray-400" />
            </button>

            {profileOpen && (
              <div
                id="desktop-navbar-profile-menu"
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-xl border border-[#2A2E39] bg-[#191C23] shadow-xl"
              >
                <div className="border-b border-[#2A2E39] px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{email}</p>
                </div>
                <div className="p-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => goTo("/admin")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-amber-500 transition-colors hover:bg-[#232734] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 mb-1"
                    >
                      <HugeiconsIcon icon={Shield01Icon} size={18} strokeWidth={1.8} />
                      Administración
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goTo("/profile")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-[#232734] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                  >
                    <HugeiconsIcon icon={UserCircleIcon} size={18} strokeWidth={1.8} />
                    Mi perfil
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600"
                  >
                    <HugeiconsIcon icon={CreditCardIcon} size={18} strokeWidth={1.8} />
                    Facturación
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goTo("/profile")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-[#232734] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.8} />
                    Configuración
                  </button>
                </div>
                <div className="border-t border-[#2A2E39] p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                  >
                    <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.8} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
