import type {
  ButtonCustomizationConfig,
  ButtonStyleConfig,
  CardItem,
  ContactContent,
  PaletteConfig,
} from "@/types/basic-templates";
import { buttonStyles } from "./button";

interface CardProps {
  card: CardItem;
  palette: PaletteConfig;
  style: ButtonStyleConfig;
  customization: ButtonCustomizationConfig;
  headingFont: string;
  bodyFont: string;
}

export function Card({ card, palette, style, customization, headingFont, bodyFont }: CardProps) {
  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl"
      style={{ backgroundColor: palette.surface, color: palette.text }}
    >
      {card.imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="break-words text-base font-bold" style={{ fontFamily: headingFont }}>
          {card.title}
        </h3>
        {card.description ? (
          <p
            className="break-words text-sm leading-relaxed"
            style={{ color: palette.textMuted, fontFamily: bodyFont }}
          >
            {card.description}
          </p>
        ) : null}
        <a
          href={card.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-10 items-center justify-center self-start px-4 py-2 text-sm font-semibold"
          style={{ ...buttonStyles(palette, style, customization), fontFamily: bodyFont }}
        >
          {card.ctaLabel}
        </a>
      </div>
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
  if (contact.whatsapp)
    rows.push({
      label: "WhatsApp",
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`,
    });

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
