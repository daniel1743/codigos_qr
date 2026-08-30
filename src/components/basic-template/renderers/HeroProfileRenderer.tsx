import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import { Avatar, ProfileHeading, TemplateFooter } from "../primitives/Identity";
import { Hero } from "../primitives/Hero";
import { LinkButton } from "../primitives/button";
import { SocialRow } from "../primitives/social";
import { EditableTarget } from "../EditTarget";
import { EDIT_TARGETS, linkEditTarget } from "@/types/basic-templates";

/**
 * hero_profile family renderer.
 *
 * Used by:
 *  - Beauty Curve (heroStyle "curved")
 *  - Luxury Fusion (heroStyle "fusion")
 *
 * The avatar is ALWAYS an independent, fully-opaque layer above the hero and
 * never receives the fusion mask.
 */
export function HeroProfileRenderer({
  config,
  targetRegistry,
  highlightedTarget,
}: BasicTemplateRendererProps) {
  const {
    content,
    palette,
    fontPair,
    buttonStyle,
    buttonCustomization,
    heroFusionStrength,
    template,
  } = config;
  const { profile, links, socials } = content;
  const visibleLinks = links.filter((l) => l.enabled);

  return (
    <div
      className="flex min-h-full w-full flex-col"
      style={{
        background: palette.background,
        color: palette.text,
        fontFamily: fontPair.body,
      }}
    >
      <EditableTarget
        id={EDIT_TARGETS.hero}
        registry={targetRegistry}
        active={highlightedTarget === EDIT_TARGETS.hero}
        className="w-full"
      >
        <Hero
          src={profile.heroUrl}
          heroStyle={template.structure.heroStyle}
          background={palette.background}
          height={260}
          fusionStrength={heroFusionStrength}
        />
      </EditableTarget>

      <EditableTarget
        id={EDIT_TARGETS.avatar}
        registry={targetRegistry}
        active={highlightedTarget === EDIT_TARGETS.avatar}
        className="relative z-10 -mt-12 flex justify-center px-6"
      >
        <Avatar
          src={profile.avatarUrl}
          name={profile.name}
          size={96}
          ringEnabled={profile.ringEnabled}
          ringColor={profile.ringColor}
          ringThickness={profile.ringThickness}
        />
      </EditableTarget>

      <div className="flex flex-col items-center gap-6 px-6 pb-10 pt-4">
        <ProfileHeading
          name={profile.name}
          subtitle={profile.subtitle}
          bio={profile.bio}
          palette={palette}
          headingFont={fontPair.heading}
          bodyFont={fontPair.body}
          titleFontFamily={profile.titleFontFamily}
          bioFontFamily={profile.bioFontFamily}
          titleSize={profile.titleSize}
          titleWeight={profile.titleWeight}
          titleAlign={profile.titleAlign}
          bioSize={profile.bioSize}
          bioWeight={profile.bioWeight}
          bioAlign={profile.bioAlign}
          align="center"
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />

        <SocialRow
          socials={socials}
          palette={palette}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />

        {visibleLinks.length > 0 ? (
          <EditableTarget
            id={EDIT_TARGETS.links}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.links}
            className="flex w-full flex-col"
            style={{ gap: buttonCustomization.spacing }}
          >
            {visibleLinks.map((link) => (
              <EditableTarget
                key={link.id}
                id={linkEditTarget(link.id)}
                registry={targetRegistry}
                active={highlightedTarget === linkEditTarget(link.id)}
              >
                <LinkButton
                  link={link}
                  palette={palette}
                  style={buttonStyle}
                  customization={buttonCustomization}
                  bodyFont={fontPair.body}
                />
              </EditableTarget>
            ))}
          </EditableTarget>
        ) : null}

        <TemplateFooter
          enabled={profile.footerEnabled ?? false}
          text={profile.footerText ?? ""}
          palette={palette}
          bodyFont={fontPair.body}
        />
      </div>
    </div>
  );
}
