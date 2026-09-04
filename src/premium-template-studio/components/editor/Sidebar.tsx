import { useState } from "react";
import * as Icons from "lucide-react";
import { useStudio } from "../../state/StudioProvider";
import { BLOCK_DEFINITIONS } from "../../constants/blockDefinitions";
import { SECTION_PRESETS } from "../../constants/sectionPresets";
import { THEMES, TYPOGRAPHY_PRESETS, FONT_OPTIONS } from "../../constants/themes";
import { LAYOUTS } from "../../constants/layouts";
import { TEMPLATE_DEFINITIONS } from "../../templates/definitions";
import { applyTemplateDefinition } from "../../engine/TemplateFactory";
import {
  MOTION_PRESET_OPTIONS,
  MOTION_PRESETS,
  ENTRANCE_OPTIONS,
  HOVER_OPTIONS,
  getMotionConfig,
} from "../../constants/motionPresets";
import {
  ColorInput,
  Field,
  NumberSlider,
  Section,
  Segmented,
  TextInput,
  Toggle,
} from "../ui/controls";
import { cx, formatSlug } from "../../utils";
import type { BlockType, MotionPresetId, EntrancePreset, HoverPreset } from "../../types";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Square;
  return <Cmp className={className ?? "h-4 w-4"} strokeWidth={1.7} />;
}

