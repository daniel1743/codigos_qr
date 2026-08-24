import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  HelpCircle,
  Home,
  Link as LinkIcon,
  LogOut,
  Menu,
  Palette,
  QrCode,
  Settings,
  Shield,
  Sparkles,
  User,
  X,
  Wand2,
  FolderKanban,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { profileService } from "../../services/profile.service";
import { getAliasProfileUrl, getPublicProfileUrl } from "../../lib/url";
import { isAdminEmail, isUserAdmin } from "../../lib/admin-check";
import {
  getPremiumOverrideByEmail,
  getUserEntitlements,
  type UserEntitlements,
} from "../../lib/entitlements";
import { cn } from "../../lib/utils";

// Modified by Codex - MOBILE-NAV-DRAWER-PREMIUM-2026

const MAX_DRAWER_WIDTH = 344;
const MIN_DRAWER_WIDTH = 286;
const EDGE_ZONE = 28;
const OPEN_VELOCITY = 0.45;
const CLOSE_VELOCITY = -0.45;

type DrawerMode = "closed" | "dragging" | "settling" | "open";

interface PremiumMobileNavDrawerProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
  activePaths?: string[];
  activeMatch?: "exact" | "prefix";
  badge?: string;
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

export function PremiumMobileNavDrawer({ children }: PremiumMobileNavDrawerProps) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<DrawerMode>("closed");
  const [drawerWidth, setDrawerWidth] = useState(MIN_DRAWER_WIDTH);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startProgress: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    axis: "pending" | "x" | "y";
  } | null>(null);

  const hiddenForRoute =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/d/") ||
    (pathname !== "/" &&
      pathname !== "/editor" &&
      pathname !== "/profile" &&
      pathname !== "/encrypted-documents" &&
      pathname !== "/admin" &&
      pathname !== "/template-builder" &&
      pathname !== "/template-bank");

  useEffect(() => {
    const updateDrawerWidth = () => {
      const width = Math.round(
        Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, window.innerWidth * 0.86)),
      );
      setDrawerWidth(width);
    };
    updateDrawerWidth();
    window.addEventListener("resize", updateDrawerWidth);
    return () => window.removeEventListener("resize", updateDrawerWidth);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSessionData = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
        setIsAdmin(false);
        setEntitlements(null);
        return;
      }

      const email = currentSession.user.email || "";
      const [loadedProfile, adminStatus, loadedEntitlements] = await Promise.all([
        profileService.getProfileByUserId(supabase, currentSession.user.id).catch(() => null),
        isUserAdmin(supabase, currentSession.user.id).catch(() => false),
        getUserEntitlements(currentSession.user.id).catch(() => null),
      ]);

      if (cancelled) return;
      setProfile(loadedProfile);
      setIsAdmin(adminStatus || isAdminEmail(email));
      setEntitlements(getPremiumOverrideByEmail(email) || loadedEntitlements);
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
  }, [supabase]);

  useEffect(() => {
    if (hiddenForRoute) return;
    const shouldLock = progress > 0.01;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [hiddenForRoute, progress]);

  useEffect(() => {
    if (hiddenForRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && progress > 0.01) closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenForRoute, progress]);

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
  const isPremium = entitlements?.plan === "premium";

  const primaryItems: NavItem[] = [
    { label: "Inicio", to: "/", icon: Home, activePaths: ["/"], activeMatch: "exact" },
    { label: "Perfil", to: "/editor", icon: User, activePaths: ["/editor"], activeMatch: "exact" },
    { label: "Enlaces", to: "/editor", icon: LinkIcon, activePaths: [] },
    { label: "Apariencia", to: "/editor", icon: Palette, activePaths: [] },
    { label: "QR", to: "/editor", icon: QrCode, activePaths: [] },
  ];

  const toolItems: NavItem[] = [
    { label: "Docs Seguros", to: "/encrypted-documents", icon: Shield },
    { label: "Mis documentos", to: "/encrypted-documents", icon: FileText },
    { label: "Editor Básico", to: "/template-builder", icon: Wand2 },
    { label: "Banco de Plantillas", to: "/template-bank", icon: FolderKanban },
    ...(isPremium
      ? [
          {
            label: "Control Center",
            to: "/profile",
            icon: Sparkles,
            badge: "Premium",
          } satisfies NavItem,
        ]
      : []),
  ];

  const accountItems: NavItem[] = [
    { label: "Configuración", to: "/profile", icon: Settings },
    { label: "Ayuda", to: "/", icon: HelpCircle },
    ...(isAdmin ? [{ label: "Admin", to: "/admin", icon: Shield } satisfies NavItem] : []),
  ];

  const setDrawerProgress = (nextProgress: number, nextMode: DrawerMode) => {
    const safeProgress = clamp(nextProgress);
    setProgress(safeProgress);
    setMode(safeProgress <= 0.001 ? "closed" : safeProgress >= 0.999 ? "open" : nextMode);
  };

  const openDrawer = () => {
    setMode("settling");
    setProgress(1);
    window.setTimeout(() => setMode("open"), reducedMotion ? 0 : 260);
  };

  const closeDrawer = () => {
    setMode("settling");
    setProgress(0);
    window.setTimeout(() => setMode("closed"), reducedMotion ? 0 : 260);
  };

  const settleDrawer = (velocity: number) => {
    const shouldOpen = velocity > OPEN_VELOCITY || (velocity > CLOSE_VELOCITY && progress >= 0.45);
    if (shouldOpen) openDrawer();
    else closeDrawer();
  };

  const startDrag = (event: PointerEvent, source: "edge" | "surface" | "drawer") => {
    if (hiddenForRoute || event.pointerType === "mouse") return;
    const canStartFromEdge = source === "edge" && progress <= 0.01 && event.clientX <= EDGE_ZONE;
    const canStartWhileOpen = progress > 0.01 && (source === "surface" || source === "drawer");
    if (!canStartFromEdge && !canStartWhileOpen) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startProgress: progress,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      axis: "pending",
    };
    setMode("dragging");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.axis === "pending") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (drag.axis === "y") return;

    event.preventDefault();
    const now = performance.now();
    const deltaTime = Math.max(16, now - drag.lastTime);
    drag.velocity = ((event.clientX - drag.lastX) / deltaTime) * 16;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    setDrawerProgress(drag.startProgress + dx / drawerWidth, "dragging");
  };

  const endDrag = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.axis === "x") settleDrawer(drag.velocity);
    else setDrawerProgress(progress, progress > 0.5 ? "open" : "closed");
  };

  const handleNavigate = () => {
    closeDrawer();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    closeDrawer();
    router.navigate({ to: "/" });
  };

  if (hiddenForRoute) return <>{children}</>;

  const mainTranslate = progress * Math.min(drawerWidth * 0.72, 252);
  const mainScale = 1 - progress * 0.035;
  const mainRadius = progress * 34;
  const drawerTranslate = -drawerWidth * (1 - progress);
  const mainOverlayOpacity = progress * 0.28;
  const drawerInactiveOverlayOpacity = (1 - progress) * 0.28;
  const transitionClass =
    mode === "dragging" || reducedMotion
      ? "transition-none"
      : "transition-[transform,border-radius,box-shadow,opacity] duration-300 ease-out";

  return (
    <div className="relative min-h-dvh max-w-[100vw] overflow-x-hidden bg-slate-950 md:contents md:bg-transparent">
      <button
        type="button"
        aria-label="Abrir navegación"
        aria-expanded={progress > 0.01}
        aria-controls="premium-mobile-nav-drawer"
        onClick={progress > 0.01 ? closeDrawer : openDrawer}
        className={cn(
          "fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] flex h-11 w-11 items-center justify-center rounded-2xl border bg-background/90 text-foreground shadow-lg backdrop-blur md:hidden",
          progress > 0.01 && "text-primary-foreground",
        )}
      >
        {progress > 0.01 ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 z-[70] w-8 touch-pan-y md:hidden"
        onPointerDown={(event) => startDrag(event, "edge")}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      <aside
        id="premium-mobile-nav-drawer"
        aria-hidden={progress <= 0.01}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-[60] flex max-h-dvh flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:hidden",
          transitionClass,
        )}
        style={{
          width: drawerWidth,
          transform: `translate3d(${drawerTranslate}px, 0, 0)`,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onPointerDown={(event) => startDrag(event, "drawer")}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="relative h-36 shrink-0 overflow-hidden border-b border-sidebar-border/70 bg-sidebar-primary text-sidebar-primary-foreground">
          {profile?.banner_url ? (
            <img
              src={profile.banner_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-sidebar-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/40 bg-white/15 text-lg font-bold shadow-xl backdrop-blur">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(displayName, session?.user.email)
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="truncate text-base font-semibold leading-tight">{displayName}</p>
              <p className="truncate text-xs text-white/80">{alias}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <a
            href={profileUrl}
            onClick={handleNavigate}
            className="mb-4 flex min-h-11 items-center justify-center rounded-2xl bg-sidebar-primary px-4 text-sm font-semibold text-sidebar-primary-foreground shadow-sm"
          >
            Ver mi perfil
          </a>

          <NavSection
            label="Principal"
            items={primaryItems}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
          <NavSection
            label="Herramientas"
            items={toolItems}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
          <NavSection
            label="Cuenta"
            items={accountItems}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
        </div>

        <div className="border-t border-sidebar-border p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-sidebar transition-opacity"
          style={{ opacity: drawerInactiveOverlayOpacity }}
        />
      </aside>

      <div
        className={cn(
          "min-h-dvh bg-background will-change-transform md:contents md:transform-none",
          transitionClass,
        )}
        style={{
          transform: `translate3d(${mainTranslate}px, 0, 0) scale(${mainScale})`,
          borderTopLeftRadius: mainRadius,
          borderBottomLeftRadius: mainRadius,
          boxShadow: progress > 0.01 ? "0 20px 60px rgba(15, 23, 42, 0.24)" : "none",
          maxHeight: progress > 0.01 ? "100dvh" : undefined,
          overflow: progress > 0.01 ? "hidden" : undefined,
          transformOrigin: "left center",
        }}
        aria-hidden={progress > 0.01 ? true : undefined}
      >
        {children}
        {progress > 0.01 && (
          <button
            type="button"
            aria-label="Cerrar navegación"
            className="fixed inset-0 z-[55] cursor-default bg-foreground md:hidden"
            style={{ opacity: mainOverlayOpacity }}
            onClick={closeDrawer}
            onPointerDown={(event) => startDrag(event, "surface")}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        )}
      </div>
    </div>
  );
}

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="mb-5" aria-label={label}>
      <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/55">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const paths = item.activePaths ?? [item.to];
          const isActive = paths.some((path) =>
            item.activeMatch === "exact" || path === "/"
              ? pathname === path
              : pathname.startsWith(path),
          );
          return (
            <Link
              key={`${label}-${item.label}`}
              to={item.to}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
