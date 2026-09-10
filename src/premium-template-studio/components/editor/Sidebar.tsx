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
import { useCapabilityAccess, isAssetLocked, ProBadge, Locked } from "../../entitlements";
import { POWER_EDITOR_LOCALES, type PowerEditorLocale } from "../../i18n/messages";
import { usePowerEditorLocale } from "../../i18n/PowerEditorLocale";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Square;
  return <Cmp className={className ?? "h-4 w-4"} strokeWidth={1.7} />;
}

function BlocksPanel() {
  const { state, dispatch, tier } = useStudio();
  const { messages } = usePowerEditorLocale();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"presets" | "blocks">("presets");
  const groups = ["Content", "Actions", "Media", "Structure"] as const;
  const presetCategories = [
    "Hero",
    "Services",
    "Booking",
    "Portfolio",
    "Reviews",
    "Products",
    "Media",
    "Contact",
  ] as const;

  const filteredBlocks = BLOCK_DEFINITIONS.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredPresets = SECTION_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const groupLabels = {
    Content: messages.sidebar.contentGroup,
    Actions: messages.sidebar.actionsGroup,
    Media: messages.sidebar.mediaGroup,
    Structure: messages.sidebar.structureGroup,
  } as const;
  const presetCategoryLabels = {
    Hero: "Hero",
    Services: messages.sidebar.servicesCategory,
    Booking: messages.sidebar.bookingCategory,
    Portfolio: messages.sidebar.portfolioCategory,
    Reviews: messages.sidebar.reviewsCategory,
    Products: messages.sidebar.productsCategory,
    Media: messages.sidebar.mediaGroup,
    Contact: messages.sidebar.contactCategory,
  } as const;

  return (
    <div>
      <Section title={messages.sidebar.addContent}>
        <Segmented
          value={viewMode}
          options={[
            { value: "presets", label: messages.sidebar.sections },
            { value: "blocks", label: messages.sidebar.blocks },
          ]}
          onChange={(v) => setViewMode(v as "presets" | "blocks")}
        />
        <div className="mt-2" />
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder={
            viewMode === "presets" ? messages.sidebar.searchSections : messages.sidebar.searchBlocks
          }
        />

        {viewMode === "presets" &&
          presetCategories.map((cat) => {
            const items = filteredPresets.filter((p) => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} className="space-y-2 mt-2">
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {presetCategoryLabels[cat]}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((preset) => {
                    const locked = isAssetLocked("section", preset.id, tier);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={locked}
                        aria-disabled={locked}
                        onClick={() => {
                          if (locked) return;
                          dispatch({ type: "insertBlocks", blocks: preset.createBlocks() });
                        }}
                        className={cx(
                          "group relative flex flex-col gap-1 overflow-hidden rounded-xl border border-border bg-background p-3 text-left transition",
                          locked
                            ? "cursor-not-allowed opacity-60"
                            : "hover:border-foreground/30 hover:bg-accent",
                        )}
                      >
                        {preset.badge && (
                          <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                            {preset.badge}
                          </span>
                        )}
                        <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                          {preset.name}
                          {locked && <ProBadge />}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {preset.previewType} {messages.sidebar.layoutPreview}
                        </span>
                      </button>
                    );
                  })}
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
                  {groupLabels[group]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((definition) => {
                    const locked = isAssetLocked("block", definition.type, tier);
                    return (
                      <button
                        key={definition.type}
                        type="button"
                        disabled={locked}
                        aria-disabled={locked}
                        onClick={() => {
                          if (locked) return;
                          dispatch({ type: "addBlock", blockType: definition.type as BlockType });
                        }}
                        className={cx(
                          "group flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left transition",
                          locked
                            ? "cursor-not-allowed opacity-60"
                            : "hover:border-foreground/30 hover:bg-accent",
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                          <Icon name={definition.icon} className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-1 text-xs font-medium text-foreground">
                          {definition.name}
                          {locked && <ProBadge />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </Section>

      <Section title={`${messages.sidebar.structure} · ${state.config.blocks.length}`}>
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
                  title={messages.sidebar.moveUp}
                  onClick={() => dispatch({ type: "moveBlock", id: block.id, direction: -1 })}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                >
                  <Icons.ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title={messages.sidebar.moveDown}
                  onClick={() => dispatch({ type: "moveBlock", id: block.id, direction: 1 })}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === state.config.blocks.length - 1}
                >
                  <Icons.ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title={messages.sidebar.delete}
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
  const { state, dispatch, tier } = useStudio();
  const { messages } = usePowerEditorLocale();
  const { theme, layout } = state.config;
  const motionConfig = getMotionConfig(state.config);
  const typographyLocked = useCapabilityAccess("advanced_typography").state !== "ALLOW";
  const cardsButtonsLocked =
    useCapabilityAccess("advanced_card_button_styling").state !== "ALLOW";
  const textureLocked = useCapabilityAccess("premium_background_effects").state !== "ALLOW";
  const motionLocked = useCapabilityAccess("advanced_motion").state !== "ALLOW";

  return (
    <div>
      <Section title={messages.sidebar.visualIdentity}>
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

      <Section title={messages.sidebar.colors}>
        <Field label={messages.sidebar.primary}>
          <ColorInput
            value={theme.colors.primary}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.primary", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.accent}>
          <ColorInput
            value={theme.colors.accent}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.accent", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.background}>
          <ColorInput
            value={theme.colors.background}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.background", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.backgroundLayer}>
          <ColorInput
            value={theme.background.color ?? theme.colors.background}
            onChange={(v) => dispatch({ type: "patch", path: "theme.background.color", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.backgroundBlur}>
          <NumberSlider
            value={theme.background.blur ?? 0}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.background.blur", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.surface}>
          <ColorInput
            value={theme.colors.surface}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.surface", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.text}>
          <ColorInput
            value={theme.colors.text}
            onChange={(v) => dispatch({ type: "patch", path: "theme.colors.text", value: v })}
          />
        </Field>
      </Section>

      <Locked locked={typographyLocked}>
      <Section title={messages.sidebar.typography} action={typographyLocked ? <ProBadge /> : undefined}>
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
        <Field label={messages.sidebar.headingFont}>
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
        <Field label={messages.sidebar.bodyScale}>
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
        <Field label={messages.sidebar.letterSpacing}>
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
      </Locked>

      <Section title={messages.sidebar.layout}>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((preset) => {
            const layoutLocked = isAssetLocked("layout", preset.id, tier);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={layoutLocked}
                aria-disabled={layoutLocked}
                onClick={() => {
                  if (layoutLocked) return;
                  dispatch({ type: "patch", path: "layout", value: preset });
                }}
                className={cx(
                  "rounded-lg border p-2 text-left text-xs transition",
                  layoutLocked
                    ? "cursor-not-allowed opacity-60"
                    : layout.id === preset.id
                      ? "border-foreground/50 bg-accent"
                      : "border-border hover:bg-accent/60",
                )}
              >
                <span className="flex items-center justify-between gap-1 font-medium text-foreground">
                  {preset.name}
                  {layoutLocked && <ProBadge />}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {preset.header} {messages.sidebar.header} · {preset.responsive.desktop.columns}{" "}
                  {messages.sidebar.columnsAbbrev}
                </span>
              </button>
            );
          })}
        </div>
        <Field label={messages.sidebar.maxWidth}>
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
        <Field label={messages.sidebar.blockGap}>
          <NumberSlider
            value={theme.spacing.block}
            min={4}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.spacing.block", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.cornerRadius}>
          <NumberSlider
            value={theme.cards.radius}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.radius", value: v })}
          />
        </Field>
      </Section>

      <Locked locked={cardsButtonsLocked}>
      <Section title={messages.sidebar.cardsButtons} action={cardsButtonsLocked ? <ProBadge /> : undefined}>
        <Field label={messages.sidebar.cardPreset}>
          <Segmented
            size="sm"
            value={theme.cards.preset}
            options={[
              { value: "minimal", label: messages.options.min },
              { value: "soft", label: messages.options.soft },
              { value: "glass", label: messages.options.glass },
              { value: "elevated", label: messages.options.lift },
              { value: "luxury", label: messages.options.lux },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.preset", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.cardShadow}>
          <Segmented
            size="sm"
            value={theme.cards.shadow}
            options={[
              { value: "none", label: messages.options.none },
              { value: "soft", label: messages.options.soft },
              { value: "elevated", label: messages.options.elevated },
              { value: "floating", label: messages.options.float },
              { value: "glow", label: messages.options.glow },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.shadow", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.cardBlur}>
          <NumberSlider
            value={theme.cards.blur}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.blur", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.cardOpacity}>
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
        <Field label={messages.sidebar.cardBorder}>
          <NumberSlider
            value={theme.cards.borderWidth}
            min={0}
            max={4}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.cards.borderWidth", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.buttonStyle}>
          <Segmented
            size="sm"
            value={theme.buttons.variant}
            options={[
              { value: "solid", label: messages.options.solid },
              { value: "outline", label: messages.options.outline },
              { value: "glass", label: messages.options.glass },
              { value: "gradient", label: messages.options.grad },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.variant", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.buttonShadow}>
          <Segmented
            size="sm"
            value={theme.buttons.shadow}
            options={[
              { value: "none", label: messages.options.none },
              { value: "soft", label: messages.options.soft },
              { value: "elevated", label: messages.options.elevated },
              { value: "floating", label: messages.options.float },
              { value: "glow", label: messages.options.glow },
            ]}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.shadow", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.buttonRadius}>
          <NumberSlider
            value={theme.buttons.radius}
            min={0}
            max={999}
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.radius", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.buttonHeight}>
          <NumberSlider
            value={theme.buttons.height}
            min={32}
            max={72}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.buttons.height", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.buttonBorder}>
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
      </Locked>

      <Locked locked={textureLocked}>
      <Section title={messages.sidebar.texture} action={textureLocked ? <ProBadge /> : undefined}>
        <Field label={messages.sidebar.preset}>
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
            <option value="none">{messages.options.none}</option>
            <option value="grain">{messages.sidebar.grain}</option>
            <option value="paper">{messages.sidebar.paper}</option>
            <option value="linen">{messages.sidebar.linen}</option>
            <option value="mesh">{messages.sidebar.mesh}</option>
            <option value="frost">{messages.sidebar.frost}</option>
          </select>
        </Field>
        <Field label={messages.sidebar.textureOpacity}>
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
        <Field label={messages.sidebar.textureScale}>
          <NumberSlider
            value={theme.texture?.scale ?? 24}
            min={8}
            max={64}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "theme.texture.scale", value: v })}
          />
        </Field>
      </Section>
      </Locked>

      <Section title={messages.banner.banner}>
        <Toggle
          label={messages.banner.showBanner}
          checked={state.config.profile.banner.enabled}
          onChange={(v) => dispatch({ type: "patch", path: "profile.banner.enabled", value: v })}
        />
        <Field label={messages.banner.bannerImageUrl}>
          <TextInput
            value={state.config.profile.banner.imageUrl ?? ""}
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.imageUrl", value: v })}
            placeholder="https://…"
          />
        </Field>
        <Field label={messages.banner.height}>
          <NumberSlider
            value={state.config.profile.banner.height}
            min={80}
            max={380}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.height", value: v })}
          />
        </Field>
        <Field label={messages.banner.mobileHeight}>
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
        <Field label={messages.banner.bannerBlur}>
          <NumberSlider
            value={state.config.profile.banner.blur}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.blur", value: v })}
          />
        </Field>
        <Field label={messages.banner.focalX}>
          <NumberSlider
            value={state.config.profile.banner.focalX}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.focalX", value: v })}
          />
        </Field>
        <Field label={messages.banner.focalY}>
          <NumberSlider
            value={state.config.profile.banner.focalY}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.focalY", value: v })}
          />
        </Field>
        <Field label={messages.banner.bannerRadius}>
          <NumberSlider
            value={state.config.profile.banner.radius}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.banner.radius", value: v })}
          />
        </Field>
        <Field label={messages.banner.overlay}>
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
        <Field label={messages.banner.avatarSize}>
          <NumberSlider
            value={state.config.profile.avatar.size}
            min={56}
            max={160}
            suffix="px"
            onChange={(v) => dispatch({ type: "patch", path: "profile.avatar.size", value: v })}
          />
        </Field>
        <Field label={messages.banner.avatarCorner}>
          <NumberSlider
            value={state.config.profile.avatar.radius}
            min={0}
            max={999}
            onChange={(v) => dispatch({ type: "patch", path: "profile.avatar.radius", value: v })}
          />
        </Field>
      </Section>

      {/* ---- Motion ---- */}
      <Locked locked={motionLocked}>
      <Section title={messages.sidebar.motion} action={motionLocked ? <ProBadge /> : undefined}>
        <Field label={messages.sidebar.preset}>
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
        <Field label={messages.sidebar.entrance}>
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
        <Field label={messages.sidebar.hover}>
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
        <Field label={messages.sidebar.speed}>
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
        <Field label={messages.sidebar.stagger}>
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
      </Locked>
    </div>
  );
}

function TemplatesPanel() {
  const { state, dispatch, tier } = useStudio();
  const { messages } = usePowerEditorLocale();
  const [keepContent, setKeepContent] = useState(true);

  return (
    <div>
      <Section title={messages.sidebar.templates}>
        <Toggle
          label={messages.sidebar.keepContent}
          checked={keepContent}
          onChange={setKeepContent}
        />
        <div className="grid gap-2">
          {TEMPLATE_DEFINITIONS.map((definition) => {
            const active = state.config.templateDefinitionId === definition.id;
            const locked = isAssetLocked("template", definition.id, tier);
            return (
              <button
                key={definition.id}
                type="button"
                disabled={locked}
                aria-disabled={locked}
                onClick={() => {
                  if (locked) return;
                  dispatch({
                    type: "replaceConfig",
                    config: applyTemplateDefinition(state.config, definition.id, keepContent),
                  });
                }}
                className={cx(
                  "rounded-xl border p-3 text-left transition",
                  locked
                    ? "cursor-not-allowed opacity-60"
                    : active
                      ? "border-foreground/50 bg-accent"
                      : "border-border hover:bg-accent/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{definition.name}</span>
                  {locked ? (
                    <ProBadge />
                  ) : (
                    definition.premium && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background">
                        Premium
                      </span>
                    )
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
  const { locale, messages, setLocale } = usePowerEditorLocale();
  const { seo, settings } = state.config;
  const brandingLocked = useCapabilityAccess("remove_cripqer_branding").state !== "ALLOW";

  return (
    <div>
      <Section title={messages.sidebar.page}>
        <Field label={messages.locale.editorLanguage}>
          <Segmented
            value={locale}
            options={POWER_EDITOR_LOCALES.map((option) => ({
              value: option,
              label:
                option === "es" ? messages.locale.spanish : messages.locale.english,
            }))}
            onChange={(v) => setLocale(v as PowerEditorLocale)}
          />
        </Field>
        <Field label={messages.sidebar.slug}>
          <TextInput
            value={settings.slug}
            onChange={(v) =>
              dispatch({ type: "patch", path: "settings.slug", value: formatSlug(v) })
            }
          />
        </Field>
        <Locked locked={brandingLocked}>
          <div className="flex items-center justify-between gap-3">
            <Toggle
              label={messages.sidebar.showBranding}
              checked={settings.showBranding}
              onChange={(v) => dispatch({ type: "patch", path: "settings.showBranding", value: v })}
            />
            {brandingLocked && <ProBadge />}
          </div>
        </Locked>
        <Toggle
          label={messages.sidebar.indexSearchEngines}
          checked={seo.index}
          onChange={(v) => dispatch({ type: "patch", path: "seo.index", value: v })}
        />
      </Section>
      <Section title="SEO">
        <Field label={messages.sidebar.seoTitle}>
          <TextInput
            value={seo.title}
            onChange={(v) => dispatch({ type: "patch", path: "seo.title", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.seoDescription}>
          <TextInput
            value={seo.description}
            onChange={(v) => dispatch({ type: "patch", path: "seo.description", value: v })}
          />
        </Field>
        <Field label={messages.sidebar.socialImageUrl}>
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
  const { messages } = usePowerEditorLocale();
  const tabs = [
    { id: "blocks", label: messages.nav.blocks, icon: "LayoutGrid" },
    { id: "design", label: messages.nav.design, icon: "Palette" },
    { id: "templates", label: messages.nav.templates, icon: "Sparkles" },
    { id: "settings", label: messages.nav.settings, icon: "Settings2" },
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
    <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <SidebarTabs />
      <div className="pts-tools-scroll pts-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SidebarContent />
      </div>
    </aside>
  );
}
