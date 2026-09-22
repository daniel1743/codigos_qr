import React, { CSSProperties, useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { useEditor } from "../contexts/EditorContext";

interface InlineTextProps {
  value: string;
  onChange: (value: string) => void;
  onActivate: () => void;
  style: CSSProperties;
  selected: boolean;
  anchor: string;
  label: string;
  placeholder?: string;
  className?: string;
  clampLines?: number;
  singleLine?: boolean;
  as?: "h3" | "p" | "div" | "span";
}

export function InlineText({
  value,
  onChange,
  onActivate,
  style,
  selected,
  anchor,
  label,
  placeholder,
  className,
  clampLines,
  singleLine = false,
  as = "div",
}: InlineTextProps) {
  const { mode } = useEditor();
  const readonly = mode === "preview";
  const ref = useRef<HTMLElement>(null);
  const Tag = as as keyof JSX.IntrinsicElements;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (selected && !readonly && el && document.activeElement !== el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [selected, readonly]);

  const clampStyle: CSSProperties =
    clampLines && (!selected || readonly)
      ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: clampLines,
          overflow: "hidden",
        }
      : {};

  return (
    <div className="relative">
      {selected && !readonly && (
        <span className="pointer-events-none absolute -top-[9px] left-0 z-10 -translate-y-full rounded-md bg-sel px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">
          {label}
        </span>
      )}
      <Tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        data-editable={!readonly ? "true" : undefined}
        data-anchor={anchor}
        role="textbox"
        aria-label={label}
        tabIndex={readonly ? undefined : 0}
        contentEditable={!readonly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        spellCheck={false}
        onMouseDown={(event: React.MouseEvent) => {
          if (readonly) return;
          event.stopPropagation();
          onActivate();
        }}
        onFocus={() => {
          if (!readonly) onActivate();
        }}
        onInput={(event: React.FormEvent<HTMLElement>) =>
          onChange(event.currentTarget.innerText.replace(/\n+$/, ""))
        }
        onKeyDown={(event: React.KeyboardEvent) => {
          if (singleLine && event.key === "Enter") {
            event.preventDefault();
            (event.currentTarget as HTMLElement).blur();
          }
          if (event.key === "Escape") {
            (event.currentTarget as HTMLElement).blur();
          }
        }}
        style={{ ...style, ...clampStyle, overflowWrap: "break-word" }}
        className={cn(
          "relative -mx-1.5 -my-0.5 cursor-text rounded-md px-1.5 py-0.5 transition-[box-shadow,background-color] duration-150 ease-premium",
          !readonly && selected
            ? "bg-selSoft/70 shadow-[0_0_0_1.5px_#2F6FED]"
            : !readonly && "hover:shadow-[0_0_0_1px_rgba(47,111,237,0.35)]",
          readonly && "cursor-default",
          className,
        )}
      />
    </div>
  );
}
