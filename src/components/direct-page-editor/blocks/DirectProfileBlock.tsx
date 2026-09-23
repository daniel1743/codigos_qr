import React from "react";
import type { PageDocumentBlockV1 } from "../../../lib/direct-page-editor/page-document";
import { editable, text, type DirectBlockContext, type DirectBlockComponent } from "../DirectBlockRegistry";

export type AvatarSize = "S" | "M" | "L";
export type AvatarShape = "circle" | "arch" | "rounded";

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const SIZES: Record<AvatarSize, number> = { S: 64, M: 96, L: 120 };

function radiusFor(shape: AvatarShape, w: number): string {
  if (shape === "circle") return "9999px";
  if (shape === "arch")
    return `${w / 2}px ${w / 2}px ${Math.round(w * 0.12)}px ${Math.round(w * 0.12)}px`;
  return `${Math.round(w * 0.24)}px`;
}

export const DirectProfileBlock: DirectBlockComponent = (block, context) => {
  const content = block.content || {};
  const sizePreset = (content.avatarSize as AvatarSize) || "L";
  const shape = (content.avatarShape as AvatarShape) || "circle";
  const hasRing = content.avatarRing !== false;
  const size = SIZES[sizePreset];

  // In Direct Page V1, profile follows hero and overlaps by default.
  const isOverlap = block.variant === "overlap" || block.variant === "default" || !block.variant; 
  
  const imgUrl = (content.image as string) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80";

  return (
    <div
      className="direct-profile flex flex-col items-center text-center relative z-10"
      style={{
        marginTop: isOverlap ? -Math.round(size / 2) : 0,
      }}
    >
      <div
        className={cx(
          "relative mb-4 flex-shrink-0",
          hasRing && "ring-4 ring-white shadow-sm"
        )}
        style={{
          width: size,
          height: size,
          borderRadius: radiusFor(shape, size),
          backgroundColor: "#e5e7eb",
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ borderRadius: radiusFor(shape, size) }}
          />
        ) : null}
        
        {content.verificationBadge && (
          <div
            className="absolute -right-1 -bottom-1 bg-blue-500 rounded-full text-white border-2 border-white flex items-center justify-center"
            style={{ width: 24, height: 24 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center px-4 w-full max-w-2xl mx-auto">
        <div className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          {editable(context, `blocks.${block.id}.content.name`, text(content, "name") || "Tu Nombre", "h1")}
        </div>
        
        {text(content, "role") && (
          <div className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4">
            {editable(context, `blocks.${block.id}.content.role`, text(content, "role"), "p")}
          </div>
        )}

        <div className="text-base text-gray-600">
          {editable(context, `blocks.${block.id}.content.description`, text(content, "description"), "p")}
        </div>
      </div>
    </div>
  );
};
