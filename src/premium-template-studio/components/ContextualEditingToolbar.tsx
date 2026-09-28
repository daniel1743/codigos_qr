import type { CSSProperties, ReactNode } from "react";

/** Shared contextual surface for frequent canvas editing actions. */
export function ContextualEditingToolbar({
  ariaLabel,
  children,
  className,
  onClick,
  style,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string | undefined;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`pts-contextual-toolbar${className ? ` ${className}` : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
