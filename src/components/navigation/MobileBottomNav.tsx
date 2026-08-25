import { Link, useRouterState } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import QrCodeIcon from "@hugeicons/core-free-icons/QrCodeIcon";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import AiTemplateIcon from "@hugeicons/core-free-icons/AiTemplateIcon";
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import type { IconSvgElement } from "@hugeicons/core-free-icons";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const BUBBLE_WIDTH = 48;
type MobileSearch = Record<string, unknown>;

type MobileNavItem = {
  id: "template" | "qr" | "editor" | "secure-documents" | "profile";
  label: string;
  to: "/editor" | "/template-builder" | "/template-bank" | "/encrypted-documents" | "/profile";
  search?: MobileSearch;
  icon: IconSvgElement;
  active: (pathname: string, search: MobileSearch) => boolean;
};

const items: MobileNavItem[] = [
  {
    id: "template",
    label: "Plantilla",
    to: "/template-bank",
    icon: AiTemplateIcon,
    active: (pathname) => pathname === "/template-bank",
  },
  {
    id: "qr",
    label: "QR",
    to: "/editor",
    search: { tab: "qr" },
    icon: QrCodeIcon,
    active: (pathname, search) => pathname === "/editor" && search.tab === "qr",
  },
  {
    id: "editor",
    label: "Editor",
    to: "/template-builder",
    icon: Add01Icon,
    active: (pathname) => pathname === "/template-builder",
  },
  {
    id: "secure-documents",
    label: "Seguridad",
    to: "/encrypted-documents",
    icon: Shield01Icon,
    active: (pathname) => pathname === "/encrypted-documents",
  },
  {
    id: "profile",
    label: "Mi Perfil",
    to: "/profile",
    icon: UserCircleIcon,
    active: (pathname) => pathname === "/profile",
  },
];

function getActiveIndex(pathname: string, search: MobileSearch) {
  const index = items.findIndex((item) => item.active(pathname, search));
  return index >= 0 ? index : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function MobileBottomNav() {
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const search = (location.search || {}) as MobileSearch;
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicatorX, setIndicatorX] = useState(0);
  const [ready, setReady] = useState(false);
  const activeIndex = useMemo(() => getActiveIndex(pathname, search), [pathname, search]);

  const hiddenForRoute =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/d/") ||
    (pathname !== "/" &&
      pathname !== "/editor" &&
      pathname !== "/profile" &&
      pathname !== "/encrypted-documents" &&
      pathname !== "/template-builder" &&
      pathname !== "/template-bank");

  useLayoutEffect(() => {
    if (hiddenForRoute) return;

    const updateIndicatorPosition = () => {
      if (activeIndex === null) {
        setReady(false);
        return;
      }

      const nav = navRef.current;
      const activeItem = itemRefs.current[activeIndex];
      if (!nav || !activeItem) return;

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const offset = itemRect.left - navRect.left + itemRect.width / 2 - BUBBLE_WIDTH / 2;
      setIndicatorX(clamp(offset, 0, Math.max(0, navRect.width - BUBBLE_WIDTH)));
      setReady(true);
    };

    updateIndicatorPosition();
    const observer = new ResizeObserver(updateIndicatorPosition);
    if (navRef.current) observer.observe(navRef.current);
    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });
    window.addEventListener("orientationchange", updateIndicatorPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateIndicatorPosition);
    };
  }, [activeIndex, hiddenForRoute]);

  if (hiddenForRoute) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden pointer-events-none"
      data-mobile-bottom-nav
    >
      <nav
        ref={navRef}
        className="relative mx-auto flex h-16 w-full max-w-md items-center rounded-full bg-[#18181b] shadow-2xl pointer-events-auto"
        aria-label="Navegación principal móvil"
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 z-0 h-14 w-[48px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `translateX(${indicatorX}px)` }}
        >
          <div className="absolute left-1/2 top-[-10px] z-0 h-[38px] w-[38px] -translate-x-1/2 rounded-full bg-[#18181b] shadow-[0_-4px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10" />
        </div>

        <div className="relative z-10 flex w-full items-center justify-between px-2">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                to={item.to}
                search={item.search}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className="group relative flex h-16 min-h-16 w-full min-w-[52px] flex-col items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    "relative z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                    isActive
                      ? "-translate-y-[23px] text-indigo-400 drop-shadow-md"
                      : "text-slate-400 group-hover:text-slate-300",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} size={isActive ? 20 : 22} strokeWidth={isActive ? 2 : 1.7} />
                </span>
                <span
                  className={cn(
                    "absolute bottom-2 text-[10px] font-medium transition-all duration-300 motion-reduce:transition-none",
                    isActive
                      ? "translate-y-0 opacity-100 text-white"
                      : "pointer-events-none translate-y-2 opacity-0 text-slate-500",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
