import type { CSSProperties, HTMLAttributes } from "react";

/**
 * Central platform logo component.
 *
 * The mark is the supplied final C/Q artwork copied byte-for-byte from the
 * branding iconography pack. Keeping the asset reference here means a final
 * production master can replace one file without touching platform surfaces.
 */

const CRIPQER_MARK_ASSET = "/brand-assets/cripqer-mark.png";

export const CRIPQER_BRAND = {
  blue: "#0D47A1",
  gold: "#D4AF37",
  white: "#FFFFFF",
} as const;

export type LogoVariant = "symbol" | "horizontal" | "wordmark";
export type LogoTheme = "default" | "inverse" | "monochrome";

type LogoProps = Omit<HTMLAttributes<HTMLSpanElement>, "title"> & {
  variant?: LogoVariant;
  theme?: LogoTheme;
  title?: string;
  responsiveSymbol?: boolean;
  showTagline?: boolean;
  width?: number | string;
  height?: number | string;
};

type Palette = {
  wordmark: string;
  tagline: string;
};

function paletteFor(theme: LogoTheme): Palette {
  if (theme === "inverse") {
    return {
      wordmark: CRIPQER_BRAND.white,
      tagline: "rgba(255,255,255,.72)",
    };
  }

  if (theme === "monochrome") {
    return {
      wordmark: "currentColor",
      tagline: "currentColor",
    };
  }

  return {
    wordmark: CRIPQER_BRAND.blue,
    tagline: "rgba(13,71,161,.68)",
  };
}

function Mark({ className }: { className?: string }) {
  return (
    <img
      src={CRIPQER_MARK_ASSET}
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
    />
  );
}

function Wordmark({
  palette,
  showTagline,
}: {
  palette: Palette;
  showTagline: boolean;
}) {
  return (
    <span
      className="logo-wordmark"
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: showTagline ? "4px" : 0,
        color: palette.wordmark,
        fontFamily: 'Montserrat, Arial, Helvetica, sans-serif',
        fontSize: "clamp(1.05rem, 3vw, 1.55rem)",
        fontWeight: 800,
        letterSpacing: "0.14em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span>
        CRIP<span style={{ color: CRIPQER_BRAND.gold }}>Q</span>ER
      </span>
      {showTagline && (
        <span
          style={{
            color: palette.tagline,
            fontSize: "0.27em",
            fontWeight: 600,
            letterSpacing: "0.33em",
          }}
        >
          SMART CONVERSION PAGES
        </span>
      )}
    </span>
  );
}

function SymbolMark({ className }: { className?: string }) {
  return <Mark className={className ?? "h-full w-full object-contain"} />;
}

function HorizontalLockup({
  palette,
  showTagline,
}: {
  palette: Palette;
  showTagline: boolean;
}) {
  return (
    <span className="logo-horizontal-lockup hidden min-[420px]:inline-flex items-center gap-2">
      <SymbolMark className="h-9 w-9 shrink-0 object-contain" />
      <Wordmark palette={palette} showTagline={showTagline} />
    </span>
  );
}

export function Logo({
  variant = "horizontal",
  theme = "default",
  title = "Cripqer",
  responsiveSymbol = false,
  showTagline = true,
  className,
  style,
  width,
  height,
  ...props
}: LogoProps) {
  const palette = paletteFor(theme);
  const labelProps = {
    role: "img" as const,
    "aria-label": title,
  };
  const sizeStyle: CSSProperties = {
    width,
    height,
    ...style,
  };

  if (variant === "symbol") {
    return (
      <span
        {...props}
        {...labelProps}
        className={className}
        style={{ display: "inline-flex", ...sizeStyle }}
      >
        <SymbolMark />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        {...props}
        {...labelProps}
        className={className}
        style={{ display: "inline-flex", ...sizeStyle }}
      >
        <Wordmark palette={palette} showTagline={showTagline} />
      </span>
    );
  }

  if (responsiveSymbol) {
    return (
      <span
        {...props}
        {...labelProps}
        className={className}
        style={{ display: "inline-flex", alignItems: "center", ...sizeStyle }}
      >
        <span className="logo-symbol-only inline-flex min-[420px]:hidden h-full w-full items-center">
          <SymbolMark />
        </span>
        <HorizontalLockup palette={palette} showTagline={showTagline} />
      </span>
    );
  }

  return (
    <span
      {...props}
      {...labelProps}
      className={className}
      style={{ display: "inline-flex", alignItems: "center", ...sizeStyle }}
    >
      <HorizontalLockup palette={palette} showTagline={showTagline} />
    </span>
  );
}

export default Logo;
