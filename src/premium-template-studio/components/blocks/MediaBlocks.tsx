import { ArrowLeft, ArrowRight, ArrowUpRight, ImageOff, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useRender } from "../../engine/RenderContext";
import { applyTypographyOverride, cardStyle, headingStyle } from "../../engine/styleEngine";
import { videoEmbedUrl } from "../../utils";
import { BlockTitle, EmptyBlockState, InlineText, SmartLink } from "./primitives";
import type { BlockProps } from "./ContentBlocks";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { getGalleryColumns, moveGalleryLightboxIndex } from "./galleryImages";

const ASPECT: Record<string, string> = {
  square: "1 / 1",
  video: "16 / 9",
  portrait: "3 / 4",
  auto: "auto",
};

/** Image with a graceful broken-asset state. */
function SafeImage({
  src,
  alt,
  radius,
  aspect,
}: {
  src?: string | undefined;
  alt?: string | undefined;
  radius: number;
  aspect?: string | undefined;
}) {
  const { theme } = useRender();
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} (unavailable)` : "Image unavailable"}
        style={{
          aspectRatio: ASPECT[aspect ?? "square"],
          width: "100%",
          borderRadius: radius,
          display: "grid",
          placeItems: "center",
          background: theme.colors.surface,
          border: `1px dashed ${theme.colors.border}`,
          color: theme.colors.mutedText,
        }}
      >
        <ImageOff size={18} aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        aspectRatio: ASPECT[aspect ?? "square"],
        objectFit: "cover",
        display: "block",
        borderRadius: radius,
      }}
    />
  );
}

export function VideoBlock({ block }: BlockProps) {
  const { theme, mode } = useRender();
  const embed = videoEmbedUrl(block.content);
  const card = block.variant === "card";
  const body = !embed ? (
    <EmptyBlockState label="Paste a YouTube or Vimeo link to embed a video." />
  ) : mode === "edit" ? (
    // Editor shows a lightweight poster instead of a live iframe (fast canvas).
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: theme.cards.radius,
        overflow: "hidden",
        background: theme.colors.surface,
        display: "grid",
        placeItems: "center",
      }}
    >
      {block.content.provider !== "vimeo" && block.content.videoId ? (
        <img
          src={`https://i.ytimg.com/vi/${block.content.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <PlayCircle
        size={44}
        aria-hidden
        style={{
          position: "relative",
          color: "#fff",
          filter: "drop-shadow(0 2px 12px rgba(0,0,0,.5))",
        }}
      />
    </div>
  ) : (
    <iframe
      src={embed}
      title={block.content.title || "Video"}
      loading="lazy"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        border: 0,
        borderRadius: theme.cards.radius,
        display: "block",
      }}
    />
  );

  return (
    <div style={card ? { ...cardStyle(theme, block.style) } : undefined}>
      <BlockTitle title={block.content.title} path={`blocks.${block.id}.content.title`} />
      {body}
    </div>
  );
}

export function ImageBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const framed = block.variant === "framed";
  return (
    <figure
      style={{ margin: 0, ...(framed ? cardStyle(theme, { ...block.style, padding: 8 }) : {}) }}
    >
      <SafeImage
        src={block.content.imageUrl}
        alt={block.content.alt}
        aspect={block.layout.aspect}
        radius={block.variant === "full" ? 0 : theme.cards.radius - (framed ? 6 : 0)}
      />
    </figure>
  );
}

