import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * F6 — Consolidated icon tile.
 *
 * Same recipe approved in F2 (`NoPageCard`: `grid h-12 w-12 place-items-center
 * rounded-cq-md bg-cq-blue-50 text-cq-blue`) exposed with the size steps already
 * used across the migrated surfaces. `surface`/`fg` accept the token classes only.
 */
export type CqIconTileSize = "sm" | "md" | "lg";

const sizeClasses: Record<CqIconTileSize, string> = {
  sm: "h-9 w-9 rounded-cq-xs",
  md: "h-12 w-12 rounded-cq-md",
  lg: "h-16 w-16 rounded-cq-lg",
};

export function CqIconTile({
  size = "md",
  tone = "accent",
  className,
  children,
}: {
  size?: CqIconTileSize | undefined;
  /** "accent" = approved blue-50 tile, "plain" = white tile on canvas ring. */
  tone?: "accent" | "plain" | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        sizeClasses[size],
        tone === "accent"
          ? "bg-cq-blue-50 text-cq-blue"
          : "bg-white text-cq-muted ring-1 ring-cq-line",
        className,
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export default CqIconTile;
