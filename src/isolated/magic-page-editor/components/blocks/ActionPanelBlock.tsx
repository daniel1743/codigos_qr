import React from "react";
import { ArrowRightIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { EditableText } from "../editor/EditableText";
import { EditableCTA, type CtaVariants } from "../editor/EditableCTA";
import { cx } from "../../utils/cx";
import { blockPrefix } from "../../utils/styles";
import {
  ACTION_SEEDS,
  actionHref,
  actionKindOf,
  resolvePanelSurface,
  type PanelSurface,
} from "../../utils/actionPanelOps";
import type { BlockRef, BlockType } from "../../types/editor";

/** The three blocks this primitive backs. They differ only in their defaults. */
export type ActionPanelType = Extract<BlockType, "cta" | "whatsapp" | "contact">;

interface ActionPanelBlockProps {
  block: BlockRef;
  type: ActionPanelType;
  ctaVariants: CtaVariants;
  maxWidth?: number;
}

const DEFAULTS: Record<
  ActionPanelType,
  { surface: PanelSurface; kind: keyof typeof ACTION_SEEDS; heading: string; sub: string; action: string }
> = {
  cta: {
    surface: "accent",
    kind: "web",
    heading: "¿Te tentamos?",
    sub: "Cuéntanos qué necesitas y te preparamos una propuesta.",
    action: "Escríbenos",
  },
  whatsapp: {
    surface: "surface",
    kind: "whatsapp",
    heading: "¿Hablamos?",
    sub: "Respondemos en minutos.",
    action: "Abrir WhatsApp",
  },
  contact: { surface: "plain", kind: "email", heading: "", sub: "", action: "Escríbenos" },
};

/**
 * The type's default surface. Exported so the editor's presentation picker shows
 * the same default the renderer uses — two copies of this table would be two
 * sources of truth, and the panel would silently disagree with the page.
 */
export const ACTION_PANEL_DEFAULT: Record<ActionPanelType, PanelSurface> = {
  cta: DEFAULTS.cta.surface,
  whatsapp: DEFAULTS.whatsapp.surface,
  contact: DEFAULTS.contact.surface,
};

/** Contact's labelled rows, matching the target's own list. */
export const CONTACT_ROWS = [
  { key: "email", icon: MailIcon, label: "Correo", fieldLabel: "Correo", placeholder: "hola@tudominio.com" },
  { key: "phone", icon: PhoneIcon, label: "Teléfono", fieldLabel: "Teléfono", placeholder: "+34 600 000 000" },
  { key: "address", icon: MapPinIcon, label: "Dirección", fieldLabel: "Dirección", placeholder: "Calle, ciudad" },
] as const;

const ICON_FOR_KIND = {
  whatsapp: MessageCircleIcon,
  email: MailIcon,
  phone: PhoneIcon,
} as const;

/**
 * One panel with an action, backing `cta`, `whatsapp` and `contact`.
 *
 * The three are one anatomy — panel, optional heading, optional subtitle,
 * optional labelled rows, one action — so they are one implementation whose
 * differences live in `DEFAULTS`. Nothing here branches on a template id.
 *
 * The action goes through `EditableCTA`, the primitive the templates already
 * use, so it is a real anchor with a destination validated by the project's own
 * `normalizeDestination`, an authorable label, icon, shape and size — and no
 * second link mechanism exists to drift away from the first.
 */
export function ActionPanelBlock({ block, type, ctaVariants, maxWidth = 720 }: ActionPanelBlockProps) {
  const ed = useEditor();
  const m = ed.isMobile;
  const t = useThemeTokens();
  const p = blockPrefix(block);
  const fallback = DEFAULTS[type];
  const blockProps = ed.doc.props[`block:${block.key}`] ?? {};
  const surface = resolvePanelSurface(blockProps["panelSurface"], fallback.surface);
  const onAccent = surface === "accent";

  const headingId = `${p}${type}.title`;
  const subId = `${p}${type}.sub`;
  const actionId = `${p}${type}.action`;
  const actionProps = ed.doc.props[actionId] ?? {};
  const heading = ed.doc.texts[headingId] ?? fallback.heading;
  const sub = ed.doc.texts[subId] ?? fallback.sub;
  const label = ed.doc.texts[`${actionId}.label`] ?? fallback.action;
  // `??` and not `||`: a destination the author deliberately cleared stays
  // cleared. Only a block that has never stored one gets the seed, so a new
  // block is never born with a dead link.
  const rawHref = actionProps["href"] ?? ACTION_SEEDS[fallback.kind];
  /** `undefined` — not `''` — so an unusable destination yields no `href` at all. */
  const href = actionHref(rawHref) || undefined;
  const kind = actionKindOf(rawHref);
  const ActionIcon = ICON_FOR_KIND[kind as keyof typeof ICON_FOR_KIND];

  const panelStyle: React.CSSProperties =
    onAccent
      ? { background: "var(--accent)", color: "var(--accent-fg)", borderRadius: t.radius }
      : surface === "surface"
        ? { background: "var(--surface)", borderRadius: t.radius, boxShadow: "inset 0 0 0 1px var(--line)" }
        : {};
  const pad = onAccent ? (m ? 22 : 28) : surface === "surface" ? (m ? 20 : 24) : 0;

  return (
    <div className={cx("mx-auto w-full", m ? "px-5" : "px-10")} style={{ maxWidth: maxWidth + 80 }}>
      <div
        data-panel-surface={surface}
        data-action-kind={kind}
        className="text-center"
        style={{ ...panelStyle, padding: pad }}>

        {/* `contact` leads with a small eyebrow, as the target does; the other
            two lead with a heading. Both are the block's own text, opt-in. */}
        {type === "contact"
          ? heading.trim() !== "" &&
            <EditableText
              id={headingId}
              value={heading}
              as="p"
              label="Título del bloque"
              className="cq-muted mb-4 text-[11px] uppercase tracking-[0.3em]" />
          : heading.trim() !== "" &&
            <EditableText
              id={headingId}
              value={heading}
              as="p"
              label="Título del bloque"
              className="text-[20px] leading-snug sm:text-[24px]" />}

        {sub.trim() !== "" &&
          <EditableText
            id={subId}
            value={sub}
            as="p"
            label="Descripción"
            className={cx("mt-1 text-[13px]", onAccent ? "opacity-90" : "cq-muted")} />}

        {type === "contact" &&
          <div className="mt-6 border-t text-left" style={{ borderColor: "var(--line)" }}>
            {CONTACT_ROWS.map((row) => {
              const rowId = `${p}contact.${row.key}`;
              const rowLabel = ed.doc.texts[`${rowId}.label`] ?? "";
              if (rowLabel.trim() === "") return null;
              const rowHref = actionHref(ed.doc.props[rowId]?.["href"]);
              const Icon = row.icon;
              const body =
                <>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} aria-hidden="true" />
                  <EditableText id={`${rowId}.label`} value={rowLabel} as="span" label={row.label} className="text-[14px]" />
                </>;
              const rowClass = "flex items-center gap-3 border-b py-4";
              const rowStyle: React.CSSProperties = { borderColor: "var(--line)" };
              // A row only becomes a link when its destination is usable; a
              // half-typed one renders as plain text rather than a dead anchor.
              return rowHref !== "" ? (
                <a
                  key={row.key}
                  href={rowHref}
                  target="_blank"
                  rel="noreferrer"
                  data-contact-row={row.key}
                  className={cx(rowClass, "transition-opacity duration-150 hover:opacity-80")}
                  style={rowStyle}>
                  {body}
                </a>
              ) : (
                <span key={row.key} data-contact-row={row.key} className={rowClass} style={rowStyle}>
                  {body}
                </span>
              );
            })}
          </div>}

        {label.trim() !== "" &&
          <EditableCTA
            id={actionId}
            label={label}
            href={href}
            variants={ctaVariants}
            defaultVariant={onAccent ? "solid" : "apple"}
            elementLabel="Acción"
            className={cx(
              "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-[14px] font-semibold sm:w-auto",
              type === "contact" && "mt-6")}
            trailing={<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />}
            leading={ActionIcon ? <ActionIcon className="h-4 w-4" aria-hidden="true" /> : undefined} />}
      </div>
    </div>
  );
}