export function GalleryBlock({ block }: BlockProps) {
  const { theme, breakpoint, mode } = useRender();
  const images = block.content.images ?? [];
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  if (images.length === 0) {
    return mode === "edit" ? <EmptyBlockState label="No images yet. Upload from the Assets panel." /> : null;
  }
  const columns = getGalleryColumns(images.length, block.layout.columns ?? 3, breakpoint === "mobile");
  const activeImage = activeImageIndex === null ? null : images[activeImageIndex];
  const navigate = (direction: -1 | 1) => {
    setActiveImageIndex((index) =>
      index === null ? 0 : moveGalleryLightboxIndex(index, images.length, direction),
    );
  };

  return (
    <div>
      <BlockTitle title={block.content.title} path={`blocks.${block.id}.content.title`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: block.layout.gap ?? 8,
        }}
      >
        {images.map((image, i) => {
          const imageElement = (
            <SafeImage
              src={image.url}
              alt={image.alt ?? ""}
              radius={theme.cards.radius - 4}
              aspect={block.variant === "mosaic" && i === 0 ? "video" : "square"}
            />
          );
          return mode === "public" ? (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveImageIndex(i)}
              aria-label={`Open ${image.alt || `gallery image ${i + 1}`}`}
              style={{ border: 0, padding: 0, background: "transparent", cursor: "zoom-in", minWidth: 0 }}
            >
              {imageElement}
            </button>
          ) : (
            <div key={image.id}>{imageElement}</div>
          );
        })}
      </div>
      {mode === "public" ? (
        <Dialog open={activeImageIndex !== null} onOpenChange={(open) => !open && setActiveImageIndex(null)}>
          <DialogContent
            className="max-w-[min(96vw,72rem)] border-0 bg-transparent p-2 shadow-none"
            style={{ width: "min(96vw, 72rem)", maxWidth: "96vw" }}
          >
            <DialogTitle className="sr-only">
              {activeImage?.alt || "Gallery image"}
            </DialogTitle>
            {activeImage ? (
              <div style={{ display: "grid", gridTemplateColumns: images.length > 1 ? "auto minmax(0, 1fr) auto" : "minmax(0, 1fr)", alignItems: "center", gap: 8 }}>
                {images.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Previous image"
                    style={{ border: 0, borderRadius: 6, padding: 10, cursor: "pointer" }}
                  >
                    <ArrowLeft size={20} aria-hidden />
                  </button>
                ) : null}
                <img
                  src={activeImage.url}
                  alt={activeImage.alt ?? ""}
                  style={{ display: "block", width: "100%", maxHeight: "calc(100dvh - 7rem)", objectFit: "contain", borderRadius: theme.cards.radius }}
                />
                {images.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => navigate(1)}
                    aria-label="Next image"
                    style={{ border: 0, borderRadius: 6, padding: 10, cursor: "pointer" }}
                  >
                    <ArrowRight size={20} aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
            {images.length > 1 && activeImageIndex !== null ? (
              <p className="sr-only">{`${activeImageIndex + 1} of ${images.length}`}</p>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function MediaCardBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const row = block.variant === "row";
  return (
    <SmartLink href={block.content.url} block={block} ariaLabel={block.content.title}>
      <article
        className="pts-hoverable"
        style={{
          ...cardStyle(theme, block.style),
          padding: 0,
          overflow: "hidden",
          display: row ? "flex" : "block",
          height: "100%",
        }}
      >
        <div style={{ width: row ? 120 : "100%", flexShrink: 0 }}>
          <SafeImage
            src={block.content.imageUrl}
            alt=""
            radius={0}
            aspect={row ? "square" : "video"}
          />
        </div>
        <div style={{ padding: theme.cards.padding }}>
          <InlineText
            as="h3"
            path={`blocks.${block.id}.content.title`}
            value={block.content.title ?? ""}
            placeholder="Card title"
            style={{ ...headingStyle(theme, 0.46) }}
          />
          {block.content.body ? (
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.colors.mutedText }}>
              {block.content.body}
            </p>
          ) : null}
        </div>
      </article>
    </SmartLink>
  );
}

export function PortfolioBlock({ block }: BlockProps) {
  const { theme, breakpoint } = useRender();
  const items = block.content.items ?? [];
  if (items.length === 0) return <EmptyBlockState label="No projects yet." />;
  const columns = breakpoint === "mobile" ? 1 : (block.layout.columns ?? 2);
  return (
    <div>
      <BlockTitle title={block.content.title} path={`blocks.${block.id}.content.title`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: block.layout.gap ?? 10,
        }}
      >
        {items.map((item) => (
          <SmartLink
            key={item.id}
            href={item.url}
            block={block}
            newTab={item.newTab}
            ariaLabel={item.label}
          >
            <article
              className="pts-hoverable"
              style={{
                ...cardStyle(theme, block.style),
                padding: block.variant === "cards" ? theme.cards.padding : 0,
                overflow: "hidden",
              }}
            >
              <SafeImage
                src={item.imageUrl}
                alt=""
                radius={block.variant === "cards" ? theme.cards.radius - 6 : 0}
                aspect="video"
              />
              <div style={{ padding: block.variant === "cards" ? "12px 0 0" : "12px 14px 14px" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {item.label}
                  <ArrowUpRight size={14} aria-hidden style={{ color: theme.colors.mutedText }} />
                </div>
                {item.description ? (
                  <div
                    style={applyTypographyOverride(
                      { fontSize: 12.5, color: theme.colors.mutedText, marginTop: 2 },
                      item.descriptionTypography,
                    )}
                  >
                    {item.description}
                  </div>
                ) : null}
              </div>
            </article>
          </SmartLink>
        ))}
      </div>
    </div>
  );
}
