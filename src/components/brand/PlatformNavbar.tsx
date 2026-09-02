import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import Logo, { type LogoTheme } from "./Logo";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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

  return (
    <header className={className} data-platform-navbar={variant}>
      <div className={innerClassName}>
        <div className={leadingClassName}>
          <Link to={brandHref} className={brandClassName} aria-label="Cripqer" onClick={() => setOpen(false)}>
            <Logo
              variant="horizontal"
              theme={logoTheme}
              responsiveSymbol
              showTagline={false}
              className={logoClassName}
            />
          </Link>
          {navigation}
        </div>
        {center}
        
        <div className="flex items-center gap-2">
          {actions}
          
          {mobileMenuContent && (
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

      {mobileMenuContent && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-[300px] border-l-0 bg-[#0a0a0a] p-0 text-[#f5f2ea] shadow-2xl rounded-l-3xl [&>button]:hidden">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SheetDescription className="sr-only">Navegación móvil de Cripqer</SheetDescription>
            <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
              <Link to={brandHref} onClick={() => setOpen(false)} aria-label="Cripqer">
                <Logo variant="horizontal" theme="inverse" responsiveSymbol showTagline={false} className="h-6 text-white" />
              </Link>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div 
              className="p-5 overflow-y-auto max-h-[calc(100dvh-4rem)]"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a, button')) {
                  setOpen(false);
                }
              }}
            >
              {mobileMenuContent}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}

export default PlatformNavbar;
