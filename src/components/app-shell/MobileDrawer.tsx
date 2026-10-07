import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  FileLock2,
  Globe2,
  HelpCircle,
  Home,
  QrCode,
  Shield,
  X,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import Logo from "../brand/Logo";
import type { ShellPageState, ShellUser } from "./AppShell";

function pageDestination(pageState: ShellPageState) {
  if (pageState.count === 0) return { label: "Mi página", to: "/profile" as const };
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
  isAdmin,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  user: ShellUser | null;
  pageState: ShellPageState;
  isAdmin: boolean;
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
    ...(isAdmin ? [{ label: "Admin", to: "/admin" as const, icon: Shield }] : []),
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

  const capturedPointer = useRef(false);
  const onPointerDown = (event: React.PointerEvent) => {
    startX.current = event.clientX;
    capturedPointer.current = false;
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (startX.current === null) return;
    const deltaX = event.clientX - startX.current;
    // Capture only once a real horizontal drag starts: capturing on
    // pointerdown retargets the following click to the drawer itself and
    // would swallow taps on its links (mobile navigation).
    if (!capturedPointer.current && Math.abs(deltaX) > 8) {
      capturedPointer.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    setDragX(Math.min(0, deltaX));
  };
  const onPointerUp = () => {
    if (dragX < -80) onClose();
    startX.current = null;
    capturedPointer.current = false;
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
          style={{ touchAction: "pan-y" }}
          onPointerDown={onEdgePointerDown}
          onPointerUp={onEdgePointerUp}
        />
      )}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-cq-ink/35 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ opacity: overlayOpacity }}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        aria-label="Menú móvil"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,360px)] flex-col rounded-r-cq-drawer bg-white shadow-drawer ring-1 ring-cq-line/60 lg:hidden ${open ? "translate-x-0" : "-translate-x-full"} ${dragX !== 0 ? "transition-none" : "transition-transform duration-300 motion-reduce:transition-none"}`}
        style={{ transform: open ? `translateX(${dragX}px)` : undefined, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-[max(24px,env(safe-area-inset-top))]">
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cq-canvas text-cq-muted ring-1 ring-cq-line transition-colors hover:text-cq-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <nav
          className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-2"
          aria-label="Menú principal"
        >
          <p className="mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cq-subtle">
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
                  className={`flex min-h-[60px] items-center gap-3.5 rounded-cq-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${isActive ? "bg-cq-blue-50" : "active:bg-cq-canvas"}`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-cq-md text-cq-blue ${isActive ? "bg-white shadow-soft" : "bg-cq-blue-50"}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                  </span>
                  <span
                    className={`flex-1 truncate text-[15.5px] ${isActive ? "font-semibold text-cq-blue" : "font-medium text-cq-ink"}`}
                  >
                    {item.label}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-cq-blue" : "text-cq-subtle"}`}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
          <div className="mx-3 my-4 h-px bg-cq-line" />
          <ul className="space-y-0.5">
            <li>
              <Link
                to="/help"
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-cq-lg px-3 py-2 transition-colors active:bg-cq-canvas"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-cq-xs bg-cq-canvas text-cq-muted">
                  <HelpCircle className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex-1 text-[14.5px] font-medium text-cq-ink">
                  Ayuda y soporte
                </span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="shrink-0 border-t border-cq-line p-3 pb-safe-bottom">
          <Link
            to="/account"
            onClick={onClose}
            className="flex items-center gap-3 rounded-cq-lg bg-white p-3 ring-1 ring-cq-line transition-colors hover:bg-cq-canvas active:bg-cq-canvas"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-cq-blue-50 font-bold text-cq-blue">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (user?.name?.charAt(0).toUpperCase() ?? "C")
              )}
            </span>
            {/* F9: no plan/billing label — the shell has no entitlement source. */}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold text-cq-ink">
                {user?.name ?? "Tu cuenta"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-cq-subtle" aria-hidden />
          </Link>
        </div>
      </aside>
    </>
  );
}
