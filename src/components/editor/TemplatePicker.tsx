import React from "react";
import { Label } from "../ui/label";
import { LayoutTemplate } from "lucide-react";
import {
  TEMPLATE_FAMILY_OPTIONS,
  TEMPLATE_PRESETS,
  TemplateStyle,
} from "../../lib/design/template-presets";
import type { Profile } from "../../types/database";

interface TemplatePickerProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

// Applying a preset must also clear optional values from the previous one.
// Without this baseline, a light `theme_surface` from one template can remain
// active after selecting a dark template, leaving an unintended card and bars.
const TEMPLATE_STYLE_BASELINE: Partial<Profile> = {
  theme_layout: "classic_center",
  theme_surface: "transparent",
  theme_spacing: "standard",
  avatar_shape: "circle",
  ring_enabled: false,
  ring_color: "#000000",
  ring_thickness: "thin",
  title_color: null,
  title_size: "lg",
  title_weight: "bold",
  title_align: "center",
  bio_color: null,
  bio_size: "md",
  bio_weight: "normal",
  bio_align: "center",
  button_text_size: "md",
  button_text_weight: "semibold",
  button_content_align: "left",
  button_icon_position: "left",
};

function TemplateThumbnail({ style, name }: { style: TemplateStyle; name: string }) {
  const bg = style.background_color.includes("gradient")
    ? { background: style.background_color }
    : { backgroundColor: style.background_color };

  const radiusClass =
    style.button_radius === "none"
      ? "rounded-none"
      : style.button_radius === "full"
        ? "rounded-full"
        : "rounded-md";

  // Heurística para colores de UI en el mock (contraste contra el fondo)
  const isDarkBg =
    ["#111111", "#101010"].includes(style.background_color) ||
    style.background_color.includes("#2563EB") ||
    style.background_color.includes("#FB7185");
  const textColor = isDarkBg ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)";
  const avatarColor = isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  if (style.theme_layout?.startsWith("media_")) {
    const mediaOnRight = [
      "media_cobalt_editorial",
      "media_aqua_glass",
      "media_sage_maison",
      "media_scarlet_journal",
      "media_ocean_grid",
    ].includes(style.theme_layout);
    const cardColor = isDarkBg ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.82)";
    const cardBorder = isDarkBg ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.08)";
    const skeletonColor = isDarkBg ? "rgba(255,255,255,0.64)" : "rgba(15,23,42,0.58)";

    return (
      <div
        className="relative flex aspect-[4/5] w-full flex-col justify-end gap-1.5 overflow-hidden rounded-2xl border p-2.5 shadow-sm"
        style={bg}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.32) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="relative mb-auto flex items-center justify-between">
          <span
            className="rounded-full px-1.5 py-0.5 text-[7px] font-bold"
            style={{
              backgroundColor: style.button_color,
              color: style.button_text_color,
            }}
          >
            PRO
          </span>
          <span
            className="h-1.5 w-8 rounded-full"
            style={{ backgroundColor: skeletonColor, opacity: 0.7 }}
          />
        </div>
        <div className="relative flex flex-col gap-1.5">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`flex h-10 items-center gap-1.5 overflow-hidden border p-1 ${mediaOnRight ? "flex-row-reverse" : ""}`}
              style={{
                background: cardColor,
                borderColor: cardBorder,
                borderRadius: "8px",
              }}
            >
              <div
                className="h-full w-8 shrink-0 rounded-md"
                style={{ background: style.button_color }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: skeletonColor }}
                />
                <span
                  className="h-1 w-8 rounded-full opacity-50"
                  style={{ backgroundColor: skeletonColor }}
                />
              </div>
              <span className="text-[10px] font-bold" style={{ color: style.button_color }}>
                &gt;
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-[4/5] rounded-2xl overflow-hidden border shadow-sm flex flex-col items-center p-3 gap-2"
      style={bg}
    >
      {/* Avatar mock */}
      <div
        className="w-8 h-8 rounded-full shrink-0 shadow-sm"
        style={{ backgroundColor: avatarColor }}
      />
      {/* Name / Font mock (skeleton) */}
      <div className="flex flex-col items-center gap-1 w-full shrink-0 mt-0.5">
        <div className="max-w-full truncate px-1 text-[9px] font-bold" style={{ color: textColor }}>
          {name}
        </div>
        <div
          className="w-20 h-1.5 rounded-sm"
          style={{ backgroundColor: textColor, opacity: 0.4 }}
        />
      </div>
      {/* Button mocks */}
      <div className="w-full flex-1 flex flex-col justify-end gap-1.5 mt-1 pb-1">
        {[1, 2].map((i) => {
          let btnStyle: React.CSSProperties = { backgroundColor: style.button_color };
          let btnClass = `w-full h-5 border border-black/5 shadow-sm ${radiusClass}`;

          if (style.button_style === "line") {
            btnStyle = {
              borderBottom: `2px solid ${style.button_color}`,
              backgroundColor: "transparent",
            };
            btnClass = `w-full h-5 rounded-none`;
          } else if (style.button_style === "minimal") {
            btnStyle = { backgroundColor: "transparent" };
            btnClass = `w-full h-5 flex items-center justify-center`;
          } else if (style.button_style === "soft") {
            btnStyle = { backgroundColor: style.button_color, opacity: 0.4 };
            btnClass = `w-full h-5 ${radiusClass}`;
          } else if (style.button_style === "card") {
            btnStyle = {
              backgroundColor: "rgba(255,255,255,0.9)",
              borderColor: style.button_color,
            };
          } else if (style.button_style === "outline") {
            btnStyle = {
              backgroundColor: "transparent",
              border: `1px solid ${style.button_color}`,
            };
          }

          return (
            <div key={i} className={btnClass} style={btnStyle}>
              {style.button_style === "minimal" && (
                <div
                  className="w-4 h-1 rounded-full opacity-40"
                  style={{ backgroundColor: style.button_color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TemplatePicker({ profile, onChange }: TemplatePickerProps) {
  const [activeFamily, setActiveFamily] = React.useState("Todas");
  const [tierFilter, setTierFilter] = React.useState("all");

  const activeTemplate = TEMPLATE_PRESETS.find(
    (t) =>
      t.style.font_family === profile.font_family &&
      t.style.background_color === profile.background_color &&
      t.style.button_color === profile.button_color &&
      t.style.button_style === profile.button_style &&
      t.style.theme_layout === profile.theme_layout,
  );

  let visibleTemplates = TEMPLATE_PRESETS;
  if (activeFamily !== "Todas") {
    visibleTemplates = visibleTemplates.filter((t) => t.family === activeFamily);
  }
  if (tierFilter !== "all") {
    visibleTemplates = visibleTemplates.filter((t) => t.tier === tierFilter);
  }

  const applyTemplate = (style: TemplateStyle) => {
    onChange({
      ...TEMPLATE_STYLE_BASELINE,
      ...style,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-base">
            <LayoutTemplate className="w-4 h-4 text-primary" />
            Catálogo
          </Label>
          {activeTemplate ? (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shadow-sm border border-primary/20">
              {activeTemplate.name}
            </span>
          ) : (
            <span className="text-[10px] bg-muted border text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              Personalizado
            </span>
          )}
        </div>

        {/* Tier Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setTierFilter("all")}
            className={`text-xs px-3 py-1 rounded-md border ${tierFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setTierFilter("free")}
            className={`text-xs px-3 py-1 rounded-md border ${tierFilter === "free" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Gratis
          </button>
          <button
            onClick={() => setTierFilter("premium")}
            className={`text-xs px-3 py-1 rounded-md border ${tierFilter === "premium" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium" : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"}`}
          >
            Premium
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {["Todas", ...TEMPLATE_FAMILY_OPTIONS.map((family) => family.id)].map((familyId) => {
          const familyName =
            familyId === "Todas"
              ? "Todas"
              : TEMPLATE_FAMILY_OPTIONS.find((f) => f.id === familyId)?.name || familyId;
          return (
            <button
              key={familyId}
              type="button"
              onClick={() => setActiveFamily(familyId)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                activeFamily === familyId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {familyName}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 pb-1 scrollbar-thin">
        {visibleTemplates.map((template) => {
          const isActive = activeTemplate?.id === template.id;
          return (
            <button
              key={template.id}
              type="button"
              aria-label={`Aplicar plantilla ${template.name}`}
              aria-pressed={isActive}
              onClick={() => applyTemplate(template.style)}
              className="flex flex-col gap-2 group text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl relative"
            >
              <div
                className={`relative w-full rounded-[1.25rem] p-1 transition-all duration-200 ${isActive ? "bg-primary/5 border-2 border-primary" : "border-2 border-transparent hover:bg-muted"}`}
              >
                {template.tier === "premium" && (
                  <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    PRO
                  </div>
                )}
                <TemplateThumbnail style={template.style} name={template.name} />
              </div>
              <div className="px-1.5 space-y-1">
                <div
                  className={`text-sm font-semibold leading-tight flex items-center gap-1 ${isActive ? "text-primary" : ""}`}
                >
                  {template.name}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {template.description}
                </div>
              </div>
            </button>
          );
        })}
        {visibleTemplates.length === 0 && (
          <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
            No se encontraron plantillas.
          </div>
        )}
      </div>
    </div>
  );
}
