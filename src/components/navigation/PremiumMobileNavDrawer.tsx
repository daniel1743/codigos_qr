"use client";

import { useRouter, useRouterState } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import Menu01Icon from "@hugeicons/core-free-icons/Menu01Icon";
import Home01Icon from "@hugeicons/core-free-icons/Home01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import Link02Icon from "@hugeicons/core-free-icons/Link02Icon";
import PaintBoardIcon from "@hugeicons/core-free-icons/PaintBoardIcon";
import QrCodeIcon from "@hugeicons/core-free-icons/QrCodeIcon";
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { IconSvgElement } from "@hugeicons/core-free-icons";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { profileService } from "../../services/profile.service";
import { getAliasProfileUrl, getPublicProfileUrl } from "../../lib/url";
import { cn } from "../../lib/utils";

const MAX_WIDTH_CAP = 340;
const MENU_OVERLAP = 14;
const EDGE_ZONE = 32;
const DEAD_ZONE = 8;
const HORIZONTAL_INTENT_RATIO = 1.2;
const OPEN_VELOCITY = 0.45;
const CLOSE_VELOCITY = -0.45;
const POSITION_THRESHOLD = 0.4;
const ANIMATION_MS = 260;

type DrawerMode = "closed" | "dragging" | "settling" | "open";
type HTMLElementWithInert = HTMLElement & { inert?: boolean };

interface PremiumMobileNavDrawerProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: IconSvgElement;
  description?: string;
  activePaths?: string[];
  activeMatch?: "exact" | "prefix";
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "QR";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isGestureIgnored(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-drawer-gesture="ignore"]'));
}

