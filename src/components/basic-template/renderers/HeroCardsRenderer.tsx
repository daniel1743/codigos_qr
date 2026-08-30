import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import { Avatar, ProfileHeading, TemplateFooter } from "../primitives/Identity";
import { Hero } from "../primitives/Hero";
import { Card } from "../primitives/card";
import { SocialRow } from "../primitives/social";
import { EditableTarget } from "../EditTarget";
import { cardEditTarget, EDIT_TARGETS } from "@/types/basic-templates";

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
  const { profile, cards, socials } = content;
  const visibleCards = cards.filter((c) => c.enabled);

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
        />
      </EditableTarget>

      <div className="flex flex-col items-center gap-5 px-5 pb-10 pt-4">
        <ProfileHeading
          name={profile.name}
          subtitle={profile.subtitle}
          bio={profile.bio}
          palette={palette}
          headingFont={fontPair.heading}
          bodyFont={fontPair.body}
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
        />
      </div>
    </div>
  );
}
