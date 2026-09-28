import React from "react";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";
import { SwatchRow } from "./SwatchRow";
import type { MediaOverlay } from "../../../utils/styles";

export type { MediaOverlay };

/** Canonical media overlays already consumed by the photo renderer. */
export const mediaOverlayOptions: { value: MediaOverlay; label: string }[] = [
  { value: "none", label: "Sin superposición" },
  { value: "soft", label: "Suave" },
  { value: "medium", label: "Media" },
  { value: "intense", label: "Intensa" },
];

/** Canonical zoom steps for a photo inside its frame. */
export const mediaZoomOptions: { value: string; label: string }[] = [
  { value: "1", label: "Original" },
  { value: "1.15", label: "115%" },
  { value: "1.3", label: "130%" },
  { value: "1.5", label: "150%" },
];

interface MediaZoomPickerProps {
  value: string;
  onChange: (value: string) => void;
}

/** «Zoom»: same control for hero, avatar and card imagery. */
export function MediaZoomPicker({ value, onChange }: MediaZoomPickerProps) {
  return (
    <PanelSection title="Zoom" hint="Acerca la foto dentro de su marco.">
      <Segmented
        ariaLabel="Zoom"
        options={mediaZoomOptions}
        value={value}
        onChange={onChange}
      />
    </PanelSection>
  );
}

interface MediaOverlayPickerProps {
  value: MediaOverlay;
  onChange: (value: MediaOverlay) => void;
}

/** «Superposición»: darkening veil over the photo, with the canonical levels. */
export function MediaOverlayPicker({ value, onChange }: MediaOverlayPickerProps) {
  return (
    <PanelSection title="Superposición" hint="Oscurece la foto para que el texto se lea mejor.">
      <Segmented
        ariaLabel="Superposición"
        options={mediaOverlayOptions}
        value={value}
        onChange={onChange}
      />
    </PanelSection>
  );
}

interface MediaOverlayColorPickerProps {
  colors: string[];
  value: string | undefined;
  onChange: (color: string) => void;
}

/** «Color»: only meaningful while a superposición is active. */
export function MediaOverlayColorPicker({ colors, value, onChange }: MediaOverlayColorPickerProps) {
  return (
    <PanelSection title="Color de la superposición">
      <SwatchRow
        colors={colors}
        value={value}
        onChange={(color) => {
          if (color) onChange(color);
        }}
      />
    </PanelSection>
  );
}
