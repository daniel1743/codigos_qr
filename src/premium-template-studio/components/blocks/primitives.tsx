import type { CSSProperties, ReactNode } from "react";
import { useRender } from "../../engine/RenderContext";
import { safeUrl } from "../../utils";
import type { TemplateBlock } from "../../types";

/** A link that is always safe, analytics-aware and inert while editing. */
export function SmartLink({
  href,
  block,
  style,
  className,
  children,
  ariaLabel,
  newTab: newTabProp,
  download,
}: {
  href?: string | undefined;
  block?: TemplateBlock | undefined;
  style?: CSSProperties | undefined;
  className?: string | undefined;
  children: ReactNode;
  ariaLabel?: string | undefined;
  /** Per-link override. Precedence: link.newTab → block.interaction.newTab → false. */
  newTab?: boolean | undefined;
  download?: string | undefined;
}) {
  const { mode, onTrack } = useRender();
  const url = safeUrl(href);
  const newTab = newTabProp ?? block?.interaction.newTab ?? false;

  if (mode === "edit" || !url) {
    return (
      <span
        role="link"
        aria-label={ariaLabel}
        aria-disabled={!url}
        className={className}
        style={{ ...style, cursor: "inherit" }}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={url}
      aria-label={ariaLabel}
      className={className}
      style={style}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      download={download}
      onClick={() => onTrack?.({ type: "link_click", blockId: block?.id, url })}
    >
      {children}
    </a>
  );
}

/** Text that can be edited straight on the canvas when the studio allows it. */
export function InlineText({
  path,
  value,
  as: Tag = "span",
  style,
  className,
  placeholder,
}: {
  path: string;
  value: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div" | undefined;
  style?: CSSProperties | undefined;
  className?: string | undefined;
  placeholder?: string | undefined;
}) {
  const { mode, onInlineEdit } = useRender();
  const editable = mode === "edit" && Boolean(onInlineEdit);
  const content = value || (editable ? (placeholder ?? "") : "");

  if (!editable) {
    return (
      <Tag style={style} className={className}>
        {content}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      style={{ ...style, outline: "none", cursor: "text" }}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-pts-inline={path}
      onFocus={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && Tag !== "p" && Tag !== "div") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        e.stopPropagation();
      }}
      onBlur={(e) => {
        const next = (e.target as HTMLElement).innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (next !== value) onInlineEdit?.(path, next);
      }}
    >
      {content}
    </Tag>
  );
}

export function BlockTitle({ title, path }: { title?: string | undefined; path: string }) {
  const { theme } = useRender();
  if (title === undefined || title === "") return null;
  return (
    <InlineText
      as="h2"
      path={path}
      value={title}
      style={{
        fontFamily: theme.typography.headingFont,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: theme.colors.mutedText,
        margin: "0 0 10px",
      }}
    />
  );
}

export function EmptyBlockState({ label }: { label: string }) {
  const { theme } = useRender();
  return (
    <div
      style={{
        border: `1px dashed ${theme.colors.border}`,
        borderRadius: theme.cards.radius,
        padding: "20px 16px",
        textAlign: "center",
        color: theme.colors.mutedText,
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}
