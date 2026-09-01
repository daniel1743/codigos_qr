import type {
  ButtonCustomizationConfig,
  ButtonStyleConfig,
  CardItem,
  ContactContent,
  PaletteConfig,
} from "@/types/basic-templates";
import { buttonLabelStyle, buttonStyles } from "./button";
import { getSocialIcon } from "./social";

interface CardProps {
  card: CardItem;
  palette: PaletteConfig;
  style: ButtonStyleConfig;
  customization: ButtonCustomizationConfig;
  headingFont: string;
  bodyFont: string;
}

export function Card({ card, palette, style, customization, headingFont, bodyFont }: CardProps) {
  const mediaMode = card.mediaMode ?? (card.imageUrl ? "image" : "none");
  const hasMedia = mediaMode !== "none";
  const visual = buttonStyles(palette, style, customization);
  const isOutline = style.variant === "outline";
  const cardBackground = isOutline ? palette.surface : visual.background || palette.surface;
  const cardColor = isOutline ? palette.text : visual.color || palette.text;
  const PlatformIcon = getSocialIcon(card.platform || "website");

  return (
    <div
      className={`grid w-full min-w-0 overflow-hidden border ${
        hasMedia ? "grid-cols-1 min-[420px]:grid-cols-[minmax(0,3fr)_minmax(88px,1fr)]" : "grid-cols-1"
      }`}
      style={{
        background: cardBackground,
        border: visual.border,
        borderRadius: card.cornerStyle === "square" ? "0px" : "18px",
        color: cardColor,
      }}
    >
      <div className="flex min-w-0 flex-col justify-center gap-2 p-4 sm:p-5">
        <h3
          className="min-w-0 break-words text-base font-bold"
          style={{ fontFamily: headingFont, fontWeight: customization.textWeight || 700 }}
        >
          {card.title}
        </h3>
        {card.description ? (
          <p
            className="min-w-0 break-words text-sm leading-relaxed"
            style={{ color: isOutline ? palette.textMuted : cardColor, fontFamily: bodyFont }}
          >
            {card.description}
          </p>
        ) : null}
        <a
          href={card.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-10 max-w-full items-center self-start break-words px-4 py-2"
          style={{
            ...buttonStyles(palette, style, customization),
            ...buttonLabelStyle(customization),
            fontFamily: bodyFont,
          }}
        >
          {card.ctaLabel}
        </a>
      </div>
      {hasMedia ? (
        <div className="relative min-h-28 min-w-0 overflow-hidden">
          {mediaMode === "image" && card.imageUrl ? (
            <img src={card.imageUrl} alt={card.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : mediaMode === "platform_icon" ? (
            <PlatformIcon
              className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ContactBlockProps {
  contact: ContactContent;
  palette: PaletteConfig;
  bodyFont: string;
}

export function ContactBlock({ contact, palette, bodyFont }: ContactBlockProps) {
  const rows: { label: string; value: string; href: string }[] = [];
  if (contact.phone)
    rows.push({ label: "Teléfono", value: contact.phone, href: `tel:${contact.phone}` });
  if (contact.email)
    rows.push({ label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (rows.length === 0) return null;

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl"
      style={{ backgroundColor: palette.surface, color: palette.text }}
    >
      {rows.map((row, i) => {
        const external = row.href.startsWith("http");
        return (
          <a
            key={row.label}
            href={row.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="flex items-center justify-between gap-4 px-4 py-3"
            style={{
              borderTop: i > 0 ? `1px solid ${palette.text}14` : undefined,
              fontFamily: bodyFont,
            }}
          >
            <span className="text-sm" style={{ color: palette.textMuted }}>
              {row.label}
            </span>
            <span className="min-w-0 break-words text-sm font-semibold">{row.value}</span>
          </a>
        );
      })}
    </div>
  );
}
