import React, { useMemo, useState } from "react";
import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import { cx } from "../../../utils/cx";
import { colorFamilies, visualPaletteById } from "../../../data/visualPresets";
import { PanelSection } from "./PanelSection";
import { SwatchRow } from "./SwatchRow";

export function PalettePicker({
  value,
  onChange,
  textColor,
  onTextColorChange,
  swatches = ["#111111", "#FFFFFF", "#6F5A48", "#1F4E57", "#3A3D44"],
}: {
  value?: string;
  onChange: (value: string) => void;
  textColor?: string;
  onTextColorChange?: (v: string | undefined) => void;
  swatches?: string[];
}) {
  const initialFamily = visualPaletteById[value ?? ""]?.familyId ?? colorFamilies[0].id;
  const [familyId, setFamilyId] = useState(initialFamily);
  const [showVariants, setShowVariants] = useState(Boolean(value));
  const family = colorFamilies.find((item) => item.id === familyId) ?? colorFamilies[0];
  const active = visualPaletteById[value ?? ""];
  const variants = useMemo(
    () =>
      family.variants.map(
        (_, index) =>
          visualPaletteById[
            `${family.id}-${["light", "soft", "medium", "rich", "dark", "premium"][index]}`
          ],
      ),
    [family],
  );

  return (
    <div className="space-y-4">
      {!showVariants ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ink">Familias de color</p>
              <p className="text-[11px] text-mute">Elige una dirección visual.</p>
            </div>
            <span className="rounded-full bg-select-soft px-2 py-1 text-[10px] font-semibold text-select">
              12 familias
            </span>
          </div>
          <div
            data-palette-families
            className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1"
          >
            {colorFamilies.map((item) => {
              const preview = visualPaletteById[`${item.id}-medium`];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFamilyId(item.id);
                    setShowVariants(true);
                  }}
                  className="rounded-xl border border-line p-2 text-left transition-colors hover:border-select hover:bg-select-soft"
                >
                  <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
                    {preview.swatches.slice(0, 4).map((color) => (
                      <span key={color} className="flex-1" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="block text-[12px] font-medium text-ink">{item.label}</span>
                  <span className="text-[10px] text-mute">6 variantes</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowVariants(false)}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-select"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Familias
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
              {family.label}
            </span>
          </div>
          <div
            data-palette-grid
            className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1"
          >
            {variants.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={
                  value === palette.id ||
                  value ===
                    Object.entries(visualPaletteById).find(([, item]) => item.id === value)?.[0]
                }
                onClick={() => onChange(palette.id)}
                className={cx(
                  "rounded-xl border p-2 text-left",
                  value === palette.id ? "border-select bg-select-soft" : "border-line",
                )}
              >
                <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
                  {palette.swatches.slice(0, 4).map((color) => (
                    <span key={color} className="flex-1" style={{ background: color }} />
                  ))}
                </span>
                <span className="flex items-center justify-between text-[12px] font-medium text-ink">
                  {palette.label}
                  {value === palette.id && <CheckIcon className="h-3.5 w-3.5 text-select" />}
                </span>
              </button>
            ))}
          </div>
          {active && (
            <p className="text-[11px] text-mute">
              Seleccionada: <span className="font-medium text-ink">{active.label}</span>
            </p>
          )}
        </>
      )}
      {onTextColorChange && (
        <PanelSection
          title="Color de texto único"
          hint="Fuerza un mismo color para todo el texto de la página."
        >
          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!textColor}
              onChange={(e) =>
                onTextColorChange(e.target.checked ? swatches[0] || "#000000" : undefined)
              }
              className="rounded border-line text-select focus:ring-select"
            />
            <span className="text-[13px] font-medium text-ink">Unificar color de texto</span>
          </label>
          {textColor && (
            <div className="flex items-center justify-between gap-3">
              <SwatchRow colors={swatches} value={textColor} onChange={onTextColorChange} />
              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-line shadow-sm">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer"
                />
              </div>
            </div>
          )}
        </PanelSection>
      )}
    </div>
  );
}