function BlocksPanel() {
  const { state, dispatch } = useStudio();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"presets" | "blocks">("presets");
  const groups = ["Content", "Actions", "Media", "Structure"];
  const presetCategories = [
    "Hero",
    "Services",
    "Booking",
    "Portfolio",
    "Reviews",
    "Products",
    "Media",
    "Contact",
  ];

  const filteredBlocks = BLOCK_DEFINITIONS.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredPresets = SECTION_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <Section title="Add content">
        <Segmented
          value={viewMode}
          options={[
            { value: "presets", label: "Sections" },
            { value: "blocks", label: "Blocks" },
          ]}
          onChange={(v) => setViewMode(v as "presets" | "blocks")}
        />
        <div className="mt-2" />
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder={viewMode === "presets" ? "Search sections…" : "Search blocks…"}
        />

        {viewMode === "presets" &&
          presetCategories.map((cat) => {
            const items = filteredPresets.filter((p) => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} className="space-y-2 mt-2">
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {cat}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        dispatch({ type: "insertBlocks", blocks: preset.createBlocks() })
                      }
                      className="group flex flex-col gap-1 rounded-xl border border-border bg-background p-3 text-left transition hover:border-foreground/30 hover:bg-accent relative overflow-hidden"
                    >
                      {preset.badge && (
                        <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                          {preset.badge}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {preset.previewType} layout
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        {viewMode === "blocks" &&
          groups.map((group) => {
            const items = filteredBlocks.filter((d) => d.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="space-y-2 mt-2">
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((definition) => (
                    <button
                      key={definition.type}
                      type="button"
                      onClick={() =>
                        dispatch({ type: "addBlock", blockType: definition.type as BlockType })
                      }
                      className="group flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left transition hover:border-foreground/30 hover:bg-accent"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon name={definition.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-medium text-foreground">{definition.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </Section>

      <Section title={`Structure · ${state.config.blocks.length}`}>
        <div className="space-y-1.5">
          {state.config.blocks.map((block, index) => {
            const definition = BLOCK_DEFINITIONS.find((d) => d.type === block.type);
            const selected = state.selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                className={cx(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition",
                  selected
                    ? "border-foreground/40 bg-accent"
                    : "border-border bg-background hover:bg-accent/60",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => dispatch({ type: "selectBlock", id: block.id })}
                >
                  <Icon
                    name={definition?.icon ?? "Square"}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                  <span className="truncate text-xs text-foreground">
                    {block.content.title || definition?.name || block.type}
                  </span>
                </button>
                <button
                  type="button"
                  title="Move up"
                  onClick={() => dispatch({ type: "moveBlock", id: block.id, direction: -1 })}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                >
                  <Icons.ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  onClick={() => dispatch({ type: "moveBlock", id: block.id, direction: 1 })}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === state.config.blocks.length - 1}
                >
                  <Icons.ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => dispatch({ type: "deleteBlock", id: block.id })}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Icons.Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function DesignPanel() {
  const { state, dispatch } = useStudio();
  const { theme, layout } = state.config;
  const motionConfig = getMotionConfig(state.config);

  return (
    <div>
      <Section title="Visual identity">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => dispatch({ type: "patch", path: "theme", value: preset })}
              className={cx(
                "overflow-hidden rounded-xl border p-1 transition",
                theme.id === preset.id
                  ? "border-foreground/50 ring-2 ring-ring/30"
                  : "border-border hover:border-foreground/30",
              )}
              title={preset.name}
            >
              <span
                className="block h-10 w-full rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.accent})`,
                }}
              />
              <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Colors">
        <Field label="Primary">
          <ColorInput
            value={theme.colors.primary}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.primary", value: v })}
          />
        </Field>
        <Field label="Accent">
          <ColorInput
            value={theme.colors.accent}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.accent", value: v })}
          />
        </Field>
        <Field label="Background">
          <ColorInput
            value={theme.colors.background}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.background", value: v })}
          />
        </Field>
        <Field label="Background layer">
          <ColorInput
            value={theme.background.color ?? theme.colors.background}
            onChange={(v) => dispatch({ type: "patch", path: "theme.background.color", value: v })}
          />
        </Field>
        <Field label="Background blur">
          <NumberSlider
            value={theme.background.blur ?? 0}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.background.blur", value: v })}
          />
        </Field>
        <Field label="Surface">
          <ColorInput
            value={theme.colors.surface}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.surface", value: v })}
          />
        </Field>
        <Field label="Text">
          <ColorInput
            value={theme.colors.text}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.text", value: v })}
          />
        </Field>
      </Section>

      <Section title="Typography">
        <div className="grid grid-cols-2 gap-2">
          {TYPOGRAPHY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                dispatch({
                  type: "patch",
                  path: "theme.typography",
                  value: {
                    ...theme.typography,
                    headingFont: preset.headingFont,
                    bodyFont: preset.bodyFont,
                    headingWeight: preset.headingWeight,
                    headingSize: preset.headingSize,
                    letterSpacing: preset.letterSpacing,
                  },
                })
              }
              className="rounded-lg border border-border p-2 text-left transition hover:bg-accent"
            >
              <span
                className="block text-sm text-foreground"
                style={{ fontFamily: preset.headingFont }}
              >
                {preset.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {preset.headingWeight} · {preset.headingSize}px
              </span>
            </button>
          ))}
        </div>
        <Field label="Heading font">
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={theme.typography.headingFont}
            onChange={(e) =>
              dispatch({
                type: "patch",
                path: "theme.typography.headingFont",
                value: e.target.value,
              })
            }
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Body scale">
          <NumberSlider
            value={theme.typography.bodySize}
            min={13}
            max={19}
            suffix="px"
            onChange={(v) =>
              dispatch({ type: "patch", path: "theme.typography.bodySize", value: v })
            }
          />
        </Field>
        <Field label="Letter spacing">
          <NumberSlider
            value={theme.typography.letterSpacing}
            min={-2}
            max={4}
            step={0.5}
            onChange={(v) =>
              dispatch({ type: "patch", path: "theme.typography.letterSpacing", value: v })
            }
          />
        </Field>
      </Section>

      <Section title="Structure">
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => dispatch({ type: "patch", path: "layout", value: preset })}
              className={cx(
                "rounded-lg border p-2 text-left text-xs transition",
                layout.id === preset.id
                  ? "border-foreground/50 bg-accent"
                  : "border-border hover:bg-accent/60",
              )}
            >
              <span className="block font-medium text-foreground">{preset.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {preset.header} header · {preset.responsive.desktop.columns} col
              </span>
            </button>
          ))}
        </div>
        <Field label="Max width">
          <NumberSlider
            value={theme.spacing.contentWidth}
            min={380}
            max={1100}
            step={10}
            suffix="px"
            onChange={(v) =>
              dispatch({ type: "patch", path: "theme.spacing.contentWidth", value: v })
            }
          />
        </Field>
        <Field label="Block gap">
          <NumberSlider
            value={theme.spacing.block}
            min={4}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.spacing.block", value: v })}
          />
        </Field>
        <Field label="Corner radius">
          <NumberSlider
            value={theme.cards.radius}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.radius", value: v })}
          />
        </Field>
      </Section>

      <Section title="Cards & buttons">
        <Field label="Card preset">
          <Segmented
            size="sm"
            value={theme.cards.preset}
            options={[
              { value: "minimal", label: "Min" },
              { value: "soft", label: "Soft" },
              { value: "glass", label: "Glass" },
              { value: "elevated", label: "Lift" },
              { value: "luxury", label: "Lux" },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.preset", value: v })}
          />
        </Field>
        <Field label="Card shadow">
          <Segmented
            size="sm"
            value={theme.cards.shadow}
            options={[
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "elevated", label: "Elev" },
              { value: "floating", label: "Float" },
              { value: "glow", label: "Glow" },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.shadow", value: v })}
          />
        </Field>
        <Field label="Card blur">
          <NumberSlider
            value={theme.cards.blur}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.blur", value: v })}
          />
        </Field>
        <Field label="Card opacity">
          <NumberSlider
            value={Math.round(theme.cards.opacity * 100)}
            min={10}
            max={100}
            suffix="%"
            onChange={(v) =>
              dispatch({ type: "patch", path: "theme.cards.opacity", value: v / 100 })
            }
          />
        </Field>
        <Field label="Card border">
          <NumberSlider
            value={theme.cards.borderWidth}
            min={0}
            max={4}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.borderWidth", value: v })}
          />
        </Field>
        <Field label="Button style">
          <Segmented
            size="sm"
            value={theme.buttons.variant}
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "glass", label: "Glass" },
              { value: "gradient", label: "Grad" },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.variant", value: v })}
          />
        </Field>
        <Field label="Button shadow">
          <Segmented
            size="sm"
            value={theme.buttons.shadow}
            options={[
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "elevated", label: "Elev" },
              { value: "floating", label: "Float" },
              { value: "glow", label: "Glow" },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.shadow", value: v })}
          />
        </Field>
        <Field label="Button radius">
          <NumberSlider
            value={theme.buttons.radius}
            min={0}
            max={999}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.radius", value: v })}
          />
        </Field>
        <Field label="Button height">
          <NumberSlider
            value={theme.buttons.height}
            min={32}
            max={72}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.height", value: v })}
          />
        </Field>
        <Field label="Button border">
          <NumberSlider
            value={theme.buttons.borderWidth}
            min={0}
            max={4}
            suffix="px"
            onChange={(v) =>
              dispatch({ type: "patch", path: "theme.buttons.borderWidth", value: v })
            }
          />
        </Field>
      </Section>

      <Section title="Texture">
        <Field label="Preset">
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={theme.texture?.preset ?? "none"}
            onChange={(e) =>
              dispatch({
                type: "patch",
                path: "theme.texture",
                value: {
                  preset: e.target.value,
                  opacity: theme.texture?.opacity ?? 0.14,
                  scale: theme.texture?.scale ?? 24,
                },
              })
            }
          >
            <option value="none">None</option>
            <option value="grain">Grain</option>
            <option value="paper">Paper</option>
            <option value="linen">Linen</option>
            <option value="mesh">Mesh</option>
            <option value="frost">Frost</option>
          </select>
        </Field>
        <Field label="Texture opacity">
          <NumberSlider
            value={Math.round((theme.texture?.opacity ?? 0.14) * 100)}
            min={0}
            max={40}
            suffix="%"
            onChange={(v) =>
              dispatch({
                type: "patch",
                path: "theme.texture.opacity",
                value: v / 100,
              })
            }
          />
        </Field>
        <Field label="Texture scale">
          <NumberSlider
            value={theme.texture?.scale ?? 24}
            min={8}
            max={64}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.texture.scale", value: v })}
          />
        </Field>
      </Section>

      <Section title="Banner">
        <Toggle
          label="Show banner"
          checked={state.config.profile.banner.enabled}
          onChange={(v) => dispatch({ type: "patch", path: "profile.banner.enabled", value: v })}
        />
        <Field label="Banner image URL">
          <TextInput
            value={state.config.profile.banner.imageUrl ?? ""}
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.imageUrl", value: v })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Height">
          <NumberSlider
            value={state.config.profile.banner.height}
            min={80}
            max={380}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.height", value: v })}
          />
        </Field>
        <Field label="Mobile height">
          <NumberSlider
            value={state.config.profile.banner.mobileHeight}
            min={64}
            max={260}
            suffix="px"
            onChange={(v) =>
              dispatch({ type: "patch", path: "profile.banner.mobileHeight", value: v })
            }
          />
        </Field>
        <Field label="Banner blur">
          <NumberSlider
            value={state.config.profile.banner.blur}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.blur", value: v })}
          />
        </Field>
        <Field label="Focal X">
          <NumberSlider
            value={state.config.profile.banner.focalX}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.focalX", value: v })}
          />
        </Field>
        <Field label="Focal Y">
          <NumberSlider
            value={state.config.profile.banner.focalY}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.focalY", value: v })}
          />
        </Field>
        <Field label="Banner radius">
          <NumberSlider
            value={state.config.profile.banner.radius}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.radius", value: v })}
          />
        </Field>
        <Field label="Overlay">
          <NumberSlider
            value={Math.round(state.config.profile.banner.overlay * 100)}
            min={0}
            max={90}
            suffix="%"
            onChange={(v) =>
              dispatch({ type: "patch", path: "profile.banner.overlay", value: v / 100 })
            }
          />
        </Field>
        <Field label="Avatar size">
          <NumberSlider
            value={state.config.profile.avatar.size}
            min={56}
            max={160}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.avatar.size", value: v })}
          />
        </Field>
        <Field label="Avatar corner">
          <NumberSlider
            value={state.config.profile.avatar.radius}
            min={0}
            max={999}
            onChange={(v) => dispatch({ type: "patch", path: "profile.avatar.radius", value: v })}
          />
        </Field>
      </Section>

      {/* ---- Motion ---- */}
      <Section title="Motion">
        <Field label="Preset">
          <Segmented
            value={motionConfig.preset}
            options={MOTION_PRESET_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              const preset = MOTION_PRESETS[v as MotionPresetId];
              if (preset) {
                dispatch({ type: "patch", path: "motion", value: { ...preset } });
              }
            }}
            size="sm"
          />
        </Field>
        <Field label="Entrance">
          <Segmented
            value={motionConfig.entrance}
            options={ENTRANCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              dispatch({
                type: "patch",
                path: "motion",
                value: { ...motionConfig, entrance: v as EntrancePreset },
              });
            }}
            size="sm"
          />
        </Field>
        <Field label="Hover">
          <Segmented
            value={motionConfig.hover}
            options={HOVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              dispatch({
                type: "patch",
                path: "motion",
                value: { ...motionConfig, hover: v as HoverPreset },
              });
            }}
            size="sm"
          />
        </Field>
        <Field label="Speed">
          <NumberSlider
            value={motionConfig.duration}
            min={0}
            max={600}
            step={20}
            suffix="ms"
            onChange={(v) => {
              dispatch({ type: "patch", path: "motion", value: { ...motionConfig, duration: v } });
            }}
          />
        </Field>
        <Field label="Stagger">
          <NumberSlider
            value={motionConfig.stagger}
            min={0}
            max={120}
            step={5}
            suffix="ms"
            onChange={(v) => {
              dispatch({ type: "patch", path: "motion", value: { ...motionConfig, stagger: v } });
            }}
          />
        </Field>
      </Section>
    </div>
  );
}

function TemplatesPanel() {
  const { state, dispatch } = useStudio();
  const [keepContent, setKeepContent] = useState(true);

  return (
    <div>
      <Section title="Templates">
        <Toggle label="Keep my content" checked={keepContent} onChange={setKeepContent} />
        <div className="grid gap-2">
          {TEMPLATE_DEFINITIONS.map((definition) => {
            const active = state.config.templateDefinitionId === definition.id;
            return (
              <button
                key={definition.id}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "replaceConfig",
                    config: applyTemplateDefinition(state.config, definition.id, keepContent),
                  })
                }
                className={cx(
                  "rounded-xl border p-3 text-left transition",
                  active ? "border-foreground/50 bg-accent" : "border-border hover:bg-accent/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{definition.name}</span>
                  {definition.premium && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background">
                      Premium
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{definition.category}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{definition.description}</p>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function SettingsPanel() {
  const { state, dispatch } = useStudio();
  const { seo, settings } = state.config;

  return (
    <div>
      <Section title="Page">
        <Field label="Slug">
          <TextInput
            value={settings.slug}
            onChange={(v) =>
              dispatch({ type: "patch", path: "settings.slug", value: formatSlug(v) })
            }
          />
        </Field>
        <Toggle
          label="Show branding"
          checked={settings.showBranding}
          onChange={(v) => dispatch({ type: "patch", path: "settings.showBranding", value: v })}
        />
        <Toggle
          label="Index in search engines"
          checked={seo.index}
          onChange={(v) => dispatch({ type: "patch", path: "seo.index", value: v })}
        />
      </Section>
      <Section title="SEO">
        <Field label="Title">
          <TextInput
            value={seo.title}
            onChange={(v) => dispatch({ type: "patch", path: "seo.title", value: v })}
          />
        </Field>
        <Field label="Description">
          <TextInput
            value={seo.description}
            onChange={(v) => dispatch({ type: "patch", path: "seo.description", value: v })}
          />
        </Field>
        <Field label="Social image URL">
          <TextInput
            value={seo.socialImage ?? ""}
            onChange={(v) => dispatch({ type: "patch", path: "seo.socialImage", value: v })}
          />
        </Field>
      </Section>
    </div>
  );
}

export function SidebarContent() {
  const { panel } = useStudio();
  if (panel === "design") return <DesignPanel />;
  if (panel === "templates") return <TemplatesPanel />;
  if (panel === "settings") return <SettingsPanel />;
  return <BlocksPanel />;
}

export function SidebarTabs() {
  const { panel, setPanel } = useStudio();
  const tabs = [
    { id: "blocks", label: "Blocks", icon: "LayoutGrid" },
    { id: "design", label: "Design", icon: "Palette" },
    { id: "templates", label: "Templates", icon: "Sparkles" },
    { id: "settings", label: "Settings", icon: "Settings2" },
  ] as const;

  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setPanel(tab.id)}
          className={cx(
            "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition",
            panel === tab.id
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon name={tab.icon} className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-border bg-card">
      <SidebarTabs />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarContent />
      </div>
    </aside>
  );
}
