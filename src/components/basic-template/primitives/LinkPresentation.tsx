import type {
  ButtonCustomizationConfig,
  ButtonStyleConfig,
  LinkItem,
  PaletteConfig,
} from "@/types/basic-templates";
import { Card } from "./card";
import { LinkButton } from "./button";

interface LinkPresentationProps {
  link: LinkItem;
  palette: PaletteConfig;
  style: ButtonStyleConfig;
  customization: ButtonCustomizationConfig;
  headingFont: string;
  bodyFont: string;
}

/** Central presentation switch: one link, one URL, button or professional card. */
export function LinkPresentation({
  link,
  palette,
  style,
  customization,
  headingFont,
  bodyFont,
}: LinkPresentationProps) {
  if (link.presentation === "card" && link.card) {
    return (
      <Card
        card={{
          id: link.id,
          imageUrl: link.card.imageUrl || "",
          title: link.card.title,
          description: link.card.description || "",
          ctaLabel: link.card.ctaLabel,
          ctaUrl: link.url,
          enabled: link.enabled,
          ...(link.platform ? { platform: link.platform } : {}),
          mediaMode: link.card.mediaMode,
          cornerStyle: link.card.cornerStyle,
        }}
        palette={palette}
        style={style}
        customization={customization}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
    );
  }

  return (
    <LinkButton
      link={link}
      palette={palette}
      style={style}
      customization={customization}
      bodyFont={bodyFont}
    />
  );
}
