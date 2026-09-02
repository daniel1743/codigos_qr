import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import Logo, { type LogoTheme } from "./Logo";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PLATFORM_BRAND } from "@/components/platform/platform-brand";
import type { PlatformNavItem } from "@/components/platform/platform-navigation";

export type PlatformNavbarVariant = "landing" | "editor";

interface PlatformNavbarProps {
  variant: PlatformNavbarVariant;
  brandHref: string;
  logoTheme: LogoTheme;
  className: string;
  innerClassName: string;
  brandClassName: string;
  logoClassName: string;
  leadingClassName?: string;
  navItems?: readonly PlatformNavItem[];
  navigation?: ReactNode;
  center?: ReactNode;
  actions?: ReactNode;
  mobileMenuContent?: ReactNode;
  mobileMenuOpen?: boolean;
  onMobileMenuChange?: (open: boolean) => void;
}

/**
 * Shared platform navbar shell. Route-specific navigation and controls stay
 * in their owning screens; this component owns only the brand/layout spine.
 */
export function PlatformNavbar({
  variant,
  brandHref,
  logoTheme,
  className,
  innerClassName,
  brandClassName,
  logoClassName,
  leadingClassName = "flex min-w-0 items-center gap-3",
  navItems,
  navigation,
  center,
  actions,
  mobileMenuContent,
  mobileMenuOpen: controlledOpen,
  onMobileMenuChange,
}: PlatformNavbarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onMobileMenuChange || setInternalOpen;
  const hasStructuredNavigation = navItems !== undefined;
  const desktopNavigation = hasStructuredNavigation
    ? renderStructuredNavigation(navItems, false, () => setOpen(false))
    : navigation;
  const mobileNavigation = hasStructuredNavigation
    ? renderStructuredNavigation(navItems, true, () => setOpen(false))
    : mobileMenuContent;

  return (
    <header className={className} data-platform-navbar={variant}>
      <div className={innerClassName}>
        <div className={leadingClassName}>
          <Link
            to={brandHref}
            className={brandClassName}
            aria-label="Cripqer"
            onClick={() => setOpen(false)}
          >
            <Logo
              variant="horizontal"
              theme={logoTheme}
              responsiveSymbol
              showTagline={false}
              className={logoClassName}
            />
          </Link>
          {desktopNavigation}
        </div>
        {center}

        <div className="flex items-center gap-2">
          {actions}

          {mobileNavigation && (
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl text-current hover:bg-black/5 dark:hover:bg-white/10 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {mobileNavigation && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="h-full w-[85vw] max-w-[340px] rounded-r-[32px] border-r-0 bg-[#0a0a0a] p-0 shadow-[20px_0_40px_rgba(0,0,0,0.5)] [&>button]:hidden"
            style={{
              backgroundColor: PLATFORM_BRAND.colors.inverse,
              color: PLATFORM_BRAND.colors.warmWhite,
            }}
          >
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SheetDescription className="sr-only">Navegación móvil de Cripqer</SheetDescription>

            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-6 pt-[env(safe-area-inset-top)]">
                <Link to={brandHref} onClick={() => setOpen(false)} aria-label="Cripqer">
                  <Logo
                    variant="horizontal"
                    theme="inverse"
                    responsiveSymbol
                    showTagline={false}
                    className="h-6 text-white"
                  />
                </Link>
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, button[data-close="true"]')) {
                    setOpen(false);
                  }
                }}
              >
                {mobileNavigation}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}

function renderStructuredNavigation(
  items: readonly PlatformNavItem[],
  mobile: boolean,
  onNavigate: () => void,
) {
  const visibleItems = items.filter(
    (item): item is PlatformNavItem & { href: string } =>
      item.href !== null && item.visibility !== "future" && (mobile ? item.mobile : item.desktop),
  );

  if (visibleItems.length === 0) return null;

  return (
    <nav
      className={mobile ? "flex flex-col gap-1" : "flex items-center gap-2"}
      aria-label={mobile ? "Menú móvil principal" : "Navegación principal"}
    >
      {visibleItems.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          onClick={onNavigate}
          data-platform-nav-item={item.id}
          data-active-match={`${item.activeMatch.type}${"value" in item.activeMatch ? `:${item.activeMatch.value}` : ""}`}
          className={
            mobile
              ? "block min-h-12 rounded-xl px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
              : "rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default PlatformNavbar;
