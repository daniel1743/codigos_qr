import React from "react";
import {
  cardPaletteTokens,
  legacyVisualPalettes as visualPalettes,
} from "../../data/visualPresets";
import { PanelSection } from "../editor/controls/PanelSection";
import { cx } from "../../utils/cx";
import type { CardContext } from "./cardActions";
import { useEditor } from "../../contexts/EditorContext";

type PresetId = "cream" | "luxury" | "imageText" | "socialArc" | "iconCard" | "silverImage";

const presets: {
  id: PresetId;
  label: string;
  palette: keyof typeof cardPaletteTokens;
  layout: string;
  hint: string;
}[] = [
  {
    id: "cream",
    label: "Crema · Perfil",
    palette: "cream",
    layout: "cover",
    hint: "Portada cálida",
  },
  {
    id: "luxury",
    label: "Lujo · Negro y oro",
    palette: "black",
    layout: "editorial",
    hint: "Editorial oscuro",
  },
  {
    id: "imageText",
    label: "Imagen + texto",
    palette: "teal",
    layout: "image25",
    hint: "Imagen 25/75",
  },
  {
    id: "socialArc",
    label: "Arco social",
    palette: "caramel",
    layout: "highlight",
    hint: "Acento y arco",
  },
  { id: "iconCard", label: "Icono + texto", palette: "sage", layout: "iconText", hint: "Compacta" },
  {
    id: "silverImage",
    label: "Plata · Imagen de fondo",
    palette: "silver",
    layout: "backgroundImage",
    hint: "Imagen a sangre",
  },
];

export function CardPresetPicker({ ctx }: { ctx: CardContext }) {
  const ed = useEditor();
  const current = ed.doc.props[ctx.cardId]?.cardPreset;
  const apply = (preset: (typeof presets)[number]) => {
    const tokens = cardPaletteTokens[preset.palette];
    ed.updateDoc((doc) => ({
      ...doc,
      props: {
        ...doc.props,
        [ctx.cardId]: {
          ...doc.props[ctx.cardId],
          cardPreset: preset.id,
          layout: preset.layout,
          ratio: preset.layout === "image25" ? "25" : (doc.props[ctx.cardId]?.ratio ?? "50"),
          spacing: preset.id === "imageText" ? "S" : preset.id === "silverImage" ? "L" : "M",
          radius: preset.id === "luxury" ? "L" : "M",
          shadow: preset.id === "luxury" ? "lifted" : "soft",
          decorArc: preset.id === "socialArc" ? "on" : "off",
          decorRing: preset.id === "iconCard" ? "on" : "off",
          ...tokens,
        },
      },
    }));
    if (preset.id === "imageText" || preset.id === "silverImage") {
      ed.setProp(`${ctx.cardId}.img`, "shape", preset.id === "imageText" ? "bleed" : "bleed");
    }
  };

  return (
    <PanelSection
      title="Preset visual"
      hint="Es un punto de partida: después puedes editar cada elemento."
    >
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const palette = visualPalettes.find((p) => p.id === preset.palette);
          const active = current === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => apply(preset)}
              className={cx(
                "rounded-xl border p-2 text-left transition-colors",
                active ? "border-select bg-select-soft" : "border-line hover:border-[#CDD1D7]",
              )}
            >
              <span
                className="mb-2 flex h-10 overflow-hidden rounded-lg"
                style={{ background: palette?.page.color }}
              >
                <span className="m-1.5 w-1/3 rounded-md" style={{ background: palette?.accent }} />
                <span className="m-1.5 flex flex-1 flex-col justify-center gap-1">
                  <span
                    className="h-1.5 w-3/4 rounded-full"
                    style={{ background: palette?.page.fg }}
                  />
                  <span
                    className="h-1 w-1/2 rounded-full opacity-50"
                    style={{ background: palette?.page.fg }}
                  />
                </span>
              </span>
              <span className="block text-[11.5px] font-medium text-ink">{preset.label}</span>
              <span className="mt-0.5 block text-[10.5px] text-mute">{preset.hint}</span>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
