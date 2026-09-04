import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  ShoppingBag,
  Music,
  ArrowRight,
  Info,
  Home,
  Briefcase,
  User,
  Heart,
} from "lucide-react";
import { useRender } from "../../engine/RenderContext";
import { cardStyle, headingStyle } from "../../engine/styleEngine";
import { hexToRgba, safeUrl } from "../../utils";
import type { BlockItem, TemplateBlock } from "../../types";

// Dynamic Icon resolver
function SmartIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const icons: Record<string, React.ElementType> = {
    home: Home,
    services: Briefcase,
    portfolio: Briefcase,
    book: Calendar,
    booking: Calendar,
    profile: User,
    about: User,
    contact: MailIconPlaceholder,
    heart: Heart,
    shop: ShoppingBag,
    products: ShoppingBag,
    music: Music,
    map: MapPin,
    location: MapPin,
  };

  const IconCmp = icons[normalized];
  if (!IconCmp) return <ExternalLink size={size} className={className} style={style} />;
  return React.createElement(IconCmp, { size, className, style });
}

function MailIconPlaceholder({
  size = 16,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Product Card                                                    */
/* ------------------------------------------------------------------ */
export function ProductCardBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;
  const variant = block.variant ?? "card";

  const handleCTA = () => {
    if (!c.ctaUrl || mode === "edit") return;
    window.open(c.ctaUrl, "_blank", "noopener,noreferrer");
  };

  const isMinimal = variant === "minimal";
  const isImageFirst = variant === "image-first";
  const isFeatured = variant === "featured";

  const wrapperStyle =
    variant === "card" || isImageFirst || isFeatured
      ? { ...cardStyle(theme, block.style), padding: 0, overflow: "hidden" }
      : { padding: 12 };

  return (
    <div
      style={{
        ...wrapperStyle,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Badge */}
      {typeof c.badge === "string" && c.badge && (
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            backgroundColor: theme.colors.accent,
            color: "#ffffff",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 4,
            textTransform: "uppercase",
            zIndex: 10,
          }}
        >
          {c.badge}
        </span>
      )}

      {c.imageUrl && !isMinimal && (
        <div style={{ width: "100%", height: isFeatured ? 220 : 160, overflow: "hidden" }}>
          <img
            src={c.imageUrl}
            alt={c.title ?? "Product Image"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <div
        style={{
          padding: isMinimal ? 0 : 16,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 8,
        }}
      >
        <h3 style={{ ...headingStyle(theme, 0.85), fontSize: isFeatured ? "17px" : "14.5px" }}>
          {c.title || "Product Title"}
        </h3>

        {c.description && (
          <p
            style={{ fontSize: "12.5px", color: theme.colors.mutedText, lineHeight: 1.4, flex: 1 }}
          >
            {c.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: theme.colors.text }}>
            {c.price || "$0.00"}
          </span>
          {c.comparePrice && (
            <span
              style={{
                fontSize: "13px",
                color: theme.colors.mutedText,
                textDecoration: "line-through",
                opacity: 0.7,
              }}
            >
              {c.comparePrice}
            </span>
          )}
        </div>

        {c.ctaLabel && (
          <button
            onClick={handleCTA}
            style={{
              width: "100%",
              padding: "8px 14px",
              borderRadius: theme.buttons.radius,
              backgroundColor: theme.colors.primary,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <ShoppingBag size={14} />
            {c.ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Product Grid                                                    */
/* ------------------------------------------------------------------ */
export function ProductGridBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const products = block.content.products ?? [];
  const columns = block.layout.columns ?? 2;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
        gap: 16,
        width: "100%",
      }}
    >
      {products.map((prod: BlockItem, idx: number) => {
        // Build a mock child block definition to render child cards
        const prodBlock: TemplateBlock = {
          id: prod.id ?? `prod-${idx}`,
          type: "product",
          variant: block.variant === "minimal" ? "minimal" : "card",
          content: (() => {
            const { location: ignoredLocation, ...productContent } = prod;
            void ignoredLocation;
            return productContent;
          })(),
          style: block.style,
          layout: {},
          visibility: { desktop: true, tablet: true, mobile: true },
          interaction: block.interaction,
        };
        return <ProductCardBlock key={prodBlock.id} block={prodBlock} />;
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Booking Block                                                   */
/* ------------------------------------------------------------------ */
export function BookingBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const dates = c.availableDates ?? ["Mon, Aug 24", "Tue, Aug 25", "Wed, Aug 26"];
  const times = c.availableTimes ?? ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"];

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || mode === "edit") return;
    setConfirmed(true);
    // Integration point: call external webhook/adapter if present
    const adapter = (
      window as Window & {
        pts?: {
          adapters?: {
            booking?: (payload: { service?: string; date: string; time: string }) => void;
          };
        };
      }
    ).pts?.adapters?.booking;
    if (adapter) {
      adapter({
        ...(c.service !== undefined ? { service: c.service } : {}),
        date: selectedDate,
        time: selectedTime,
      });
    }
  };

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <h3 style={headingStyle(theme, 0.8)}>{c.title || "Book an Appointment"}</h3>
        {c.description && (
          <p style={{ fontSize: "12.5px", color: theme.colors.mutedText, marginTop: 4 }}>
            {c.description}
          </p>
        )}
      </div>

      {c.service && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            backgroundColor: hexToRgba(theme.colors.text, 0.04),
            fontSize: "13px",
          }}
        >
          <div className="flex justify-between font-semibold">
            <span>{c.service}</span>
            <span style={{ color: theme.colors.accent }}>{c.price}</span>
          </div>
          {c.duration && (
            <span style={{ fontSize: "11px", color: theme.colors.mutedText }}>
              Duration: {c.duration}
            </span>
          )}
        </div>
      )}

      {confirmed ? (
        <div
          style={{
            textAlign: "center",
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: hexToRgba(theme.colors.accent, 0.15),
              color: theme.colors.accent,
              display: "grid",
              placeItems: "center",
              fontSize: 20,
            }}
          >
            ✓
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>Reserva Solicitada!</span>
          <span style={{ fontSize: "12px", color: theme.colors.mutedText }}>
            {selectedDate} a las {selectedTime}
          </span>
          <button
            onClick={() => {
              setConfirmed(false);
              setSelectedDate(null);
              setSelectedTime(null);
            }}
            style={{
              marginTop: 8,
              fontSize: "11px",
              color: theme.colors.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Modificar reserva
          </button>
        </div>
      ) : (
        <>
          {/* Date Picker Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: theme.colors.mutedText,
              }}
            >
              Select Date
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {dates.map((date: string) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    borderRadius: 8,
                    border: `1px solid ${selectedDate === date ? theme.colors.accent : theme.colors.border}`,
                    backgroundColor:
                      selectedDate === date ? hexToRgba(theme.colors.accent, 0.1) : "transparent",
                    color: selectedDate === date ? theme.colors.accent : theme.colors.text,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker Grid */}
          {selectedDate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: theme.colors.mutedText,
                }}
              >
                Select Time
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {times.map((time: string) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: `1px solid ${selectedTime === time ? theme.colors.accent : theme.colors.border}`,
                      backgroundColor:
                        selectedTime === time ? hexToRgba(theme.colors.accent, 0.1) : "transparent",
                      color: selectedTime === time ? theme.colors.accent : theme.colors.text,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: theme.buttons.radius,
              backgroundColor:
                selectedDate && selectedTime
                  ? theme.colors.primary
                  : hexToRgba(theme.colors.text, 0.1),
              color: selectedDate && selectedTime ? "#ffffff" : theme.colors.mutedText,
              fontWeight: 600,
              fontSize: "13px",
              border: "none",
              cursor: selectedDate && selectedTime ? "pointer" : "default",
              marginTop: 4,
            }}
          >
            {c.ctaLabel || "Confirm Reservation"}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Calendar Block                                                  */
/* ------------------------------------------------------------------ */
export function CalendarBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const c = block.content;
  const disabledDates = c.disabledDates ?? [];

  const [selectedDay, setSelectedDay] = useState<number | null>(24);

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSelectDay = (day: number) => {
    const dateStr = `2026-08-${String(day).padStart(2, "0")}`;
    if (disabledDates.includes(dateStr)) return;
    setSelectedDay(day);
  };

  return (
    <div style={{ ...cardStyle(theme, block.style), padding: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14.5px" }}>August 2026</h3>
        <span style={{ fontSize: "12px", color: theme.colors.mutedText }}>Mock Calendar</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          textAlign: "center",
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            style={{ fontSize: "11px", fontWeight: 700, color: theme.colors.mutedText }}
          >
            {d}
          </span>
        ))}

        {/* Empty cells to offset start day (August 1, 2026 is Saturday, so offset of 6 cells) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} />
        ))}

        {daysInMonth.map((day) => {
          const dateStr = `2026-08-${String(day).padStart(2, "0")}`;
          const isDisabled = disabledDates.includes(dateStr);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => handleSelectDay(day)}
              disabled={isDisabled}
              style={{
                aspectRatio: "1/1",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: isDisabled ? "default" : "pointer",
                backgroundColor: isSelected ? theme.colors.accent : "transparent",
                color: isSelected
                  ? "#ffffff"
                  : isDisabled
                    ? hexToRgba(theme.colors.text, 0.25)
                    : theme.colors.text,
                textDecoration: isDisabled ? "line-through" : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Events Block                                                    */
/* ------------------------------------------------------------------ */
export function EventsBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "list";

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ display: "grid", gap: 14, width: "100%" }}>
      {items.map((event: BlockItem, idx: number) => {
        const isFeatured = variant === "featured" && idx === 0;
        const isCards = variant === "cards" || isFeatured;

        return (
          <div
            key={event.id ?? idx}
            style={{
              ...cardStyle(
                theme,
                isCards
                  ? block.style
                  : { background: "transparent", borderWidth: 0, shadow: "none" },
              ),
              display: "flex",
              flexDirection: isFeatured ? "column" : "row",
              alignItems: isFeatured ? "stretch" : "center",
              padding: isCards ? "16px" : "8px",
              gap: 14,
              overflow: "hidden",
            }}
          >
            {event.imageUrl && (
              <div
                style={{
                  width: isFeatured ? "100%" : 70,
                  height: isFeatured ? 160 : 70,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src={event.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: theme.colors.accent,
                }}
              >
                <span>{event.date}</span>
                {event.time && <span>· {event.time}</span>}
              </div>
              <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14px" }}>{event.title}</h3>
              {event.location && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "11px",
                    color: theme.colors.mutedText,
                  }}
                >
                  <MapPin size={11} style={{ flexShrink: 0 }} />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {event.ctaLabel && (
              <button
                onClick={() => handleCTA(event.ctaUrl)}
                style={{
                  padding: "6px 12px",
                  borderRadius: theme.buttons.radius,
                  backgroundColor: theme.colors.primary,
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  alignSelf: isFeatured ? "flex-start" : "center",
                }}
              >
                {event.ctaLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Map Block                                                       */
/* ------------------------------------------------------------------ */
export function MapBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const loc = block.content.location ?? { lat: -33.45, lng: -70.66, label: "Santiago, Chile" };

  // Free map frame using Google Maps embed query params (which requires zero billing keys)
  const embedUrl = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", width: "100%", paddingBottom: "50%", height: 0 }}>
        <iframe
          src={embedUrl}
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
      {loc.label && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "12.5px",
          }}
        >
          <MapPin size={14} style={{ color: theme.colors.accent, flexShrink: 0 }} />
          <span style={{ color: theme.colors.text, fontWeight: 500 }} className="truncate">
            {loc.label}
          </span>
          <a
            href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              fontWeight: 600,
              color: theme.colors.accent,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Open Maps <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Music / Media Player                                            */
/* ------------------------------------------------------------------ */
export function MusicBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;
  const variant = block.variant ?? "card";

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // Fallback mock duration

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current || mode === "edit") return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    // Reset play state if source URL changes
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      setCurrentTime(0);
    }
  }, [c.audioUrl]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  return (
    <div
      style={{
        ...cardStyle(
          theme,
          isCompact ? { background: "transparent", borderWidth: 0, shadow: "none" } : block.style,
        ),
        display: "flex",
        flexDirection: isCompact ? "row" : "column",
        alignItems: "center",
        padding: isCompact ? "8px 12px" : "18px",
        gap: 12,
      }}
    >
      {/* Cover image */}
      {(c.coverUrl || !isCompact) && (
        <div
          style={{
            width: isCompact ? 48 : isFeatured ? 110 : 80,
            height: isCompact ? 48 : isFeatured ? 110 : 80,
            borderRadius: 8,
            backgroundColor: hexToRgba(theme.colors.accent, 0.12),
            color: theme.colors.accent,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {c.coverUrl ? (
            <img
              src={c.coverUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Music size={isFeatured ? 36 : 28} />
          )}
        </div>
      )}

      {/* Controls & details */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ textAlign: isCompact ? "left" : "center" }}>
          <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14px" }} className="truncate">
            {c.title || "Track Title"}
          </h3>
          <span
            style={{ fontSize: "12px", color: theme.colors.mutedText }}
            className="truncate block"
          >
            {c.artist || "Unknown Artist"}
          </span>
        </div>

        {/* Audio tag */}
        {c.audioUrl && (
          <audio
            ref={audioRef}
            src={c.audioUrl}
            onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
            onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
            onEnded={() => setPlaying(false)}
          />
        )}

        {/* Progress bar */}
        {!isCompact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "6px 0" }}>
            <div
              style={{
                height: 4,
                width: "100%",
                backgroundColor: theme.colors.border,
                borderRadius: 2,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${(currentTime / duration) * 100}%`,
                  backgroundColor: theme.colors.accent,
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: theme.colors.mutedText,
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Button */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
          <button
            onClick={togglePlay}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: theme.colors.accent,
              color: "#ffffff",
              border: "none",
              cursor: mode === "edit" ? "default" : "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: `0 4px 10px ${hexToRgba(theme.colors.accent, 0.2)}`,
            }}
          >
            {playing ? (
              <Pause size={16} fill="#ffffff" />
            ) : (
              <Play size={16} fill="#ffffff" style={{ marginLeft: 2 }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Carousel                                                        */
/* ------------------------------------------------------------------ */
export function CarouselBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const [active, setActive] = useState(0);

  const prev = () => {
    setActive((a) => (a === 0 ? items.length - 1 : a - 1));
  };

  const next = () => {
    setActive((a) => (a === items.length - 1 ? 0 : a + 1));
  };

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!items.length) {
    return <div className="text-center py-6 text-muted-foreground">No slides added</div>;
  }

  const current = items[active];

  if (!current) {
    return <div className="text-center py-6 text-muted-foreground">No slides added</div>;
  }

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        padding: 0,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Slide track — smooth translateX transition */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          height: 0,
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${items.length * 100}%`,
            transform: `translateX(-${active * (100 / items.length)}%)`,
            transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
          }}
        >
          {items.map((item: BlockItem, i: number) => (
            <div key={i} style={{ width: `${100 / items.length}%`, height: "100%", flexShrink: 0 }}>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
            transition: "background-color 0.15s ease",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={next}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
            transition: "background-color 0.15s ease",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          textAlign: "center",
        }}
      >
        {current.title && <h3 style={headingStyle(theme, 0.8)}>{current.title}</h3>}
        {current.description && (
          <p style={{ fontSize: "12.5px", color: theme.colors.mutedText }}>{current.description}</p>
        )}

        {current.linkUrl && (
          <button
            onClick={() => handleCTA(current.linkUrl)}
            style={{
              alignSelf: "center",
              marginTop: 4,
              fontSize: "11px",
              fontWeight: 600,
              color: theme.colors.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Saber más <ArrowRight size={11} />
          </button>
        )}

        {/* Indicator dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {items.map((_: BlockItem, i: number) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: active === i ? theme.colors.accent : theme.colors.border,
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "background-color 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Tabs                                                            */
/* ------------------------------------------------------------------ */
export function TabsBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];

  const [activeTab, setActiveTab] = useState<string | null>(items[0]?.id ?? null);
  const activeItem = items.find((i: BlockItem) => i.id === activeTab);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      const nextIndex = (index + 1) % items.length;
      const nextItem = items[nextIndex];
      if (nextItem) setActiveTab(nextItem.id);
    } else if (e.key === "ArrowLeft") {
      const prevIndex = (index - 1 + items.length) % items.length;
      const previousItem = items[prevIndex];
      if (previousItem) setActiveTab(previousItem.id);
    }
  };

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Tab bar header */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: hexToRgba(theme.colors.text, 0.02),
        }}
        role="tablist"
      >
        {items.map((item: BlockItem, idx: number) => {
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(item.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                color: isSelected ? theme.colors.accent : theme.colors.mutedText,
                borderBottom: isSelected ? `2.5px solid ${theme.colors.accent}` : "none",
                marginBottom: -1.5,
                transition: "color 0.16s ease",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab panel body */}
      <div
        style={{ padding: 16, fontSize: "13px", color: theme.colors.text, lineHeight: 1.5 }}
        role="tabpanel"
      >
        {activeItem ? (
          activeItem.contentText
        ) : (
          <span style={{ color: theme.colors.mutedText }}>No content</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Bottom Navigation                                              */
/* ------------------------------------------------------------------ */
export function BottomNavigationBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];

  const handleNav = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        backgroundColor: theme.colors.card,
        borderTop: `1px solid ${theme.colors.border}`,
        borderRadius: block.style.radius ?? 12,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        padding: "8px 10px",
        justifyContent: "space-around",
        alignItems: "center",
      }}
    >
      {items.map((item: BlockItem, idx: number) => (
        <button
          key={item.id ?? idx}
          onClick={() => handleNav(item.url)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            flex: 1,
            color: theme.colors.mutedText,
            transition: "color 0.16s ease",
          }}
          title={item.label}
        >
          <div style={{ color: theme.colors.accent }}>
            <SmartIcon name={item.icon ?? ""} size={20} />
          </div>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
