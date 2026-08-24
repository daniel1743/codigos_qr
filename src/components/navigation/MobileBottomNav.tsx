import { Link, useRouterState } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import Home01Icon from "@hugeicons/core-free-icons/Home01Icon";
import QrCodeIcon from "@hugeicons/core-free-icons/QrCodeIcon";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import AiTemplateIcon from "@hugeicons/core-free-icons/AiTemplateIcon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const BUBBLE_WIDTH = 96;

type MobileNavItem = {
  id: "home" | "qrs" | "create" | "templates" | "profile";
  label: string;
  to: "/" | "/editor" | "/template-builder" | "/template-bank" | "/profile";
  icon: typeof Home01Icon;
  active: (pathname: string) => boolean;
};

const items: MobileNavItem[] = [
  { id: "home", label: "Inicio", to: "/", icon: Home01Icon, active: (pathname) => pathname === "/" },
  {
    id: "qrs",
    label: "QRs",
    to: "/editor",
    icon: QrCodeIcon,
    active: (pathname) => pathname === "/editor",
  },
  {
    id: "create",
    label: "Crear",
    to: "/template-builder",
    icon: Add01Icon,
    active: (pathname) => pathname === "/template-builder",
  },
  {
    id: "templates",
    label: "Plantillas",
    to: "/template-bank",
    icon: AiTemplateIcon,
    active: (pathname) => pathname === "/template-bank",
  },
  {
    id: "profile",
    label: "Perfil",
    to: "/profile",
    icon: UserCircleIcon,
    active: (pathname) => pathname === "/profile",
  },
];

function getActiveIndex(pathname: string) {
  const index = items.findIndex((item) => item.active(pathname));
  return index >= 0 ? index : 0;
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicatorX, setIndicatorX] = useState(0);
  const [ready, setReady] = useState(false);
  const activeIndex = useMemo(() => getActiveIndex(pathname), [pathname]);

  const hiddenForRoute =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/d/") ||
    (pathname !== "/" &&
      pathname !== "/editor" &&
      pathname !== "/profile" &&
      pathname !== "/template-builder" &&
      pathname !== "/template-bank");

  useLayoutEffect(() => {
    if (hiddenForRoute) return;

    const updateIndicatorPosition = () => {
      const nav = navRef.current;
      const activeItem = itemRefs.current[activeIndex];
      if (!nav || !activeItem) return;

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const offset = itemRect.left - navRect.left + itemRect.width / 2 - BUBBLE_WIDTH / 2;
      setIndicatorX(offset);
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
      className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden pointer-events-none"
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
            "pointer-events-none absolute top-0 z-0 h-16 w-24 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `translateX(${indicatorX}px)` }}
        >
          <svg
            width="96"
            height="24"
            viewBox="0 0 96 24"
            className="absolute left-0 top-0 z-0 fill-background"
          >
            <path d="M 0 0 C 16 0 16 24 48 24 C 80 24 80 0 96 0 Z" />
          </svg>
          <div className="absolute left-4 top-[-30px] z-10 h-16 w-16 rounded-full bg-background" />
          <div className="absolute left-[22px] top-[-24px] z-20 h-[52px] w-[52px] rounded-full border border-slate-700/50 bg-[#18181b] shadow-[0_6px_12px_rgba(0,0,0,0.35)]" />
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
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className="group relative flex h-16 min-h-16 w-full min-w-[52px] flex-col items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                    isActive
                      ? "-translate-y-[30px] scale-110 text-indigo-400 drop-shadow-md"
                      : "text-slate-400 group-hover:text-slate-300",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} size={24} strokeWidth={isActive ? 2 : 1.7} />
                </span>
                <span
                  className={cn(
                    "absolute bottom-1.5 text-[10px] font-medium transition-all duration-300 motion-reduce:transition-none",
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