export function PremiumMobileNavDrawer({ children }: PremiumMobileNavDrawerProps) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [maxWidth, setMaxWidth] = useState(MAX_WIDTH_CAP);
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DrawerMode>("closed");
  const [reducedMotion, setReducedMotion] = useState(false);
  const appContainerRef = useRef<HTMLDivElement | null>(null);
  const menuLayerRef = useRef<HTMLElementWithInert | null>(null);
  const mainLayerRef = useRef<HTMLElementWithInert | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const profileCtaRef = useRef<HTMLAnchorElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);
  const isOpenRef = useRef(false);
  const maxWidthRef = useRef(MAX_WIDTH_CAP);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const suppressClickUntilRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    hasDeterminedIntent: boolean;
    isHorizontalSwipe: boolean;
  } | null>(null);

  const hiddenForRoute =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/d/") ||
    (pathname !== "/" &&
      pathname !== "/editor" &&
      pathname !== "/profile" &&
      pathname !== "/encrypted-documents" &&
      pathname !== "/admin" &&
      pathname !== "/editor" &&
      pathname !== "/template-bank");

  const displayName =
    profile?.display_name ||
    session?.user.user_metadata?.["full_name"] ||
    session?.user.email ||
    "Tu perfil";
  const alias = profile?.slug
    ? `/${profile.slug}`
    : profile?.public_id
      ? `/p/${profile.public_id}`
      : "Configura tu alias";
  const profileUrl = profile?.slug
    ? getAliasProfileUrl(profile.slug)
    : profile?.public_id
      ? getPublicProfileUrl(profile.public_id)
      : "/editor";

  const primaryItems: NavItem[] = [
    { label: "Inicio", to: "/", icon: Home01Icon, activePaths: ["/"], activeMatch: "exact" },
    { label: "Perfil", to: "/editor", icon: UserCircleIcon, activePaths: ["/editor"] },
    { label: "Enlaces", to: "/editor", icon: Link02Icon, activePaths: ["/editor"] },
    { label: "Apariencia", to: "/editor", icon: PaintBoardIcon, activePaths: ["/editor"] },
    { label: "QR", to: "/editor", icon: QrCodeIcon, activePaths: ["/editor"] },
  ];
  const toolItem: NavItem = {
    label: "Docs Seguros",
    to: "/encrypted-documents",
    icon: Shield01Icon,
    description: "Protege tus archivos",
    activePaths: ["/encrypted-documents"],
  };

  const updateProgress = (nextProgress: number) => {
    const safeProgress = clamp(nextProgress);
    progressRef.current = safeProgress;
    setProgress(safeProgress);
  };

  const requestUIUpdate = (nextProgress: number) => {
    const safeProgress = clamp(nextProgress);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      updateProgress(safeProgress);
      rafRef.current = null;
    });
  };

  const settleTo = (open: boolean, forceSettle = false) => {
    if (isOpenRef.current === open && !forceSettle) return;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);

    if (open) previousFocusRef.current = document.activeElement as HTMLElement | null;
    isOpenRef.current = open;
    setIsOpen(open);
    setMode("settling");
    requestUIUpdate(open ? 1 : 0);

    settleTimerRef.current = window.setTimeout(
      () => {
        setMode(open ? "open" : "closed");
        updateProgress(open ? 1 : 0);
        if (open) profileCtaRef.current?.focus();
        else previousFocusRef.current?.focus();
      },
      reducedMotion ? 0 : ANIMATION_MS,
    );
  };

  useEffect(() => {
    if (hiddenForRoute) return;
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth * 0.84, MAX_WIDTH_CAP);
      maxWidthRef.current = width;
      setMaxWidth(width);
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [hiddenForRoute]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (hiddenForRoute) return;
    let cancelled = false;

    const loadSessionData = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
        return;
      }

      const loadedProfile = await profileService
        .getProfileByUserId(supabase, currentSession.user.id)
        .catch(() => null);
      if (!cancelled) setProfile(loadedProfile);
    };

    loadSessionData();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadSessionData();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hiddenForRoute, supabase]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (hiddenForRoute) return;
    const openOrMoving = isOpen || mode === "settling" || mode === "dragging" || progress > 0.01;
    if (menuLayerRef.current) menuLayerRef.current.inert = !openOrMoving;
    if (mainLayerRef.current) mainLayerRef.current.inert = isOpen;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollX = document.body.style.overscrollBehaviorX;
    if (openOrMoving) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehaviorX = "none";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehaviorX = previousOverscrollX;
    };
  }, [hiddenForRoute, isOpen, mode, progress]);

  useEffect(() => {
    if (hiddenForRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpenRef.current) settleTo(false, true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpenRef.current) return;
    settleTo(false, true);
  }, [pathname]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (hiddenForRoute || isGestureIgnored(event.target) || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("[data-sidebar-trigger]")) return;
    if (isOpenRef.current && event.target instanceof Node && menuLayerRef.current?.contains(event.target)) {
      return;
    }
    if (!isOpenRef.current && event.clientX > EDGE_ZONE) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: Date.now(),
      velocity: 0,
      hasDeterminedIntent: false,
      isHorizontalSwipe: false,
    };
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    setMode("dragging");
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.hasDeterminedIntent) {
      if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return;
      drag.hasDeterminedIntent = true;
      if (Math.abs(dx) > Math.abs(dy) * HORIZONTAL_INTENT_RATIO) {
        drag.isHorizontalSwipe = true;
        appContainerRef.current?.setPointerCapture(event.pointerId);
      } else {
        dragRef.current = null;
        setMode(isOpenRef.current ? "open" : "closed");
        return;
      }
    }

    if (!drag.isHorizontalSwipe) return;
    event.preventDefault();

    const now = Date.now();
    const deltaTime = now - drag.lastTime;
    if (deltaTime > 0) {
      const instantVelocity = (event.clientX - drag.lastX) / deltaTime;
      drag.velocity = drag.velocity * 0.4 + instantVelocity * 0.6;
    }
    drag.lastX = event.clientX;
    drag.lastTime = now;

    const targetProgress = clamp((isOpenRef.current ? maxWidthRef.current + dx : dx) / maxWidthRef.current);
    requestUIUpdate(targetProgress);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      appContainerRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (!drag.hasDeterminedIntent || !drag.isHorizontalSwipe) {
      setMode(isOpenRef.current ? "open" : "closed");
      return;
    }

    const shouldOpen =
      drag.velocity > OPEN_VELOCITY
        ? true
        : drag.velocity < CLOSE_VELOCITY
          ? false
          : progressRef.current > POSITION_THRESHOLD;
    suppressClickUntilRef.current = Date.now() + 90;
    settleTo(shouldOpen, true);
  };

  const handleMainClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isOpenRef.current || Date.now() < suppressClickUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    settleTo(false, true);
  };

  const handleNavigate = () => {
    window.setTimeout(() => settleTo(false, true), 150);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    settleTo(false, true);
    router.navigate({ to: "/" });
  };

  if (hiddenForRoute) return <>{children}</>;

  const animating = mode === "settling" && !reducedMotion;
  const mainTranslateX = progress * maxWidth;
  const mainTranslateY = progress * 8;
  const mainScale = 1 - (1 - (reducedMotion ? 1 : 0.965)) * progress;
  const mainRadius = 38 * progress;
  const menuScale = 0.97 + 0.03 * progress;
  const menuTranslateX = -10 * (1 - progress);
  const menuOpacity = 0.5 + 0.5 * progress;
  const scrimOpacity = 0.2 * progress;

  return (
    <div
      data-mobile-sidebar-shell
      ref={appContainerRef}
      className="relative min-h-dvh max-w-[100vw] overflow-hidden bg-white overscroll-x-none lg:contents"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <nav
        id="premium-mobile-nav-drawer"
        ref={menuLayerRef}
        aria-label="Navegación principal"
        aria-hidden={progress <= 0.01}
        inert={progress <= 0.01}
        className={cn(
          "absolute inset-y-0 left-0 z-[100] hidden max-h-dvh flex-col overflow-hidden bg-white text-slate-700 shadow-sm lg:hidden",
          "max-[1023px]:flex",
          animating && "transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
        )}
        style={{
          width: maxWidth + MENU_OVERLAP,
          transform: `scale(${menuScale}) translateX(${menuTranslateX}px)`,
          opacity: menuOpacity,
        }}
      >
        <div className="relative shrink-0 overflow-hidden bg-slate-900 px-6 pb-6 pt-[max(env(safe-area-inset-top),2.5rem)] text-white">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-blue-500 opacity-10 blur-3xl" />
          <div className="relative z-10 mb-5 flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-800 text-sm font-bold shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(displayName, session?.user.email)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight tracking-tight">{displayName}</p>
              <p className="truncate text-sm font-medium text-slate-400">{alias}</p>
            </div>
          </div>
          <a
            ref={profileCtaRef}
            href={profileUrl}
            onClick={handleNavigate}
            className="relative z-10 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 active:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>Ver mi perfil publico</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} className="text-white/70" />
          </a>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="mb-1 mt-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Principal
          </p>
          {primaryItems.map((item) => (
            <SidebarItem key={item.label} item={item} pathname={pathname} onNavigate={handleNavigate} />
          ))}

          <div className="mt-4 px-3">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Herramientas
            </p>
            <a
              href={toolItem.to}
              onClick={handleNavigate}
              aria-current={pathname.startsWith(toolItem.to) ? "page" : undefined}
              className="flex w-full items-center gap-4 rounded-xl bg-slate-900 p-4 text-left transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <HugeiconsIcon icon={toolItem.icon} size={28} strokeWidth={1.8} className="shrink-0 text-blue-400" />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-white">{toolItem.label}</span>
                <span className="block truncate text-xs text-slate-400">{toolItem.description}</span>
              </span>
            </a>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-500 transition-colors hover:bg-red-50 active:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            <HugeiconsIcon icon={Logout01Icon} size={22} strokeWidth={1.8} />
            <span className="text-[15px] font-medium">Cerrar sesión</span>
          </button>
        </div>
      </nav>

      <main
        ref={mainLayerRef}
        data-state={isOpen ? "open" : "closed"}
        onClickCapture={handleMainClickCapture}
        className={cn(
          "absolute left-0 top-0 z-[110] flex h-full w-full origin-right flex-col bg-slate-950 will-change-transform lg:contents lg:bg-transparent lg:transform-none",
          animating &&
            "transition-[transform,border-radius,box-shadow] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
        )}
        style={{
          transform: `translate3d(${mainTranslateX}px, ${mainTranslateY}px, 0) scale(${mainScale})`,
          borderTopLeftRadius: mainRadius,
          borderBottomLeftRadius: mainRadius,
          boxShadow: `calc(-8px * ${progress}) 0 calc(24px * ${progress}) rgba(0, 0, 0, ${0.12 * progress})`,
        }}
      >
        <div
          aria-hidden="true"
          data-mobile-sidebar-scrim
          className={cn(
            "absolute inset-0 z-[50] bg-black lg:hidden",
            progress > 0.01 ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{ opacity: scrimOpacity, borderRadius: "inherit" }}
        />
        <header className="sticky top-0 z-[60] flex items-center justify-between border-b border-white/5 bg-slate-950/90 px-4 py-4 pt-[max(env(safe-area-inset-top),1rem)] text-white backdrop-blur-md lg:hidden">
          <button
            ref={triggerRef}
            type="button"
            data-sidebar-trigger
            data-testid="mobile-sidebar-trigger"
            aria-expanded={isOpen}
            aria-controls="premium-mobile-nav-drawer"
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => settleTo(!isOpenRef.current, true)}
            className="-ml-2 grid h-10 w-10 place-items-center rounded-xl text-white transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <HugeiconsIcon icon={Menu01Icon} size={28} strokeWidth={1.8} />
          </button>
          <span className="font-semibold tracking-tight">Cripqer</span>
          <div className="h-10 w-10" />
        </header>
        <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] lg:contents">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const paths = item.activePaths ?? [item.to];
  const isActive = paths.some((path) =>
    item.activeMatch === "exact" || path === "/" ? pathname === path : pathname.startsWith(path),
  );

  return (
    <a
      href={item.to}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-[50px] w-full items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
        isActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        size={28}
        strokeWidth={isActive ? 2 : 1.7}
        className={cn("shrink-0 transition-transform", isActive && "text-slate-900")}
      />
      <span className={cn("min-w-0 truncate text-[15px]", isActive ? "font-semibold" : "font-medium")}>
        {item.label}
      </span>
    </a>
  );
}

