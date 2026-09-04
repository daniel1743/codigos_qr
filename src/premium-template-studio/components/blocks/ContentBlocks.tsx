import {
  BadgeCheck,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Globe,
  MessageCircle,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useRender } from "../../engine/RenderContext";
import { cardStyle, headingStyle } from "../../engine/styleEngine";
import { hexToRgba, qrImageUrl, safeUrl } from "../../utils";
import type { TemplateBlock } from "../../types";
import { BlockTitle, InlineText, SmartLink } from "./primitives";

export interface BlockProps {
  block: TemplateBlock;
}

const TRUST_ICONS: Record<string, typeof BadgeCheck> = {
  BadgeCheck,
  ShieldCheck,
  Clock,
  Star,
  Sparkles,
};

export function HeadingBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const align = block.layout.align ?? "left";
  return (
    <header style={{ textAlign: align }}>
      {block.variant === "eyebrow" && (
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: theme.colors.accent,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {block.content.subtitle || "Section"}
        </div>
      )}
      <InlineText
        as="h2"
        path={`blocks.${block.id}.content.title`}
        value={block.content.title ?? ""}
        placeholder="Section title"
        style={{ ...headingStyle(theme, 0.62) }}
      />
      {block.variant !== "eyebrow" && block.content.subtitle ? (
        <InlineText
          as="p"
          path={`blocks.${block.id}.content.subtitle`}
          value={block.content.subtitle}
          style={{
            color: theme.colors.mutedText,
            margin: "8px 0 0",
            fontSize: theme.typography.bodySize,
          }}
        />
      ) : null}
      {block.variant === "divider" && (
        <div style={{ height: 1, background: theme.colors.border, marginTop: 14 }} />
      )}
    </header>
  );
}

export function TextBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const quote = block.variant === "quote";
  const boxed = block.variant === "boxed";
  return (
    <div style={boxed ? cardStyle(theme, block.style) : undefined}>
      <InlineText
        as="p"
        path={`blocks.${block.id}.content.body`}
        value={block.content.body ?? ""}
        placeholder="Write something…"
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          color: quote ? theme.colors.text : theme.colors.mutedText,
          fontFamily: quote ? theme.typography.headingFont : theme.typography.bodyFont,
          fontSize: quote ? theme.typography.bodySize + 5 : theme.typography.bodySize,
          lineHeight: theme.typography.lineHeight,
          borderLeft: quote ? `2px solid ${theme.colors.accent}` : undefined,
          paddingLeft: quote ? 16 : undefined,
          textAlign: block.layout.align ?? "left",
        }}
      />
    </div>
  );
}

export function DocumentBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const card = block.variant === "card";
  return (
    <SmartLink href={block.content.url} block={block} ariaLabel={block.content.title}>
      <div
        style={{
          ...cardStyle(theme, block.style),
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexDirection: card ? "column" : "row",
          textAlign: card ? "center" : "left",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: hexToRgba(theme.colors.accent, 0.14),
            color: theme.colors.accent,
            flexShrink: 0,
          }}
        >
          <FileText size={19} aria-hidden />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineText
            as="div"
            path={`blocks.${block.id}.content.title`}
            value={block.content.title ?? ""}
            placeholder="Document title"
            style={{ fontWeight: 600, fontSize: 15 }}
          />
          <div style={{ color: theme.colors.mutedText, fontSize: 12.5, marginTop: 2 }}>
            {[block.content.fileName, block.content.fileSize].filter(Boolean).join(" · ")}
          </div>
        </div>
        <Download size={17} aria-hidden style={{ color: theme.colors.mutedText }} />
      </div>
    </SmartLink>
  );
}

