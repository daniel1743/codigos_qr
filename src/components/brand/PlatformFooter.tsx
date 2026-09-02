import type { ReactNode } from "react";
import Logo from "./Logo";

interface PlatformFooterProps {
  className: string;
  innerClassName: string;
  logoClassName: string;
  children?: ReactNode;
  copyright?: ReactNode;
}

/** Shared public platform footer. The editor remains full-height by design. */
export function PlatformFooter({
  className,
  innerClassName,
  logoClassName,
  children,
  copyright,
}: PlatformFooterProps) {
  return (
    <footer className={className} data-platform-footer>
      <div className={innerClassName}>
        <Logo
          variant="horizontal"
          theme="inverse"
          responsiveSymbol
          showTagline={false}
          className={logoClassName}
        />
        {children}
        {copyright ?? <small>© {new Date().getFullYear()} Cripqer. Todos los derechos reservados.</small>}
      </div>
    </footer>
  );
}

export default PlatformFooter;
