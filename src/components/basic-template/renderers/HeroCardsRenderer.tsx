import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import { Avatar, ProfileHeading, TemplateFooter } from "../primitives/Identity";
import { Hero } from "../primitives/Hero";
import { Card } from "../primitives/card";
import { LinkPresentation } from "../primitives/LinkPresentation";
import { SocialRow } from "../primitives/social";
import { EditableTarget } from "../EditTarget";
import { cardEditTarget, EDIT_TARGETS, linkEditTarget } from "@/types/basic-templates";

/**
 * hero_cards family renderer — used by Beauty Catalog.
 * Hero + identity + socials + vertical image cards with per-card CTA.
 */
export function HeroCardsRenderer({
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
  const { profile, links, cards, socials } = content;
  const hasPresentationAwareLinks = links.some((link) => link.presentation !== undefined);
  const visibleLinks = hasPresentationAwareLinks ? links.filter((link) => link.enabled) : [];
  const visibleCards = cards.filter(
    (card) => card.enabled && !links.some((link) => link.id === card.id),
  );

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
          height={220}
          fusionStrength={heroFusionStrength}
        />
      </EditableTarget>

      {profile.avatarShape !== "none" ? (
        <EditableTarget
          id={EDIT_TARGETS.avatar}
          registry={targetRegistry}
          active={highlightedTarget === EDIT_TARGETS.avatar}
          className="relative z-10 -mt-11 flex justify-center px-6"
        >
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            size={88}
            ringEnabled={profile.ringEnabled}
            ringColor={profile.ringColor}
            ringThickness={profile.ringThickness}
            shape={profile.avatarShape}
          />
        </EditableTarget>
      ) : null}

      <div className="flex flex-col items-center gap-5 px-5 pb-10 pt-4">
        <ProfileHeading
          name={profile.name}
          subtitle={profile.subtitle}
          professionalBadge={profile.professionalBadge}
          bio={profile.bio}
          palette={palette}
          headingFont={fontPair.heading}
          bodyFont={fontPair.body}
          titleColor={profile.titleColor}
          bioColor={profile.bioColor}
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
                <LinkPresentation
                  link={link}
                  palette={palette}
                  style={buttonStyle}
                  customization={buttonCustomization}
                  headingFont={fontPair.heading}
                  bodyFont={fontPair.body}
                />
              </EditableTarget>
            ))}
          </EditableTarget>
        ) : null}

        {visibleCards.length > 0 ? (
          <EditableTarget
            id={EDIT_TARGETS.cards}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.cards}
            className="flex w-full flex-col gap-4"
          >
            {visibleCards.map((card) => (
              <EditableTarget
                key={card.id}
                id={cardEditTarget(card.id)}
                registry={targetRegistry}
                active={highlightedTarget === cardEditTarget(card.id)}
              >
                <Card
                  card={card}
                  palette={palette}
                  style={buttonStyle}
                  customization={buttonCustomization}
                  headingFont={fontPair.heading}
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
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      </div>
    </div>
  );
}
