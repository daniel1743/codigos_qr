import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import { Avatar, ProfileHeading } from "../primitives/Identity";
import { Hero } from "../primitives/Hero";
import { ContactBlock } from "../primitives/card";
import { LinkButton } from "../primitives/button";
import { EditableTarget } from "../EditTarget";
import { EDIT_TARGETS, linkEditTarget } from "@/types/basic-templates";

/**
 * professional_corporate family renderer — used by Executive Straight.
 * Clean, structured layout: hero + identity + links + contact.
 */
export function CorporateRenderer({
  config,
  targetRegistry,
  highlightedTarget,
}: BasicTemplateRendererProps) {
  const { content, palette, fontPair, buttonStyle, template } = config;
  const { profile, links, contact } = content;
  const visibleLinks = links.filter((l) => l.enabled);

  return (
    <div
      className="flex min-h-full w-full flex-col"
      style={{
        backgroundColor: palette.background,
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
          height={200}
        />
      </EditableTarget>

      <EditableTarget
        id={EDIT_TARGETS.avatar}
        registry={targetRegistry}
        active={highlightedTarget === EDIT_TARGETS.avatar}
        className="relative z-10 -mt-10 flex justify-center px-6"
      >
        <Avatar src={profile.avatarUrl} name={profile.name} size={84} />
      </EditableTarget>

      <div className="flex flex-col gap-6 px-5 pb-10 pt-4">
        <ProfileHeading
          name={profile.name}
          subtitle={profile.subtitle}
          bio={profile.bio}
          palette={palette}
          headingFont={fontPair.heading}
          bodyFont={fontPair.body}
          align="left"
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />

        {visibleLinks.length > 0 ? (
          <EditableTarget
            id={EDIT_TARGETS.links}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.links}
            className="flex w-full flex-col gap-3"
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
                  bodyFont={fontPair.body}
                />
              </EditableTarget>
            ))}
          </EditableTarget>
        ) : null}

        <EditableTarget
          id={EDIT_TARGETS.contact}
          registry={targetRegistry}
          active={highlightedTarget === EDIT_TARGETS.contact}
          className="w-full"
        >
          <ContactBlock contact={contact} palette={palette} bodyFont={fontPair.body} />
        </EditableTarget>
      </div>
    </div>
  );
}
