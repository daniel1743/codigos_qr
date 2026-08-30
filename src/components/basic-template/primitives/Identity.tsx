import type { EditTargetRegistry, PaletteConfig } from "@/types/basic-templates";
import { EDIT_TARGETS } from "@/types/basic-templates";
import { EditableTarget } from "../EditTarget";

interface AvatarProps {
  src: string;
  name: string;
  size?: number;
  ringEnabled?: boolean;
  ringColor?: string;
  ringThickness?: string;
}

/**
 * Avatar layer — ALWAYS fully opaque and visually above the hero.
 * Never inherits the banner fusion mask.
 * Ring is driven by persisted ring_enabled / ring_color / ring_thickness.
 */
export function Avatar({
  src,
  name,
  size = 96,
  ringEnabled = false,
  ringColor = "#ffffff",
  ringThickness = "thin",
}: AvatarProps) {
  const ringWidth = ringThickness === "thin" ? 2 : ringThickness === "thick" ? 5 : 3;
  const border = ringEnabled ? `${ringWidth}px solid ${ringColor}` : "none";
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover shadow-lg"
      style={{ width: size, height: size, border, opacity: 1 }}
    />
  );
}

interface ProfileHeadingProps {
  name: string;
  subtitle: string;
  bio: string;
  palette: PaletteConfig;
  headingFont: string;
  bodyFont: string;
  align?: "center" | "left";
  targetRegistry?: EditTargetRegistry | undefined;
  highlightedTarget?: string | null | undefined;
}

/** Name + subtitle + bio block. */
export function ProfileHeading({
  name,
  subtitle,
  bio,
  palette,
  headingFont,
  bodyFont,
  align = "center",
  targetRegistry,
  highlightedTarget,
}: ProfileHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex w-full flex-col ${alignClass}`}>
      <EditableTarget
        id={EDIT_TARGETS.name}
        registry={targetRegistry}
        active={highlightedTarget === EDIT_TARGETS.name}
        className="w-full"
      >
        <h1
          className="w-full break-words text-2xl font-bold leading-tight"
          style={{ color: palette.text, fontFamily: headingFont }}
        >
          {name}
        </h1>
      </EditableTarget>
      {subtitle ? (
        <EditableTarget
          id={EDIT_TARGETS.subtitle}
          registry={targetRegistry}
          active={highlightedTarget === EDIT_TARGETS.subtitle}
          className="mt-1 w-full"
        >
          <p
            className="w-full break-words text-sm font-medium"
            style={{ color: palette.accent, fontFamily: bodyFont }}
          >
            {subtitle}
          </p>
        </EditableTarget>
      ) : null}
      {bio ? (
        <EditableTarget
          id={EDIT_TARGETS.bio}
          registry={targetRegistry}
          active={highlightedTarget === EDIT_TARGETS.bio}
          className="mt-3 w-full"
        >
          <p
            className="w-full whitespace-pre-line break-words text-sm leading-relaxed"
            style={{ color: palette.textMuted, fontFamily: bodyFont }}
          >
            {bio}
          </p>
        </EditableTarget>
      ) : null}
    </div>
  );
}

interface TemplateFooterProps {
  enabled: boolean;
  text: string;
  palette: PaletteConfig;
  bodyFont: string;
}

/** Existing profile footer state, shared by every Basic Template family. */
export function TemplateFooter({ enabled, text, palette, bodyFont }: TemplateFooterProps) {
  if (!enabled || !text.trim()) return null;
  return (
    <footer
      className="mt-8 w-full border-t pt-4 text-center text-xs"
      style={{ borderColor: `${palette.text}1f`, color: palette.textMuted, fontFamily: bodyFont }}
    >
      {text}
    </footer>
  );
}
