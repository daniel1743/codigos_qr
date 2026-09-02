import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Logo, { type LogoTheme } from "./Logo";

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
  mobile?: ReactNode;
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
  mobile,
}: PlatformNavbarProps) {
  return (
    <header className={className} data-platform-navbar={variant}>
      <div className={innerClassName}>
        <div className={leadingClassName}>
          <Link to={brandHref} className={brandClassName} aria-label="Cripqer">
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
        {actions}
      </div>
      {mobile}
    </header>
  );
}

export default PlatformNavbar;
