import type { Profile, ProfileLink } from "../../types/database";

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
  if (normalized === 0) return "linear-gradient(to bottom, #000 0%, #000 100%)";

  const fadeStart = Math.max(35, 92 - normalized * 0.55);
  return `linear-gradient(to bottom, #000 0%, #000 ${fadeStart}%, transparent 100%)`;
}

export function PublicProfileView({ profile, links, isPreview = false }: PublicProfileViewProps) {
  const backgroundColor = profile.background_color || "#ffffff";
  const buttonColor = profile.button_color || "#111111";
  const buttonTextColor = profile.button_text_color || "#ffffff";
  const visibleLinks = links.filter((link) => link.enabled);

  return (
    <div
      className={
        isPreview
          ? "h-full w-full overflow-y-auto"
          : "flex min-h-screen w-full justify-center overflow-x-hidden"
      }
      style={{ backgroundColor, fontFamily: profile.font_family || "Inter, sans-serif" }}
    >
      <main className="flex min-h-full w-full max-w-[520px] flex-col items-center pb-12">
        {profile.banner_url ? (
          <div className="relative h-36 w-full shrink-0 overflow-hidden bg-black/5 sm:h-44">
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

        <section className="flex w-full flex-col items-center px-6">
          <div className={profile.banner_url ? "-mt-12 mb-5" : "mb-6 mt-4"}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "Avatar"}
                className="h-28 w-28 rounded-full border-[3px] border-white/70 object-cover shadow-lg"
              />
            ) : (
              <div className="h-28 w-28 rounded-full border-[3px] border-white/70 bg-black/5 shadow-inner" />
            )}
          </div>

          <h1 className="max-w-full break-words text-center text-3xl font-extrabold tracking-tight text-foreground">
            {profile.display_name || "Tu Nombre"}
          </h1>

          {profile.bio && (
            <p className="mt-3 max-w-[320px] whitespace-pre-line break-words text-center text-base leading-relaxed text-foreground/75">
              {profile.bio}
            </p>
          )}

          <div className="mt-9 flex w-full flex-col gap-3">
            {visibleLinks.map((link, index) => (
              <a
                key={link.id || index}
                href={isPreview ? undefined : link.url}
                target={isPreview ? undefined : "_blank"}
                rel={isPreview ? undefined : "noopener noreferrer"}
                onClick={(event) => {
                  if (isPreview) event.preventDefault();
                }}
                className="flex min-h-14 w-full items-center justify-center rounded-xl px-5 py-4 text-center font-semibold shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]"
                style={{ backgroundColor: buttonColor, color: buttonTextColor }}
              >
                <span className="min-w-0 break-words">{link.label || "Enlace"}</span>
              </a>
            ))}
          </div>

          <div className="mt-10 text-xs font-medium text-foreground/45">Generador de QR</div>
        </section>
      </main>
    </div>
  );
}
