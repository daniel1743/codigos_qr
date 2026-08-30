import type { Profile, ProfileLink } from "../../types/database";
import { BasicTemplateRenderer } from "../basic-template/BasicTemplateRenderer";
import { getTemplates } from "../../lib/basic-templates/catalog";
import { buildBasicTemplateContent, buildConfig } from "../../lib/basic-templates/config";

interface PublicProfileViewProps {
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
  isPreview?: boolean;
}

function normalizeBannerFusionStrength(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function getBannerFusionMask(strength: unknown) {
  const normalized = normalizeBannerFusionStrength(strength);
  if (normalized === 0) return "none";

  // Keep the beginning of the transition almost fully opaque, then spread the
  // fade across several stops so the image never develops a visible edge.
  const fadeStart = 84 - normalized * 0.42;
  const softStart = Math.max(12, fadeStart - 12);
  const softEnd = Math.min(92, fadeStart + 10);
  const midEnd = Math.min(97, fadeStart + 26);
  const lateEnd = Math.min(99, fadeStart + 40);

  return `linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.995) ${softStart}%,
    rgba(0, 0, 0, 0.98) ${fadeStart}%,
    rgba(0, 0, 0, 0.82) ${softEnd}%,
    rgba(0, 0, 0, 0.48) ${midEnd}%,
    rgba(0, 0, 0, 0.14) ${lateEnd}%,
    transparent 100%
  )`;
}

export function PublicProfileView({ profile, links, isPreview = false }: PublicProfileViewProps) {
  const selectedTemplate = profile.template_id
    ? getTemplates().find((template) => template.id === profile.template_id)
    : undefined;

  if (selectedTemplate) {
    const config = buildConfig(selectedTemplate, buildBasicTemplateContent(profile, links), {
      profileCustomization: profile,
    });
    return <BasicTemplateRenderer config={config} />;
  }

  if (import.meta.env.DEV && profile.template_id) {
    console.warn(
      `Unknown basic template id: ${profile.template_id}. Rendering the legacy profile.`,
    );
  }

  const backgroundColor = profile.background_color || "#ffffff";
  const buttonColor = profile.button_color || "#111111";
  const buttonTextColor = profile.button_text_color || "#ffffff";
  const visibleLinks = links.filter((link) => link.enabled);

  // Derive spacing for the links container
  let spacingClass = "gap-3";
  if (profile.theme_spacing === "compact") spacingClass = "gap-2";
  else if (profile.theme_spacing === "generous") spacingClass = "gap-5";

  // Derive button radius
  let radiusClass = "rounded-xl";
  if (profile.button_radius === "none") radiusClass = "rounded-none";
  else if (profile.button_radius === "full") radiusClass = "rounded-full";

  // Derive border styles
  const hasBorder = profile.button_border_thickness && profile.button_border_thickness !== "none";
  const borderThicknessPx =
    profile.button_border_thickness === "thin"
      ? 1
      : profile.button_border_thickness === "medium"
        ? 2
        : profile.button_border_thickness === "strong"
          ? 3
          : 0;

  // Also check if button_style implies a specific border or background
  // (e.g. if outline, we don't apply background color)
  const isOutline = profile.button_style === "outline";
  const isSoft = profile.button_style === "soft";

  return (
    <div
      className={
        isPreview
          ? "h-full w-full overflow-y-auto"
          : "flex min-h-screen w-full justify-center overflow-x-hidden"
      }
      style={{
        background: backgroundColor,
        fontFamily: profile.font_family || "Inter, sans-serif",
      }}
    >
      <main className="flex min-h-full w-full max-w-[520px] flex-col items-center pb-12">
        {profile.banner_url ? (
          <div
            className="relative z-0 h-36 w-full shrink-0 overflow-hidden sm:h-44"
            style={{ background: backgroundColor }}
          >
            <img
              src={profile.banner_url}
              alt="Portada"
              className="h-full w-full object-cover"
              style={{
                WebkitMaskImage: getBannerFusionMask(profile.banner_fusion_strength),
                maskImage: getBannerFusionMask(profile.banner_fusion_strength),
              }}
            />
          </div>
        ) : (
          <div className="h-12 w-full shrink-0 sm:h-16" />
        )}

        <section className="relative z-10 flex w-full flex-col items-center px-6">
          <div
            className={
              profile.banner_url
                ? "relative z-20 -mt-12 mb-5 h-28 w-28 rounded-full border-[3px] border-white bg-background p-0 shadow-lg"
                : "relative z-20 mb-6 mt-4 h-28 w-28 rounded-full border-[3px] border-white bg-background p-0 shadow-lg"
            }
            style={{ background: backgroundColor }}
          >
            <div
              className="h-full w-full overflow-hidden rounded-full"
              style={{ background: backgroundColor }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </div>

          <h1 className="max-w-full break-words text-center text-3xl font-extrabold tracking-tight text-foreground">
            {profile.display_name || "Tu Nombre"}
          </h1>

          {profile.bio && (
            <p className="mt-3 max-w-[320px] whitespace-pre-line break-words text-center text-base leading-relaxed text-foreground/75">
              {profile.bio}
            </p>
          )}

          <div className={`mt-9 flex w-full flex-col ${spacingClass}`}>
            {visibleLinks.map((link, index) => {
              const borderStyles = hasBorder
                ? {
                    borderWidth: `${borderThicknessPx}px`,
                    borderStyle: "solid",
                    borderColor: profile.button_border_color || buttonColor,
                  }
                : {};

              let bgStyle = isOutline ? "transparent" : buttonColor;
              let txtStyle = isOutline ? buttonColor : buttonTextColor;

              if (isSoft) {
                // Siempre respetamos el color de texto elegido por el usuario
                txtStyle = buttonTextColor;

                // Aplicamos un fondo translúcido (12% opacidad aproximada = "20" en hex)
                if (buttonColor.startsWith("#") && buttonColor.length === 7) {
                  bgStyle = buttonColor + "20";
                } else if (buttonColor.startsWith("#") && buttonColor.length === 4) {
                  bgStyle =
                    "#" +
                    buttonColor[1] +
                    buttonColor[1] +
                    buttonColor[2] +
                    buttonColor[2] +
                    buttonColor[3] +
                    buttonColor[3] +
                    "20";
                }
              }

              return (
                <a
                  key={link.id || index}
                  href={isPreview ? undefined : link.url}
                  target={isPreview ? undefined : "_blank"}
                  rel={isPreview ? undefined : "noopener noreferrer"}
                  onClick={(event) => {
                    if (isPreview) event.preventDefault();
                  }}
                  className={`flex min-h-14 w-full items-center justify-center ${radiusClass} px-5 py-4 text-center font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99] ${
                    isSoft || (!hasBorder && !isOutline) ? "shadow-sm" : ""
                  } ${isSoft ? "opacity-90" : ""}`}
                  style={{
                    background: bgStyle,
                    color: txtStyle,
                    ...borderStyles,
                  }}
                >
                  <span className="min-w-0 break-words">{link.label || "Enlace"}</span>
                </a>
              );
            })}
          </div>

          <div className="mt-10 text-xs font-medium text-foreground/45">Generador de QR</div>
        </section>
      </main>
    </div>
  );
}
