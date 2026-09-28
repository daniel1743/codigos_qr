import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  FileLock2,
  Globe2,
  HelpCircle,
  Home,
  QrCode,
  Settings,
  X,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import Logo from "../brand/Logo";
import type { ShellPageState, ShellUser } from "./AppShell";

function pageDestination(pageState: ShellPageState) {
  if (pageState.count === 0) return { label: "Crear página", to: "/pages/new" as const };
  if (pageState.count === 1 && pageState.primaryPageId)
    return {
      label: "Mi página",
      to: "/pages/$pageId" as const,
      params: { pageId: pageState.primaryPageId },
    };
  return { label: "Mis páginas", to: "/pages" as const };
}

export default function MobileDrawer({
  open,
  onOpen,
  onClose,
  user,
  pageState,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  user: ShellUser | null;
  pageState: ShellPageState;
}) {
  const { pathname } = useLocation();
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const startX = useRef<number | null>(null);
  const edgeStartX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const page = pageDestination(pageState);
  const navItems = [
    { label: "Inicio", to: "/profile", icon: Home },
    { label: page.label, to: page.to, params: page.params, icon: Globe2 },
    { label: "QR", to: "/qr", icon: QrCode },
    ...(pageState.primaryPageId
      ? [
          {
            label: "Analytics",
            to: "/pages/$pageId/analytics",
            params: { pageId: pageState.primaryPageId },
            icon: BarChart3,
          },
        ]
      : []),
    { label: "Documentos", to: "/encrypted-documents", icon: FileLock2 },
  ];

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const focusable = () =>
      drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [];
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(focusable());
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  const onPointerDown = (event: React.PointerEvent) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (startX.current !== null) setDragX(Math.min(0, event.clientX - startX.current));
  };
  const onPointerUp = () => {
    if (dragX < -80) onClose();
    startX.current = null;
    setDragX(0);
  };
  const onEdgePointerDown = (event: React.PointerEvent) => {
    edgeStartX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onEdgePointerUp = (event: React.PointerEvent) => {
    if (edgeStartX.current !== null && event.clientX - edgeStartX.current > 36) onOpen();
    edgeStartX.current = null;
  };
  const overlayOpacity = open ? 1 - Math.min(1, Math.abs(dragX) / 280) : 0;

  return (
    <>
      {!open && (
        <div
          aria-label="Abrir menú deslizando"
          className="fixed inset-y-0 left-0 z-30 w-6 lg:hidden"
          onPointerDown={onEdgePointerDown}
          onPointerUp={onEdgePointerUp}
        />
      )}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-[#0b1a2e]/35 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ opacity: overlayOpacity }}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        aria-label="Menú móvil"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,350px)] flex-col rounded-r-[32px] bg-white shadow-[18px_0_40px_rgba(11,26,46,.18)] lg:hidden ${open ? "translate-x-0" : "-translate-x-full"} ${dragX !== 0 ? "transition-none" : "transition-transform duration-300 motion-reduce:transition-none"}`}
        style={{ transform: open ? `translateX(${dragX}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#eef2f7] px-6">
          <Link to="/profile" onClick={onClose} aria-label="Cripqer">
            <Logo
              variant="horizontal"
              theme="default"
              responsiveSymbol
              showTagline={false}
              className="h-8"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid h-9 w-9 place-items-center rounded-full bg-[#f1f5fb] text-[#526176]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav
          className="scrollbar-none flex-1 overflow-y-auto px-5 py-6"
          aria-label="Menú principal"
        >
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa7b8]">
            Espacio de trabajo
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.label}
                  to={item.to as never}
                  params={item.params as never}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium ${isActive ? "bg-[#eaf2ff] text-[#0d47a1]" : "text-[#526176] hover:bg-[#f4f7fb]"}`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-[#b0bbc8]" aria-hidden />
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[#eef2f7] p-5">
          <Link
            to="/account"
            onClick={onClose}
            className="mb-4 flex items-center gap-3 rounded-xl p-2 hover:bg-[#f4f7fb]"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#eaf2ff] font-bold text-[#0d47a1]">
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
              <span className="block text-xs text-[#8290a3]">
                {user?.planLabel ?? "Plan gratuito"}
              </span>
            </span>
            <Settings className="h-4 w-4 text-[#9aa7b8]" aria-hidden />
          </Link>
          <Link
            to="/account"
            onClick={onClose}
            className="flex items-center gap-2 px-2 text-xs text-[#8290a3]"
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            Ayuda y soporte
          </Link>
        </div>
      </aside>
    </>
  );
}