const generateVCardDataUri = (name: string, email?: string, phone?: string) => {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    phone ? `TEL:${phone}` : "",
    email ? `EMAIL:${email}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
};

export function ContactBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const c = block.content;

  const rows = [
    { icon: Mail, label: c.email, href: c.email ? `mailto:${c.email}` : undefined },
    {
      icon: Phone,
      label: c.phone,
      href: c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : undefined,
    },
    {
      icon: MapPin,
      label: c.address,
      href: c.address ? `https://maps.google.com/?q=${encodeURIComponent(c.address)}` : undefined,
    },
    { icon: Globe, label: c.website, href: safeUrl(c.website) },
    {
      icon: MessageCircle,
      label: c.whatsappUrl ? "Chat on WhatsApp" : undefined,
      href: safeUrl(c.whatsappUrl),
    },
    {
      icon: Calendar,
      label: c.bookingUrl ? "Book an Appointment" : undefined,
      href: safeUrl(c.bookingUrl),
    },
    ...(c.downloadContact
      ? [
          {
            icon: Download,
            label: "Download Contact Card",
            href: generateVCardDataUri(c.title || "Contact", c.email, c.phone),
            download: "contact.vcf",
          },
        ]
      : []),
    ...(c.customCtaUrl
      ? [
          {
            icon: ExternalLink,
            label: c.customCtaLabel || "Learn More",
            href: safeUrl(c.customCtaUrl),
          },
        ]
      : []),
  ].filter((r) => Boolean(r.label) && Boolean(r.href));

  return (
    <div style={block.variant === "card" ? cardStyle(theme, block.style) : undefined}>
      <BlockTitle title={c.title} path={`blocks.${block.id}.content.title`} />
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row, idx) => {
          const Icon = row.icon;
          return (
            <SmartLink key={idx} href={row.href} block={block} download={row.download}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Icon size={16} aria-hidden style={{ color: theme.colors.accent, flexShrink: 0 }} />
                <span style={{ color: theme.colors.text }}>{row.label}</span>
              </div>
            </SmartLink>
          );
        })}
      </div>
    </div>
  );
}

export function QRBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const url = safeUrl(block.content.url) ?? "https://example.com";
  const light = theme.colors.card.replace("#", "").slice(0, 6) || "ffffff";
  const dark = theme.colors.text.replace("#", "").slice(0, 6) || "000000";
  return (
    <div
      style={{
        ...(block.variant === "card" ? cardStyle(theme, block.style) : {}),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        height: "100%",
        justifyContent: "center",
      }}
    >
      <img
        src={qrImageUrl(url, 320, dark, light)}
        alt={`QR code for ${url}`}
        width={128}
        height={128}
        loading="lazy"
        style={{ width: 128, height: 128, borderRadius: 10, background: theme.colors.card }}
      />
      <InlineText
        as="div"
        path={`blocks.${block.id}.content.title`}
        value={block.content.title ?? ""}
        placeholder="Scan me"
        style={{ fontSize: 12.5, color: theme.colors.mutedText, textAlign: "center" }}
      />
    </div>
  );
}

export function TrustBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const badges = block.content.badges ?? [];
  const cards = block.variant === "cards";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: block.layout.align === "left" ? "flex-start" : "center",
      }}
    >
      {badges.map((badge) => {
        const Icon = TRUST_ICONS[badge.icon ?? "BadgeCheck"] ?? BadgeCheck;
        return (
          <div
            key={badge.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: cards ? "10px 14px" : "7px 12px",
              borderRadius: cards ? theme.cards.radius : 999,
              border: `1px solid ${theme.colors.border}`,
              background: cards ? theme.colors.card : hexToRgba(theme.colors.text, 0.04),
              fontSize: 12.5,
              color: theme.colors.mutedText,
            }}
          >
            <Icon size={14} aria-hidden style={{ color: theme.colors.accent }} />
            {badge.label}
          </div>
        );
      })}
    </div>
  );
}

export function DividerBlock({ block }: BlockProps) {
  const { theme } = useRender();
  if (block.variant === "dots") {
    return (
      <div
        style={{ display: "flex", gap: 6, justifyContent: "center", padding: "6px 0" }}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ width: 4, height: 4, borderRadius: 999, background: theme.colors.border }}
          />
        ))}
      </div>
    );
  }
  if (block.variant === "label" && block.content.label) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: theme.colors.mutedText,
          fontSize: 11.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ flex: 1, height: 1, background: theme.colors.border }} />
        {block.content.label}
        <span style={{ flex: 1, height: 1, background: theme.colors.border }} />
      </div>
    );
  }
  return <div style={{ height: 1, background: theme.colors.border }} aria-hidden />;
}

export function SpacerBlock({ block }: BlockProps) {
  return <div aria-hidden style={{ height: block.content.height ?? 24 }} />;
}
