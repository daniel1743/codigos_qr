import { Monitor, Smartphone, Tablet, Trash2, Copy, Lock, Plus } from "lucide-react";
import { useStudio } from "../../state/StudioProvider";
import { getBlockDefinition } from "../../constants/blockDefinitions";
import {
  ColorInput,
  Field,
  GhostButton,
  NumberSlider,
  Section,
  Segmented,
  TextArea,
  TextInput,
  Toggle,
} from "../ui/controls";
import { parseVideoUrl, uid } from "../../utils";

/**
 * Inspector → Canvas (source = inspector). When the user intentionally enters a
 * contextual Inspector group (focus or pointer-down on a control inside it),
 * request that the Canvas reveal the matching element. Fires only on explicit
 * interaction — never on scroll/render/zoom/load. `requestCanvasFocus` is
 * idempotent, so once the element is visible the Canvas performs no movement.
 */
function contextualFocusProps(target: ContextualTarget) {
  return {
    onFocusCapture: () => requestCanvasFocus(target),
    onPointerDownCapture: () => requestCanvasFocus(target),
  };
}
import type {
  BlockItem,
  CTAStyle,
  SocialItem,
  TemplateBlock,
  EntrancePreset,
  HoverPreset,
  TrustBadge,
  TrustSignalType,
} from "../../types";
import { FONT_OPTIONS } from "../../constants/themes";
import {
  MAX_TRUST_SIGNALS,
  USER_SELECTABLE_SIGNALS,
  defaultTrustSignalValue,
  getTrustSignalDefinition,
} from "../../constants/trustSignals";
import type { StudioAdapters } from "../../adapters";
import { ENTRANCE_OPTIONS, HOVER_OPTIONS } from "../../constants/motionPresets";
import { useEffect, useRef, useState } from "react";
import { isCapabilityLocked, isAssetLocked, ProBadge, Locked } from "../../entitlements";
import { shouldResetInspectorScroll } from "./inspectorScroll";
import {
  clampScrollValue,
  computeInspectorFocusScroll,
  requestCanvasFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
  type ContextualTarget,
} from "./inspectorFocus";
import { usePowerEditorLocale } from "../../i18n/PowerEditorLocale";
import { formatBreakpoint } from "../../i18n/messages";
import { resolveSmartLinkPreviewFn } from "../../../lib/smart-link-preview/server";
import {
  computeCardEnrichment,
  type SmartLinkPreview,
  type SmartLinkPreviewStatus,
} from "../../../lib/smart-link-preview";


/**
 * ASSET ADAPTER UI — minimal upload / replace / remove, always through
 * `adapters.assets`. No backend is hardcoded here.
 */
const getAssetIdFromCache = (url: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("pts:asset_url_to_id");
    if (raw) {
      const mapping = JSON.parse(raw);
      return mapping[url] || null;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

const saveAssetMapping = (url: string, id: string) => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem("pts:asset_url_to_id");
    const mapping = raw ? JSON.parse(raw) : {};
    mapping[url] = id;
    window.localStorage.setItem("pts:asset_url_to_id", JSON.stringify(mapping));
  } catch {
    // Ignore storage errors
  }
};

async function resolveAssetId(url: string, adapters: Partial<StudioAdapters>): Promise<string> {
  if (!url) return "";

  // 1. Try local cache
  const cached = getAssetIdFromCache(url);
  if (cached) return cached;

  // 2. Try querying the adapter's list
  if (adapters.assets?.list) {
    try {
      const list = await adapters.assets.list();
      const found = list.find((a) => a.url === url);
      if (found) {
        saveAssetMapping(url, found.id);
        return found.id;
      }
    } catch {
      // Ignore list query failure
    }
  }

  // 3. Fallback to url itself
  return url;
}

function AssetField({
  label,
  accept,
  value,
  onChange,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string, asset?: { name: string }) => void;
}) {
  const { adapters } = useStudio();
  const { messages } = usePowerEditorLocale();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  return (
    <Field label={label}>
      <div className="space-y-2">
        <TextInput value={value} onChange={(v) => onChange(v)} placeholder="https://…" />
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => input.current?.click()}>
            {busy ? messages.inspector.uploading : value ? messages.inspector.replace : messages.inspector.upload}
          </GhostButton>
          {value && (
            <GhostButton
              onClick={async () => {
                try {
                  const assetId = await resolveAssetId(value, adapters);
                  await adapters.assets.remove?.(assetId);
                } catch {
                  /* adapter may not support deletion */
                }
                onChange("");
              }}
            >
              {messages.inspector.remove}
            </GhostButton>
          )}
        </div>
        {assetError && <p className="text-[11px] text-destructive">{assetError}</p>}
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setAssetError(null);
            try {
              const oldUrl = value;
              const asset = await adapters.assets.upload(file);

              // If replacing, delete the old asset
              if (oldUrl && adapters.assets.remove) {
                try {
                  const oldAssetId = await resolveAssetId(oldUrl, adapters);
                  await adapters.assets.remove(oldAssetId);
                } catch {
                  /* ignore deletion errors on replace */
                }
              }

              saveAssetMapping(asset.url, asset.id);
              onChange(asset.url, { name: asset.name });
            } catch (err) {
              setAssetError(err instanceof Error ? err.message : "Upload failed.");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
    </Field>
  );
}

function ProfileInspector() {
  const { state, dispatch, breakpoint } = useStudio();
  const { locale, messages } = usePowerEditorLocale();
  const { profile, layout } = state.config;
  const banner = profile.banner;
  const patch = (path: string, value: unknown) => dispatch({ type: "patch", path, value });

  // Safe defaults
  const layoutType = layout.type ?? "stack";
  const columnsActive =
    layout.responsive?.[breakpoint]?.columns ??
    layout.responsive?.desktop?.columns ??
    (breakpoint === "mobile" ? 1 : 2);
  const layoutGap =
    layout.responsive?.[breakpoint]?.gap ??
    layout.responsive?.[breakpoint]?.gutter ??
    layout.gap ??
    state.config.theme.spacing.block;
  const alignItems = layout.responsive?.[breakpoint]?.alignItems ?? layout.alignItems ?? "stretch";
  const justifyItems =
    layout.responsive?.[breakpoint]?.justifyItems ?? layout.justifyItems ?? "stretch";

  // Page Background (Phase 5C5B) — bind the EXISTING canonical fields. The
  // renderer (`pageBackground`) already supports solid/gradient/image/pattern,
  // but the previous Inspector only edited `theme.background.color`, which is
  // visually overridden by `backgroundImage` whenever `type` is
  // gradient/image/pattern. Exposing the type selector makes the chosen mode's
  // controls authoritative without any schema or renderer change.
  const background = state.config.theme.background;
  const backgroundType = background.type ?? "solid";
  const themeColors = state.config.theme.colors;
  const gradient = background.gradient ?? {
    kind: "linear" as const,
    angle: 135,
    from: themeColors.primary,
    to: themeColors.secondary,
  };

  const selectBackgroundType = (type: string) => {
    // Presentation choice only — never destructive. Switching modes must not
    // delete values belonging to other modes (imageUrl, pattern, gradient,
    // color are all preserved).
    patch("theme.background.type", type);
    // Initialize the minimum safe gradient values only when first entering
    // gradient mode, derived from existing theme color conventions.
    if (type === "gradient" && !background.gradient) {
      patch("theme.background.gradient", {
        kind: "linear",
        angle: 135,
        from: themeColors.primary,
        to: themeColors.secondary,
      });
    }
  };

  const patchGradient = (partial: {
    from?: string;
    to?: string;
    angle?: number;
    kind?: "linear" | "radial";
  }) => {
    patch("theme.background.gradient", { ...gradient, ...partial });
  };

  return (
    <div>
      <div data-inspector-focus="page-background" {...contextualFocusProps("page-background")}>
        <Section title={messages.inspector.pageBackground}>
          <Field label={messages.inspector.type}>
            <Segmented
              size="sm"
              value={backgroundType}
              options={[
                { value: "solid", label: messages.options.solid },
                { value: "gradient", label: messages.options.gradient },
                { value: "image", label: messages.options.image },
                { value: "pattern", label: messages.options.pattern },
              ]}
              onChange={(v) => selectBackgroundType(v)}
            />
          </Field>

          {backgroundType === "solid" && (
            <Field label={messages.inspector.color}>
              <ColorInput
                value={background.color ?? themeColors.background}
                onChange={(v) => patch("theme.background.color", v)}
              />
            </Field>
          )}

          {backgroundType === "gradient" && (
            <>
              <Field label={messages.inspector.kind}>
                <Segmented
                  size="sm"
                  value={gradient.kind}
                  options={[
                    { value: "linear", label: messages.inspector.linear },
                    { value: "radial", label: messages.inspector.radial },
                  ]}
                  onChange={(v) => patchGradient({ kind: v as "linear" | "radial" })}
                />
              </Field>
              <Field label={messages.inspector.from}>
                <ColorInput value={gradient.from} onChange={(v) => patchGradient({ from: v })} />
              </Field>
              <Field label={messages.inspector.to}>
                <ColorInput value={gradient.to} onChange={(v) => patchGradient({ to: v })} />
              </Field>
              <Field label={messages.inspector.angle}>
                <NumberSlider
                  value={gradient.angle}
                  min={0}
                  max={360}
                  step={1}
                  suffix="°"
                  onChange={(v) => patchGradient({ angle: v })}
                />
              </Field>
            </>
          )}

          {backgroundType === "image" && (
            <>
              <AssetField
                label={messages.inspector.backgroundImage}
                accept="image/*"
                value={background.imageUrl ?? ""}
                onChange={(url) => patch("theme.background.imageUrl", url)}
              />
              <Field label={messages.inspector.blur}>
                <NumberSlider
                  value={background.blur ?? 0}
                  min={0}
                  max={24}
                  step={1}
                  suffix="px"
                  onChange={(v) => patch("theme.background.blur", v)}
                />
              </Field>
            </>
          )}

          {backgroundType === "pattern" && (
            <Field label={messages.inspector.pattern}>
              <Segmented
                size="sm"
                value={background.pattern ?? "dots"}
                options={[
                  { value: "dots", label: messages.options.dots },
                  { value: "grid", label: messages.options.grid },
                  { value: "noise", label: messages.options.noise },
                  { value: "rings", label: messages.options.rings },
                ]}
                onChange={(v) => patch("theme.background.pattern", v)}
              />
            </Field>
          )}
        </Section>
      </div>

      <div data-inspector-focus="profile-cover" {...contextualFocusProps("profile-cover")}>
        <Section title={messages.inspector.coverBanner}>
          <Toggle
            label={messages.inspector.showCover}
            checked={banner.enabled}
            onChange={(v) => patch("profile.banner.enabled", v)}
          />
          {banner.enabled && (
            <>
              <Field label={messages.inspector.width}>
                <Segmented
                  size="sm"
                  value={banner.widthMode ?? "contained"}
                  options={[
                    { value: "contained", label: messages.options.contained },
                    { value: "full-bleed", label: messages.options.fullBleed },
                  ]}
                  onChange={(v) => patch("profile.banner.widthMode", v)}
                />
              </Field>
              <AssetField
                label={messages.inspector.coverImage}
                accept="image/*"
                value={banner.imageUrl ?? ""}
                onChange={(v) => patch("profile.banner.imageUrl", v)}
              />
              <Field
                label={`${messages.inspector.coverHeight} (${formatBreakpoint(locale, breakpoint)})`}
              >
                <NumberSlider
                  value={breakpoint === "mobile" ? banner.mobileHeight : banner.height}
                  min={80}
                  max={400}
                  step={8}
                  suffix="px"
                  onChange={(v) =>
                    patch(
                      breakpoint === "mobile"
                        ? "profile.banner.mobileHeight"
                        : "profile.banner.height",
                      v,
                    )
                  }
                />
              </Field>
              <Field label={messages.inspector.position}>
                <PositionGrid
                  value={focalToToken(banner.focalX, banner.focalY)}
                  onChange={(v) => {
                    const point = FOCAL_POINTS[v] ?? FOCAL_POINTS["center"]!;
                    patch("profile.banner.focalX", point.x);
                    patch("profile.banner.focalY", point.y);
                  }}
                />
              </Field>
              <Field label={messages.inspector.blur}>
                <NumberSlider
                  value={banner.blur}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => patch("profile.banner.blur", v)}
                />
              </Field>
              <Field label={messages.inspector.cornerRadius}>
                <NumberSlider
                  value={banner.radius}
                  min={0}
                  max={48}
                  onChange={(v) => patch("profile.banner.radius", v)}
                />
              </Field>
              <Field label={messages.inspector.overlayType}>
                <Segmented
                  size="sm"
                  value={banner.gradient ? "gradient" : "solid"}
                  options={[
                    { value: "solid", label: messages.options.solid },
                    { value: "gradient", label: messages.options.gradient },
                  ]}
                  onChange={(v) => patch("profile.banner.gradient", v === "gradient")}
                />
              </Field>
              <Field
                label={messages.inspector.overlayIntensity}
                hint={messages.inspector.overlayHint}
              >
                <NumberSlider
                  value={banner.overlay}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => patch("profile.banner.overlay", v)}
                />
              </Field>
              <Toggle
                label={messages.inspector.blendWithPage}
                checked={banner.blendFade?.enabled ?? false}
                onChange={(v) =>
                  patch("profile.banner.blendFade", {
                    enabled: v,
                    distance: banner.blendFade?.distance ?? 80,
                    strength: banner.blendFade?.strength ?? 1,
                  })
                }
              />
              {banner.blendFade?.enabled ? (
                <>
                  <Field label={messages.inspector.fadeDistance}>
                    <NumberSlider
                      value={banner.blendFade?.distance ?? 80}
                      min={24}
                      max={300}
                      step={8}
                      suffix="px"
                      onChange={(v) =>
                        patch("profile.banner.blendFade", {
                          enabled: true,
                          distance: v,
                          strength: banner.blendFade?.strength ?? 1,
                        })
                      }
                    />
                  </Field>
                  <Field label={messages.inspector.fadeStrength}>
                    <NumberSlider
                      value={banner.blendFade?.strength ?? 1}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(v) =>
                        patch("profile.banner.blendFade", {
                          enabled: true,
                          distance: banner.blendFade?.distance ?? 80,
                          strength: v,
                        })
                      }
                    />
                  </Field>
                </>
              ) : null}
            </>
          )}
        </Section>
      </div>

      <Section title={messages.inspector.profile}>
        <Field label={messages.inspector.name}>
          <TextInput value={profile.name} onChange={(v) => patch("profile.name", v)} />
        </Field>
        <Field label={messages.inspector.username}>
          <TextInput
            value={profile.username ?? ""}
            onChange={(v) => patch("profile.username", v)}
          />
        </Field>
        <Field label={messages.inspector.role}>
          <TextInput value={profile.role ?? ""} onChange={(v) => patch("profile.role", v)} />
        </Field>
        <Field label={messages.inspector.company}>
          <TextInput value={profile.company ?? ""} onChange={(v) => patch("profile.company", v)} />
        </Field>
        <Field label={messages.inspector.location}>
          <TextInput
            value={profile.location ?? ""}
            onChange={(v) => patch("profile.location", v)}
          />
        </Field>
        <div data-inspector-focus="profile-bio" {...contextualFocusProps("profile-bio")}>
          <Field label={messages.inspector.bio}>
            <TextArea
              value={profile.description ?? ""}
              onChange={(v) => patch("profile.description", v)}
            />
          </Field>
        </div>
        <div data-inspector-focus="profile-avatar" {...contextualFocusProps("profile-avatar")}>
          <AssetField
            label={messages.inspector.avatar}
            accept="image/*"
            value={profile.avatarUrl ?? ""}
            onChange={(v) => patch("profile.avatarUrl", v)}
          />
          <Field label={messages.inspector.avatarAlignment}>
            <Segmented
              size="sm"
              value={profile.avatar.align}
              options={[
                { value: "left", label: messages.options.left },
                { value: "center", label: messages.options.center },
                { value: "right", label: messages.options.right },
              ]}
              onChange={(v) => patch("profile.avatar.align", v)}
            />
          </Field>
          <Field label={messages.inspector.avatarOverlap}>
            <NumberSlider
              value={profile.avatar.overlap}
              min={0}
              max={180}
              suffix="px"
              onChange={(v) => patch("profile.avatar.overlap", v)}
            />
          </Field>
          <Toggle
            label={messages.inspector.avatarShadow}
            checked={profile.avatar.shadow}
            onChange={(v) => patch("profile.avatar.shadow", v)}
          />
          <Toggle
            label={messages.inspector.rim}
            checked={profile.avatar.rim?.enabled ?? false}
            onChange={(v) =>
              patch("profile.avatar.rim", {
                enabled: v,
                color: profile.avatar.rim?.color ?? themeColors.accent,
                width: profile.avatar.rim?.width ?? "medium",
              })
            }
          />
          {profile.avatar.rim?.enabled ? (
            <>
              <Field label={messages.inspector.rimColor}>
                <ColorInput
                  value={profile.avatar.rim?.color ?? themeColors.accent}
                  onChange={(v) =>
                    patch("profile.avatar.rim", {
                      enabled: true,
                      color: v,
                      width: profile.avatar.rim?.width ?? "medium",
                    })
                  }
                />
              </Field>
              <Field label={messages.inspector.rimThickness}>
                <Segmented
                  size="sm"
                  value={profile.avatar.rim?.width ?? "medium"}
                  options={[
                    { value: "thin", label: messages.options.thin },
                    { value: "medium", label: messages.options.medium },
                    { value: "thick", label: messages.options.thick },
                  ]}
                  onChange={(v) =>
                    patch("profile.avatar.rim", {
                      enabled: true,
                      color: profile.avatar.rim?.color ?? themeColors.accent,
                      width: v,
                    })
                  }
                />
              </Field>
            </>
          ) : null}
        </div>
        <Toggle
          label={messages.inspector.verifiedBadge}
          checked={profile.verified ?? false}
          onChange={(v) => patch("profile.verified", v)}
        />
      </Section>

      <Section
        title={`${messages.inspector.containerLayout} (${formatBreakpoint(locale, breakpoint)})`}
      >
        <Field label={messages.inspector.layoutType}>
          <Segmented
            size="sm"
            value={layoutType}
            options={[
              { value: "stack", label: messages.options.stack },
              { value: "grid", label: messages.options.grid },
              { value: "bento", label: "Bento" },
            ]}
            onChange={(v) => {
              patch("layout.type", v);
              // Setup default columns when changing layout types
              if (v === "bento") {
                patch("layout.responsive", {
                  desktop: { columns: 4, gutter: 14, align: "left", padding: 24 },
                  tablet: { columns: 2, gutter: 12, align: "left", padding: 24 },
                  mobile: { columns: 1, gutter: 12, align: "left", padding: 18 },
                });
              } else if (v === "grid") {
                patch("layout.responsive", {
                  desktop: { columns: 2, gutter: 14, align: "center", padding: 24 },
                  tablet: { columns: 2, gutter: 12, align: "center", padding: 24 },
                  mobile: { columns: 1, gutter: 12, align: "center", padding: 18 },
                });
              }
            }}
          />
        </Field>

        {layoutType !== "stack" && (
          <>
            <Field label={messages.inspector.columns}>
              <NumberSlider
                value={columnsActive}
                min={1}
                max={breakpoint === "mobile" ? 3 : 6}
                step={1}
                onChange={(v) => {
                  patch(`layout.responsive.${breakpoint}.columns`, v);
                }}
              />
            </Field>
            <Field label={messages.inspector.gap}>
              <NumberSlider
                value={layoutGap}
                min={4}
                max={40}
                suffix="px"
                onChange={(v) => {
                  if (breakpoint === "desktop") {
                    patch("layout.responsive.desktop.gutter", v);
                  } else {
                    patch(`layout.responsive.${breakpoint}.gutter`, v);
                  }
                }}
              />
            </Field>
            <Field label={messages.inspector.alignItems}>
              <Segmented
                size="sm"
                value={alignItems}
                options={[
                  { value: "start", label: messages.options.start },
                  { value: "center", label: messages.options.center },
                  { value: "stretch", label: messages.options.stretch },
                ]}
                onChange={(v) => {
                  if (breakpoint === "desktop") {
                    patch("layout.alignItems", v);
                  } else {
                    patch(`layout.responsive.${breakpoint}.alignItems`, v);
                  }
                }}
              />
            </Field>
            <Field label={messages.inspector.justifyItems}>
              <Segmented
                size="sm"
                value={justifyItems}
                options={[
                  { value: "start", label: messages.options.start },
                  { value: "center", label: messages.options.center },
                  { value: "stretch", label: messages.options.stretch },
                ]}
                onChange={(v) => {
                  if (breakpoint === "desktop") {
                    patch("layout.justifyItems", v);
                  } else {
                    patch(`layout.responsive.${breakpoint}.justifyItems`, v);
                  }
                }}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title={messages.inspector.tip}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {messages.inspector.tipBody}
        </p>
      </Section>
    </div>
  );
}


const PREVIEW_STATUS_LABELS: Record<SmartLinkPreviewStatus, string> = {
  full: "Vista previa encontrada",
  partial: "Vista previa parcial",
  fallback: "Enlace reconocido",
  error: "No pudimos obtener una imagen, pero el enlace seguirá funcionando.",
};

/**
 * Map a resolved `SmartLinkPreview` onto a Power Editor media-card item using
 * the existing (authoritative) enrichment helper. Fills `label` (the media-card
 * title), `description` and `imageUrl` only when empty/default — never
 * overwriting user-authored content. Pure and deterministic for tests.
 */
export function computePowerMediaCardPatch(
  item: Pick<BlockItem, "label" | "description" | "imageUrl">,
  preview: SmartLinkPreview,
): Partial<BlockItem> {
  const labelIsDefault =
    !item.label?.trim() ||
    item.label === "New item" ||
    item.label === "Link" ||
    item.label === "Nuevo enlace";
  const enrichment = computeCardEnrichment(
    {
      title: item.label ?? "",
      titleIsDefault: labelIsDefault,
      description: item.description,
      imageUrl: item.imageUrl,
    },
    preview,
  );

  const patch: Partial<BlockItem> = {};
  if (enrichment.title) patch.label = enrichment.title;
  if (enrichment.description) patch.description = enrichment.description;
  if (enrichment.imageUrl) patch.imageUrl = enrichment.imageUrl;
  return patch;
}


export function ItemsEditor({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const update = (next: BlockItem[]) =>
    dispatch({ type: "patchBlockField", id: block.id, path: "content.items", value: next });
  const supportsMediaPresentation = block.type === "links" || block.type === "buttonGroup";

  const [previewState, setPreviewState] = useState<Record<string, SmartLinkPreviewStatus | "loading">>({});

  const fetchPreview = async (item: BlockItem) => {
    const url = (item.url ?? "").trim();
    if (!url) return;
    setPreviewState((s) => ({ ...s, [item.id]: "loading" }));
    try {
      const preview = await resolveSmartLinkPreviewFn({ data: { url } });
      const patch = computePowerMediaCardPatch(item, preview);
      if (Object.keys(patch).length > 0) {
        update(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
      }
      setPreviewState((s) => ({ ...s, [item.id]: preview.status }));
    } catch {
      setPreviewState((s) => ({ ...s, [item.id]: "error" }));
    }
  };


  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Item {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <TextInput
            value={item.label ?? ""}
            placeholder="Label"
            onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, label: v } : i)))}
          />
          <TextInput
            value={item.url ?? ""}
            placeholder="https://…"
            onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, url: v } : i)))}
          />

          {item.presentation === "media-card" ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fetchPreview(item)}
                disabled={previewState[item.id] === "loading"}
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewState[item.id] === "loading"
                  ? "Obteniendo vista previa…"
                  : "Obtener vista previa"}
              </button>
              {previewState[item.id] && previewState[item.id] !== "loading" ? (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {PREVIEW_STATUS_LABELS[previewState[item.id] as SmartLinkPreviewStatus]}
                </p>
              ) : null}
            </div>
          ) : null}

          <TextInput
            value={item.description ?? ""}
            placeholder="Description (optional)"
            onChange={(v) =>
              update(items.map((i) => (i.id === item.id ? { ...i, description: v } : i)))
            }
          />
          {supportsMediaPresentation ? (
            <>
              <Field label="Presentation">
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                  value={item.presentation ?? "button"}
                  onChange={(e) =>
                    update(
                      items.map((i) =>
                        i.id === item.id
                          ? { ...i, presentation: e.target.value as BlockItem["presentation"] }
                          : i,
                      ) as BlockItem[],
                    )
                  }
                >
                  <option value="button">Button</option>
                  <option value="card">Card</option>
                  <option value="media-card">Media card</option>
                </select>
              </Field>
              {item.presentation === "media-card" ? (
                <>
                  {item.mediaSize !== "100" ? (
                    <Field label="Posición de imagen">
                      <Segmented
                        size="sm"
                        value={item.mediaPosition ?? "left"}
                        options={[
                          { value: "left", label: "Izquierda" },
                          { value: "right", label: "Derecha" },
                          { value: "bottom", label: "Abajo" },
                        ]}
                        onChange={(v) =>
                          update(
                            items.map((i) =>
                              i.id === item.id
                                ? { ...i, mediaPosition: v as BlockItem["mediaPosition"] }
                                : i,
                            ) as BlockItem[],
                          )
                        }
                      />
                    </Field>
                  ) : null}
                  <Field label="Tamaño de imagen">
                    <Segmented
                      size="sm"
                      value={item.mediaSize ?? "25"}
                      options={[
                        { value: "25", label: "25%" },
                        { value: "50", label: "50%" },
                        { value: "100", label: "100%" },
                      ]}
                      onChange={(v) =>
                        update(
                          items.map((i) =>
                            i.id === item.id
                              ? { ...i, mediaSize: v as BlockItem["mediaSize"] }
                              : i,
                          ) as BlockItem[],
                        )
                      }
                    />
                  </Field>
                </>
              ) : null}
              <AssetField
                label="Item image"
                accept="image/*"
                value={item.imageUrl ?? ""}
                onChange={(v) =>
                  update(items.map((i) => (i.id === item.id ? { ...i, imageUrl: v } : i)))
                }
              />
            </>
          ) : null}
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() => update([...items, { id: uid("item"), label: "New item", url: "" }])}
      >
        Add item
      </GhostButton>
    </div>
  );
}

function SocialsEditor({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const socials = block.content.socials ?? [];
  const update = (next: SocialItem[]) =>
    dispatch({ type: "patchBlockField", id: block.id, path: "content.socials", value: next });
  const platforms = [
    "instagram",
    "twitter",
    "linkedin",
    "youtube",
    "tiktok",
    "github",
    "dribbble",
    "behance",
    "twitch",
    "spotify",
    "whatsapp",
    "email",
  ];

  return (
    <div className="space-y-2">
      {socials.map((social) => (
        <div key={social.id} className="flex items-center gap-2">
          <select
            className="w-28 shrink-0 rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground"
            value={social.platform}
            onChange={(e) =>
              update(
                socials.map((s) =>
                  s.id === social.id
                    ? { ...s, platform: e.target.value as SocialItem["platform"] }
                    : s,
                ),
              )
            }
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <TextInput
            value={social.url}
            onChange={(v) =>
              update(socials.map((s) => (s.id === social.id ? { ...s, url: v } : s)))
            }
          />
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => update(socials.filter((s) => s.id !== social.id))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() => update([...socials, { id: uid("soc"), platform: "instagram", url: "" }])}
      >
        Add social
      </GhostButton>
    </div>
  );
}

function PositioningInspectorSection({ block }: { block: TemplateBlock }) {
  const { state, dispatch, breakpoint } = useStudio();
  const { locale, messages } = usePowerEditorLocale();
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  // Responsive getters
  const l = block.layout;
  const responsive = block.responsive?.[breakpoint] ?? {};

  const constraints = responsive.constraints ?? l.constraints ?? {};
  const overlap = responsive.overlap ?? l.overlap ?? {};
  const offset = responsive.offset ?? l.offset ?? {};
  const zIndex = responsive.zIndex ?? l.zIndex ?? 0;
  const sticky = responsive.sticky ?? l.sticky ?? {};
  const floating = responsive.floating ?? l.floating ?? {};

  const setResponsiveField = (pathKey: string, value: unknown) => {
    if (breakpoint === "desktop") {
      field(`layout.${pathKey}`, value);
    } else {
      field(`responsive.${breakpoint}.${pathKey}`, value);
    }
  };

  return (
    <>
      <Section title={`${messages.inspector.layoutConstraints} (${formatBreakpoint(locale, breakpoint)})`}>
        <Field label={messages.sidebar.maxWidth}>
          <NumberSlider
            value={Number(constraints.maxWidth) || 0}
            min={0}
            max={1000}
            step={20}
            suffix={constraints.maxWidth ? "px" : "auto"}
            onChange={(v) => setResponsiveField("constraints.maxWidth", v > 0 ? v : null)}
          />
        </Field>
        <Field label={messages.inspector.minHeight}>
          <NumberSlider
            value={Number(constraints.minHeight) || 0}
            min={0}
            max={800}
            step={20}
            suffix={constraints.minHeight ? "px" : "auto"}
            onChange={(v) => setResponsiveField("constraints.minHeight", v > 0 ? v : null)}
          />
        </Field>
        <Field label={messages.inspector.aspectRatio}>
          <Segmented
            size="sm"
            value={constraints.aspectRatio ?? "auto"}
            options={[
              { value: "auto", label: messages.options.auto },
              { value: "1/1", label: "1:1" },
              { value: "16/9", label: "16:9" },
              { value: "9/16", label: "9:16" },
              { value: "4/3", label: "4:3" },
            ]}
            onChange={(v) => setResponsiveField("constraints.aspectRatio", v === "auto" ? null : v)}
          />
        </Field>
        <Field label={messages.inspector.overflow}>
          <Segmented
            size="sm"
            value={constraints.overflow ?? "visible"}
            options={[
              { value: "visible", label: messages.options.visible },
              { value: "hidden", label: messages.options.hidden },
              { value: "clip", label: messages.options.clip },
              { value: "auto", label: messages.options.auto },
            ]}
            onChange={(v) => setResponsiveField("constraints.overflow", v)}
          />
        </Field>
      </Section>

      <Section title={`${messages.inspector.positioningOverrides} (${formatBreakpoint(locale, breakpoint)})`}>
        {/* Overlap */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{messages.inspector.visualOverlap}</span>
            <Toggle
              checked={overlap.enabled ?? false}
              onChange={(v) => setResponsiveField("overlap.enabled", v)}
            />
          </div>
          {overlap.enabled && (
            <>
              <Field label={messages.inspector.overlapAmount}>
                <NumberSlider
                  value={overlap.amount ?? 40}
                  min={0}
                  max={200}
                  step={4}
                  suffix="px"
                  onChange={(v) => setResponsiveField("overlap.amount", v)}
                />
              </Field>
              <Field label={messages.inspector.direction}>
                <Segmented
                  size="sm"
                  value={overlap.direction ?? "top"}
                  options={[
                    { value: "top", label: messages.options.top },
                    { value: "bottom", label: messages.options.bottom },
                    { value: "left", label: messages.options.left },
                    { value: "right", label: messages.options.right },
                  ]}
                  onChange={(v) => setResponsiveField("overlap.direction", v)}
                />
              </Field>
            </>
          )}
        </div>

        {/* Offsets */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <span className="text-xs font-semibold block">{messages.inspector.relativeOffset}</span>
          <div className="grid grid-cols-2 gap-2">
            <Field label={messages.inspector.offsetX}>
              <NumberSlider
                value={offset.x ?? 0}
                min={-150}
                max={150}
                step={2}
                suffix="px"
                onChange={(v) => setResponsiveField("offset.x", v)}
              />
            </Field>
            <Field label={messages.inspector.offsetY}>
              <NumberSlider
                value={offset.y ?? 0}
                min={-150}
                max={150}
                step={2}
                suffix="px"
                onChange={(v) => setResponsiveField("offset.y", v)}
              />
            </Field>
          </div>
        </div>

        {/* Layer order */}
        <Field label={messages.inspector.zIndexLayer}>
          <Segmented
            size="sm"
            value={String(zIndex)}
            options={[
              { value: "0", label: messages.options.base },
              { value: "1", label: "L1" },
              { value: "2", label: "L2" },
              { value: "5", label: "L5" },
              { value: "10", label: messages.options.top },
            ]}
            onChange={(v) => setResponsiveField("zIndex", Number(v))}
          />
        </Field>
      </Section>

      <Section title={`${messages.inspector.behaviorOverrides} (${formatBreakpoint(locale, breakpoint)})`}>
        {/* Sticky */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{messages.inspector.stickyScroll}</span>
            <Toggle
              checked={sticky.enabled ?? false}
              onChange={(v) => setResponsiveField("sticky.enabled", v)}
            />
          </div>
          {sticky.enabled && (
            <Field label={messages.inspector.topOffset}>
              <NumberSlider
                value={sticky.top ?? 16}
                min={0}
                max={100}
                step={4}
                suffix="px"
                onChange={(v) => setResponsiveField("sticky.top", v)}
              />
            </Field>
          )}
        </div>

        {/* Floating */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{messages.inspector.fixedFloatingPosition}</span>
            <Toggle
              checked={floating.enabled ?? false}
              onChange={(v) => setResponsiveField("floating.enabled", v)}
            />
          </div>
          {floating.enabled && (
            <>
              <Field label={messages.inspector.anchorCorner}>
                <Segmented
                  size="sm"
                  value={floating.anchor ?? "bottom-right"}
                  options={[
                    { value: "top-left", label: messages.options.topLeft },
                    { value: "top-right", label: messages.options.topRight },
                    { value: "bottom-left", label: messages.options.bottomLeft },
                    { value: "bottom-right", label: messages.options.bottomRight },
                    { value: "bottom-center", label: messages.options.bottomCenter },
                  ]}
                  onChange={(v) => setResponsiveField("floating.anchor", v)}
                />
              </Field>
              <Field label={messages.inspector.edgeDistance}>
                <NumberSlider
                  value={floating.offset ?? 20}
                  min={0}
                  max={100}
                  step={4}
                  suffix="px"
                  onChange={(v) => setResponsiveField("floating.offset", v)}
                />
              </Field>
            </>
          )}
        </div>
      </Section>
    </>
  );
}

const IMAGE_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: "top-left", label: "↖" },
  { value: "top", label: "↑" },
  { value: "top-right", label: "↗" },
  { value: "left", label: "←" },
  { value: "center", label: "•" },
  { value: "right", label: "→" },
  { value: "bottom-left", label: "↙" },
  { value: "bottom", label: "↓" },
  { value: "bottom-right", label: "↘" },
];

/** Focal tokens → profile banner focalX/focalY percentages (canonical fields). */
const FOCAL_POINTS: Record<string, { x: number; y: number }> = {
  center: { x: 50, y: 50 },
  top: { x: 50, y: 0 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
  right: { x: 100, y: 50 },
  "top-left": { x: 0, y: 0 },
  "top-right": { x: 100, y: 0 },
  "bottom-left": { x: 0, y: 100 },
  "bottom-right": { x: 100, y: 100 },
};

function focalToToken(focalX: number, focalY: number): string {
  const entry = Object.entries(FOCAL_POINTS).find(
    ([, p]) => Math.abs(p.x - focalX) <= 1 && Math.abs(p.y - focalY) <= 1,
  );
  return entry ? entry[0] : "center";
}

function PositionGrid({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {IMAGE_POSITION_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.value}
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "flex h-7 items-center justify-center rounded border border-foreground/40 bg-accent text-xs text-foreground"
              : "flex h-7 items-center justify-center rounded border border-border text-xs text-muted-foreground hover:text-foreground"
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CtaStyleControls({
  style,
  pathPrefix,
  defaultRadius,
  onField,
}: {
  style: CTAStyle | undefined;
  pathPrefix: string;
  defaultRadius: number;
  onField: (path: string, value: unknown) => void;
}) {
  const { messages } = usePowerEditorLocale();
  const s = style ?? {};
  const set = (key: keyof CTAStyle, value: unknown) => onField(`${pathPrefix}.${key}`, value);

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {messages.inspector.styleCta}
      </span>
      <Field label={messages.inspector.background}>
        <ColorInput
          value={s.backgroundColor ?? ""}
          onChange={(v) => set("backgroundColor", v === "" ? undefined : v)}
        />
      </Field>
      <Field label={messages.inspector.textColor}>
        <ColorInput
          value={s.textColor ?? ""}
          onChange={(v) => set("textColor", v === "" ? undefined : v)}
        />
      </Field>
      <Field label={messages.inspector.fontFamily}>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          value={s.fontFamily ?? ""}
          onChange={(e) => set("fontFamily", e.target.value === "" ? undefined : e.target.value)}
        >
          <option value="">{messages.options.theme}</option>
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={messages.inspector.fontSize}>
        <NumberSlider
          value={s.fontSize ?? 14}
          min={10}
          max={32}
          step={1}
          onChange={(v) => set("fontSize", v)}
        />
      </Field>
      <Field label={messages.inspector.fontWeight}>
        <Segmented
          size="sm"
          value={String(s.fontWeight ?? 600)}
          options={[
            { value: "400", label: "Regular" },
            { value: "500", label: "Medium" },
            { value: "600", label: "Semibold" },
            { value: "700", label: "Bold" },
            { value: "800", label: "Extra" },
          ]}
          onChange={(v) => set("fontWeight", Number(v))}
        />
      </Field>
      <Field label={messages.inspector.borderColor}>
        <ColorInput
          value={s.borderColor ?? ""}
          onChange={(v) => set("borderColor", v === "" ? undefined : v)}
        />
      </Field>
      <Field label={messages.inspector.borderWidth} hint={`0 = ${messages.options.theme}`}>
        <NumberSlider
          value={s.borderWidth ?? 0}
          min={0}
          max={8}
          step={1}
          onChange={(v) => set("borderWidth", v)}
        />
      </Field>
      <Field label={messages.inspector.radius}>
        <NumberSlider
          value={s.radius ?? defaultRadius}
          min={0}
          max={40}
          step={1}
          onChange={(v) => set("radius", v)}
        />
      </Field>
      <Field label={messages.inspector.paddingX}>
        <NumberSlider
          value={s.paddingX ?? 20}
          min={0}
          max={48}
          step={1}
          onChange={(v) => set("paddingX", v)}
        />
      </Field>
      <Field label={messages.inspector.paddingY}>
        <NumberSlider
          value={s.paddingY ?? 10}
          min={0}
          max={32}
          step={1}
          onChange={(v) => set("paddingY", v)}
        />
      </Field>
      <GhostButton onClick={() => onField(pathPrefix, {})} className="w-full justify-center">
        {messages.inspector.resetStyle}
      </GhostButton>
    </div>
  );
}

function HeroBlockInspector({ block }: { block: TemplateBlock }) {
  const { state, dispatch, breakpoint } = useStudio();
  const { locale, messages } = usePowerEditorLocale();
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  const content = block.content;
  const avatar = content.avatar ?? {};
  const bannerImage = content.bannerImage ?? {};
  const backgroundImage = content.backgroundImage ?? {};
  const badgeValue = content.badge;
  const badge =
    typeof badgeValue === "string" ? { enabled: true, label: badgeValue } : (badgeValue ?? {});
  const primaryCTA = content.primaryCTA ?? {};
  const secondaryCTA = content.secondaryCTA ?? {};
  const overlay = block.style.overlay ?? {};
  const backgroundGradient = block.style.backgroundGradient;
  const backgroundType: "solid" | "gradient" = backgroundGradient ? "gradient" : "solid";

  // Responsive getters
  const currentAlign = block.responsive?.[breakpoint]?.align ?? block.layout.align ?? "center";
  const currentMinHeight =
    block.responsive?.[breakpoint]?.minHeight ??
    block.style.minHeight ??
    (block.variant === "full-image" ? 400 : 300);
  const currentAvatarSize = block.responsive?.[breakpoint]?.avatarSize ?? avatar.size ?? 112;
  const currentCtaDirection =
    block.responsive?.[breakpoint]?.ctaDirection ?? content.ctaDirection ?? "row";

  // Responsive setters helper
  const setResponsiveField = (fieldKey: string, value: unknown) => {
    if (breakpoint === "desktop") {
      if (fieldKey === "align") {
        field("layout.align", value);
      } else if (fieldKey === "minHeight") {
        field("style.minHeight", value);
      } else if (fieldKey === "avatarSize") {
        field("content.avatar.size", value);
      } else if (fieldKey === "ctaDirection") {
        field("content.ctaDirection", value);
      }
    } else {
      field(`responsive.${breakpoint}.${fieldKey}`, value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Block Header */}
      <Section
        title={messages.inspector.heroBanner}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={messages.inspector.duplicate}
              onClick={() => dispatch({ type: "duplicateBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={messages.inspector.delete}
              onClick={() => dispatch({ type: "deleteBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        <Field label={messages.inspector.heroVariant}>
          <Segmented
            size="sm"
            value={block.variant ?? "centered"}
            options={[
              { value: "centered", label: messages.inspector.centered },
              { value: "split", label: messages.inspector.split },
              { value: "editorial", label: messages.inspector.editorial },
              { value: "full-image", label: messages.inspector.fullImage },
            ]}
            onChange={(v) => dispatch({ type: "updateBlock", id: block.id, patch: { variant: v } })}
          />
        </Field>
      </Section>

      {/* Content Section */}
      <Section title={messages.inspector.content}>
        <div data-inspector-focus="hero-eyebrow" {...contextualFocusProps("hero-eyebrow")}>
          <Field label={messages.inspector.eyebrow}>
            <TextInput
              value={content.eyebrow ?? ""}
              onChange={(v) => field("content.eyebrow", v)}
            />
          </Field>
        </div>
        <div data-inspector-focus="hero-title" {...contextualFocusProps("hero-title")}>
          <Field label={messages.inspector.title}>
            <TextInput value={content.title ?? ""} onChange={(v) => field("content.title", v)} />
          </Field>
        </div>
        <div data-inspector-focus="hero-subtitle" {...contextualFocusProps("hero-subtitle")}>
          <Field label={messages.inspector.subtitle}>
            <TextInput
              value={content.subtitle ?? ""}
              onChange={(v) => field("content.subtitle", v)}
            />
          </Field>
        </div>
        <div data-inspector-focus="hero-description" {...contextualFocusProps("hero-description")}>
          <Field label={messages.inspector.description}>
            <TextArea
              value={content.description ?? ""}
              onChange={(v) => field("content.description", v)}
              rows={3}
            />
          </Field>
        </div>

        {/* Badge Sub-section */}
        <div className="mt-3 space-y-2 rounded-lg border border-border p-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{messages.inspector.verifiedBadge}</span>
            <Toggle
              checked={badge.enabled ?? false}
              onChange={(v) => field("content.badge.enabled", v)}
            />
          </div>
          {badge.enabled && (
            <Field label={messages.inspector.badgeLabel}>
              <TextInput
                value={badge.label ?? ""}
                onChange={(v) => field("content.badge.label", v)}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* Avatar Section */}
      <Section title={messages.inspector.avatar}>
        <AssetField
          label={messages.inspector.avatar}
          accept="image/*"
          value={avatar.url ?? ""}
          onChange={(v) => field("content.avatar.url", v)}
        />
        <Field label={messages.inspector.avatarSize}>
          <NumberSlider
            value={currentAvatarSize}
            min={48}
            max={200}
            step={8}
            onChange={(v) => setResponsiveField("avatarSize", v)}
          />
        </Field>
        <Field label={messages.inspector.avatarOverlap}>
          <NumberSlider
            value={avatar.overlap ?? 48}
            min={0}
            max={100}
            step={4}
            onChange={(v) => field("content.avatar.overlap", v)}
          />
        </Field>
        <Field label={messages.inspector.borderWidth}>
          <NumberSlider
            value={avatar.borderWidth ?? 4}
            min={0}
            max={12}
            step={1}
            onChange={(v) => field("content.avatar.borderWidth", v)}
          />
        </Field>
        <Field label={messages.inspector.shadow}>
          <Segmented
            size="sm"
            value={
              typeof avatar.shadow === "boolean"
                ? avatar.shadow
                  ? "soft"
                  : "none"
                : (avatar.shadow ?? "soft")
            }
            options={[
              { value: "none", label: messages.options.none },
              { value: "soft", label: messages.options.soft },
              { value: "hard", label: messages.options.hard },
            ]}
            onChange={(v) => field("content.avatar.shadow", v)}
          />
        </Field>
      </Section>

      {/* Image Section */}
      <Section title={messages.inspector.image}>
        {/* Hero foreground/media image controls — contextual sub-target of the
            selected Hero. Wrapped exactly (not the whole Image section) so the
            exact hero-image group centers in the Inspector. */}
        <div data-inspector-focus="hero-image" {...contextualFocusProps("hero-image")}>
          <AssetField
            label={messages.inspector.topBannerImage}
            accept="image/*"
            value={bannerImage.url ?? ""}
            onChange={(v) => field("content.bannerImage.url", v)}
          />
          {bannerImage.url && (
            <>
              <Field label={messages.inspector.bannerBlur}>
                <NumberSlider
                  value={bannerImage.blur ?? 0}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => field("content.bannerImage.blur", v)}
                />
              </Field>
              <Field label={messages.inspector.fit}>
                <Segmented
                  size="sm"
                  value={bannerImage.fit ?? "cover"}
                  options={[
                    { value: "cover", label: messages.options.cover },
                    { value: "contain", label: messages.options.contain },
                  ]}
                  onChange={(v) => field("content.bannerImage.fit", v)}
                />
              </Field>
              <Field label={messages.inspector.position}>
                <PositionGrid
                  value={bannerImage.position ?? "center"}
                  onChange={(v) => field("content.bannerImage.position", v)}
                />
              </Field>
            </>
          )}
        </div>
      </Section>

      {/* Layout Section */}
      <Section title={`${messages.inspector.layout} (${formatBreakpoint(locale, breakpoint)})`}>
        <Field label={messages.inspector.alignment}>
          <Segmented
            size="sm"
            value={currentAlign}
            options={[
              { value: "left", label: messages.options.left },
              { value: "center", label: messages.options.center },
              { value: "right", label: messages.options.right },
            ]}
            onChange={(v) => setResponsiveField("align", v)}
          />
        </Field>
        <Field label={messages.inspector.width}>
          <Segmented
            size="sm"
            value={block.layout.trueFullBleed ? "bleed" : (block.layout.width ?? "content")}
            options={[
              { value: "content", label: messages.options.contained },
              { value: "full", label: messages.options.full },
              { value: "bleed", label: messages.options.fullBleed },
            ]}
            onChange={(v) => {
              if (v === "bleed") {
                field("layout.width", "full");
                field("layout.trueFullBleed", true);
              } else {
                field("layout.width", v);
                field("layout.trueFullBleed", false);
              }
            }}
          />
        </Field>
        <Field label={messages.inspector.heroHeight}>
          <NumberSlider
            value={currentMinHeight}
            min={200}
            max={700}
            step={20}
            suffix="px"
            onChange={(v) => setResponsiveField("minHeight", v)}
          />
        </Field>
        <Field label={messages.inspector.ctaButtonsDirection}>
          <Segmented
            size="sm"
            value={currentCtaDirection}
            options={[
              { value: "row", label: messages.options.row },
              { value: "column", label: messages.options.column },
            ]}
            onChange={(v) => setResponsiveField("ctaDirection", v)}
          />
        </Field>
      </Section>

      {/* Background Section — contextual sub-target of the selected Hero */}
      <div data-inspector-focus="hero-background" {...contextualFocusProps("hero-background")}>
        <Section title={messages.inspector.background}>
          <Field label={messages.inspector.backgroundType}>
            <Segmented
              size="sm"
              value={backgroundType}
              options={[
                { value: "solid", label: messages.options.solid },
                { value: "gradient", label: messages.options.gradient },
              ]}
              onChange={(v) => {
                if (v === "gradient") {
                  field("style.backgroundGradient", {
                    from: state.config.theme.colors.primary,
                    to: state.config.theme.colors.accent,
                    angle: 180,
                  });
                } else {
                  field("style.backgroundGradient", undefined);
                }
              }}
            />
          </Field>
          {backgroundType === "solid" ? (
            <Field
              label={messages.inspector.solidColor}
              action={
                block.style.background !== undefined && (
                  <button
                    type="button"
                    onClick={() => field("style.background", undefined)}
                    className="text-[10px] text-destructive hover:underline font-semibold"
                  >
                    {messages.inspector.reset}
                  </button>
                )
              }
            >
              <ColorInput
                value={block.style.background ?? state.config.theme.colors.card}
                onChange={(v) => field("style.background", v)}
              />
            </Field>
          ) : (
            <>
              <Field label={messages.inspector.fromColor}>
                <ColorInput
                  value={backgroundGradient?.from ?? state.config.theme.colors.primary}
                  onChange={(v) => field("style.backgroundGradient.from", v)}
                />
              </Field>
              <Field label={messages.inspector.toColor}>
                <ColorInput
                  value={backgroundGradient?.to ?? state.config.theme.colors.accent}
                  onChange={(v) => field("style.backgroundGradient.to", v)}
                />
              </Field>
              <Field label={messages.inspector.angle}>
                <NumberSlider
                  value={backgroundGradient?.angle ?? 180}
                  min={0}
                  max={360}
                  step={15}
                  suffix="°"
                  onChange={(v) => field("style.backgroundGradient.angle", v)}
                />
              </Field>
            </>
          )}
          <AssetField
            label={messages.inspector.fullBackgroundImage}
            accept="image/*"
            value={backgroundImage.url ?? ""}
            onChange={(v) => field("content.backgroundImage.url", v)}
          />
          {backgroundImage.url && (
            <>
              <Field label={messages.inspector.backgroundBlur}>
                <NumberSlider
                  value={backgroundImage.blur ?? 0}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => field("content.backgroundImage.blur", v)}
                />
              </Field>
              <Field label={messages.inspector.fit}>
                <Segmented
                  size="sm"
                  value={backgroundImage.fit ?? "cover"}
                  options={[
                    { value: "cover", label: messages.options.cover },
                    { value: "contain", label: messages.options.contain },
                  ]}
                  onChange={(v) => field("content.backgroundImage.fit", v)}
                />
              </Field>
              <Field label={messages.inspector.position}>
                <PositionGrid
                  value={backgroundImage.position ?? "center"}
                  onChange={(v) => field("content.backgroundImage.position", v)}
                />
              </Field>
            </>
          )}
          <Field label={messages.inspector.cornerRadius}>
            <NumberSlider
              value={block.style.radius ?? 24}
              min={0}
              max={48}
              onChange={(v) => field("style.radius", v)}
            />
          </Field>
        </Section>
      </div>

      {/* Overlay / Scrim Section — contextual sub-target of the selected Hero */}
      <div data-inspector-focus="hero-overlay" {...contextualFocusProps("hero-overlay")}>
        <Section title={messages.inspector.overlay}>
          <Field label={messages.inspector.overlayType}>
            <Segmented
              size="sm"
              value={overlay.type ?? "gradient"}
              options={[
                { value: "solid", label: messages.options.solid },
                { value: "gradient", label: messages.options.gradient },
              ]}
              onChange={(v) => field("style.overlay.type", v)}
            />
          </Field>
          <Field label={messages.inspector.intensity} hint={messages.inspector.overlayHint}>
            <NumberSlider
              value={overlay.opacity ?? 0.4}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => field("style.overlay.opacity", v)}
            />
          </Field>
          {overlay.type === "gradient" && (
            <Field label={messages.inspector.gradientDirection}>
              <Segmented
                size="sm"
                value={overlay.direction ?? "to-top"}
                options={[
                  { value: "to-top", label: messages.options.toTop },
                  { value: "to-bottom", label: messages.options.toBottom },
                ]}
                onChange={(v) => field("style.overlay.direction", v)}
              />
            </Field>
          )}
        </Section>
      </div>

      {/* CTA / Button — contextual sub-target of the selected Hero */}
      <div data-inspector-focus="hero-cta" {...contextualFocusProps("hero-cta")}>
        <Section title={messages.inspector.ctaButton}>
          <Field label={messages.inspector.content}>
            <span className="text-xs text-muted-foreground">{messages.inspector.ctaContentHint}</span>
          </Field>
          {/* Primary CTA */}
          <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-2">
            <span className="text-xs font-bold text-foreground">{messages.inspector.primaryCta}</span>
            <Field label={messages.inspector.label}>
              <TextInput
                value={primaryCTA.label ?? ""}
                onChange={(v) => field("content.primaryCTA.label", v)}
              />
            </Field>
            <Field label={messages.inspector.url}>
              <TextInput
                value={primaryCTA.url ?? ""}
                onChange={(v) => field("content.primaryCTA.url", v)}
              />
            </Field>
            <Field label={messages.inspector.icon}>
              <Segmented
                size="sm"
                value={primaryCTA.icon ?? "mail"}
                options={[
                  { value: "mail", label: "Mail" },
                  { value: "arrow-right", label: "Arrow" },
                  { value: "globe", label: "Globe" },
                  { value: "calendar", label: "Calendar" },
                ]}
                onChange={(v) => field("content.primaryCTA.icon", v)}
              />
            </Field>
            <CtaStyleControls
              style={primaryCTA.style}
              pathPrefix="content.primaryCTA.style"
              defaultRadius={state.config.theme.buttons.radius}
              onField={field}
            />
          </div>

          {/* Secondary CTA */}
          <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10">
            <span className="text-xs font-bold text-foreground">{messages.inspector.secondaryCta}</span>
            <Field label={messages.inspector.label}>
              <TextInput
                value={secondaryCTA.label ?? ""}
                onChange={(v) => field("content.secondaryCTA.label", v)}
              />
            </Field>
            <Field label={messages.inspector.url}>
              <TextInput
                value={secondaryCTA.url ?? ""}
                onChange={(v) => field("content.secondaryCTA.url", v)}
              />
            </Field>
            <Field label={messages.inspector.icon}>
              <Segmented
                size="sm"
                value={secondaryCTA.icon ?? "arrow-right"}
                options={[
                  { value: "mail", label: "Mail" },
                  { value: "arrow-right", label: "Arrow" },
                  { value: "globe", label: "Globe" },
                  { value: "calendar", label: "Calendar" },
                ]}
                onChange={(v) => field("content.secondaryCTA.icon", v)}
              />
            </Field>
            <CtaStyleControls
              style={secondaryCTA.style}
              pathPrefix="content.secondaryCTA.style"
              defaultRadius={state.config.theme.buttons.radius}
              onField={field}
            />
          </div>
        </Section>
      </div>

      <PositioningInspectorSection block={block} />

      {/* Visibility */}
      <Section title={messages.inspector.visibility}>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([key, IconCmp]) => (
            <button
              key={key}
              type="button"
              onClick={() => field(`visibility.${key}`, !block.visibility[key])}
              className={
                block.visibility[key]
                  ? "flex flex-col items-center gap-1 rounded-lg border border-foreground/40 bg-accent px-2 py-2 text-[10px] text-foreground"
                  : "flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 text-[10px] text-muted-foreground"
              }
            >
              <IconCmp className="h-4 w-4" />
              {formatBreakpoint(locale, key)}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatsBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Stat {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Value">
            <TextInput
              value={String(item.value ?? "")}
              placeholder="e.g. 10K+, 4.9"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, value: v } : i)))
              }
            />
          </Field>
          <Field label="Label">
            <TextInput
              value={item.label ?? ""}
              placeholder="e.g. Clients"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, label: v } : i)))
              }
            />
          </Field>
          <Field label="Helper text">
            <TextInput
              value={item.helperText ?? ""}
              placeholder="Optional helper text"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, helperText: v } : i)))
              }
            />
          </Field>
          <Field label="Icon">
            <TextInput
              value={item.icon ?? ""}
              placeholder="e.g. Award, Star, Clock"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, icon: v } : i)))}
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([...items, { id: uid("stat"), value: "100", label: "Label", icon: "Award" }])
        }
      >
        Add stat item
      </GhostButton>
    </div>
  );
}

function ServicesBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Service {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Title">
            <TextInput
              value={item.title ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, title: v } : i)))
              }
            />
          </Field>
          <Field label="Description">
            <TextArea
              value={item.description ?? ""}
              rows={2}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, description: v } : i)))
              }
            />
          </Field>
          <Field label="Price">
            <TextInput
              value={item.price ?? ""}
              placeholder="e.g. $99, Free"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, price: v } : i)))
              }
            />
          </Field>
          <Field label="Icon">
            <TextInput
              value={item.icon ?? ""}
              placeholder="e.g. Globe, Sparkles"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, icon: v } : i)))}
            />
          </Field>
          <AssetField
            label="Image (for image variant)"
            accept="image/*"
            value={item.imageUrl ?? ""}
            onChange={(v) =>
              update(items.map((i) => (i.id === item.id ? { ...i, imageUrl: v } : i)))
            }
          />
          <Field label="CTA Label">
            <TextInput
              value={item.ctaLabel ?? ""}
              placeholder="e.g. Book now"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, ctaLabel: v } : i)))
              }
            />
          </Field>
          <Field label="CTA URL">
            <TextInput
              value={item.ctaUrl ?? ""}
              placeholder="https://…"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, ctaUrl: v } : i)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([
            ...items,
            { id: uid("srv"), title: "New Service", description: "", price: "", icon: "Globe" },
          ])
        }
      >
        Add service item
      </GhostButton>
    </div>
  );
}

function TestimonialsBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Testimonial {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Quote">
            <TextArea
              value={item.quote ?? ""}
              rows={3}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, quote: v } : i)))
              }
            />
          </Field>
          <Field label="Name">
            <TextInput
              value={item.name ?? ""}
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, name: v } : i)))}
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={item.role ?? ""}
              placeholder="e.g. CEO, Designer"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, role: v } : i)))}
            />
          </Field>
          <Field label="Source">
            <TextInput
              value={item.source ?? ""}
              placeholder="e.g. Google Reviews"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, source: v } : i)))
              }
            />
          </Field>
          <Field label="Rating (1-5)">
            <NumberSlider
              value={item.rating ?? 5}
              min={1}
              max={5}
              step={1}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, rating: v } : i)))
              }
            />
          </Field>
          <AssetField
            label="Avatar"
            accept="image/*"
            value={item.avatarUrl ?? ""}
            onChange={(v) =>
              update(items.map((i) => (i.id === item.id ? { ...i, avatarUrl: v } : i)))
            }
          />
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([
            ...items,
            { id: uid("tst"), name: "Jane Doe", role: "", quote: "Loved it!", rating: 5 },
          ])
        }
      >
        Add testimonial item
      </GhostButton>
    </div>
  );
}

function PricingBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plan {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Plan title">
            <TextInput
              value={item.title ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, title: v } : i)))
              }
            />
          </Field>
          <Field label="Price">
            <TextInput
              value={item.price ?? ""}
              placeholder="e.g. $29, Free"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, price: v } : i)))
              }
            />
          </Field>
          <Field label="Period">
            <TextInput
              value={item.period ?? ""}
              placeholder="e.g. mo, yr"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, period: v } : i)))
              }
            />
          </Field>
          <Field label="Description">
            <TextInput
              value={item.description ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, description: v } : i)))
              }
            />
          </Field>
          <Field label="Features (comma separated)">
            <TextInput
              value={item.features ? item.features.join(", ") : ""}
              onChange={(v) => {
                const list = v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                update(items.map((i) => (i.id === item.id ? { ...i, features: list } : i)));
              }}
            />
          </Field>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
            <span className="text-xs font-medium text-foreground">Highlight / Recommended</span>
            <Toggle
              checked={item.recommended ?? false}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, recommended: v } : i)))
              }
            />
          </div>
          <Field label="CTA Label">
            <TextInput
              value={item.ctaLabel ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, ctaLabel: v } : i)))
              }
            />
          </Field>
          <Field label="CTA URL">
            <TextInput
              value={item.ctaUrl ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, ctaUrl: v } : i)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([
            ...items,
            { id: uid("prc"), title: "New plan", price: "$0", period: "mo", features: [] },
          ])
        }
      >
        Add pricing plan
      </GhostButton>
    </div>
  );
}

function FAQBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const behavior = block.content.behavior ?? {};
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-4">
      <Section title="FAQ behavior">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Allow multiple open FAQs</span>
          <Toggle
            checked={behavior.allowMultipleOpen ?? false}
            onChange={(v) => field("content.behavior.allowMultipleOpen", v)}
          />
        </div>
      </Section>
      <Section title="FAQ questions">
        <div className="space-y-3">
          {items.map((item: BlockItem, index: number) => (
            <div
              key={item.id ?? index}
              className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  FAQ {index + 1}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update(items.filter((i) => i.id !== item.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Field label="Question">
                <TextInput
                  value={item.question ?? ""}
                  onChange={(v) =>
                    update(items.map((i) => (i.id === item.id ? { ...i, question: v } : i)))
                  }
                />
              </Field>
              <Field label="Answer">
                <TextArea
                  value={item.answer ?? ""}
                  rows={3}
                  onChange={(v) =>
                    update(items.map((i) => (i.id === item.id ? { ...i, answer: v } : i)))
                  }
                />
              </Field>
            </div>
          ))}
          <GhostButton
            className="w-full"
            onClick={() =>
              update([...items, { id: uid("faq"), question: "New question", answer: "" }])
            }
          >
            Add FAQ item
          </GhostButton>
        </div>
      </Section>
    </div>
  );
}

function TimelineBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Event {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Date / Label">
            <TextInput
              value={item.date ?? ""}
              placeholder="e.g. 2024 - Present"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, date: v } : i)))}
            />
          </Field>
          <Field label="Title">
            <TextInput
              value={item.title ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, title: v } : i)))
              }
            />
          </Field>
          <Field label="Description">
            <TextArea
              value={item.description ?? ""}
              rows={2}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, description: v } : i)))
              }
            />
          </Field>
          <Field label="Icon">
            <TextInput
              value={item.icon ?? ""}
              placeholder="e.g. Award, Check"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, icon: v } : i)))}
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([...items, { id: uid("tml"), date: "2026", title: "New event", description: "" }])
        }
      >
        Add timeline event
      </GhostButton>
    </div>
  );
}

function FeaturedMediaBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const { messages } = usePowerEditorLocale();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title={messages.inspector.mediaSource}>
        <Field label={messages.inspector.mediaType}>
          <Segmented
            size="sm"
            value={c.mediaType ?? "image"}
            options={[
              { value: "image", label: messages.options.image },
              { value: "video", label: "Video" },
            ]}
            onChange={(v) => field("content.mediaType", v)}
          />
        </Field>
        {c.mediaType === "video" ? (
          <>
            <Field label={messages.inspector.videoProvider}>
              <Segmented
                size="sm"
                value={c.videoProvider ?? "youtube"}
                options={[
                  { value: "youtube", label: "YouTube" },
                  { value: "vimeo", label: "Vimeo" },
                ]}
                onChange={(v) => field("content.videoProvider", v)}
              />
            </Field>
            <Field label={messages.inspector.videoIdOrUrl}>
              <TextInput
                value={c.videoId ?? ""}
                placeholder="e.g. dQw4w9WgXcQ"
                onChange={(v) => field("content.videoId", v)}
              />
            </Field>
          </>
        ) : (
          <AssetField
            label={messages.inspector.image}
            accept="image/*"
            value={c.imageUrl ?? ""}
            onChange={(v) => field("content.imageUrl", v)}
          />
        )}
      </Section>

      <Section title={messages.inspector.mediaContent}>
        <Field label={messages.inspector.title}>
          <TextInput value={c.title ?? ""} onChange={(v) => field("content.title", v)} />
        </Field>
        <Field label={messages.inspector.description}>
          <TextArea
            value={c.description ?? ""}
            onChange={(v) => field("content.description", v)}
            rows={3}
          />
        </Field>
        <Field label={messages.inspector.ctaLabel}>
          <TextInput
            value={c.ctaLabel ?? ""}
            placeholder="Button label"
            onChange={(v) => field("content.ctaLabel", v)}
          />
        </Field>
        <Field label={messages.inspector.ctaUrl}>
          <TextInput
            value={c.ctaUrl ?? ""}
            placeholder="https://…"
            onChange={(v) => field("content.ctaUrl", v)}
          />
        </Field>
      </Section>
    </div>
  );
}

function FloatingActionsBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Tooltip / Label">
            <TextInput
              value={item.label ?? ""}
              placeholder="e.g. Chat with us"
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, label: v } : i)))
              }
            />
          </Field>
          <Field label="URL">
            <TextInput
              value={item.url ?? ""}
              placeholder="https://… or tel: or mailto:"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, url: v } : i)))}
            />
          </Field>
          <Field label="Icon name">
            <TextInput
              value={item.icon ?? ""}
              placeholder="e.g. whatsapp, call, website"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, icon: v } : i)))}
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([...items, { id: uid("fla"), label: "New Action", url: "", icon: "link" }])
        }
      >
        Add floating action
      </GhostButton>
    </div>
  );
}

function ContactBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Contact Info">
        <Field label="Email">
          <TextInput value={c.email ?? ""} onChange={(v) => field("content.email", v)} />
        </Field>
        <Field label="Phone">
          <TextInput value={c.phone ?? ""} onChange={(v) => field("content.phone", v)} />
        </Field>
        <Field label="Address / Location">
          <TextInput value={c.address ?? ""} onChange={(v) => field("content.address", v)} />
        </Field>
        <Field label="Website">
          <TextInput
            value={c.website ?? ""}
            placeholder="https://…"
            onChange={(v) => field("content.website", v)}
          />
        </Field>
        <Field label="WhatsApp URL">
          <TextInput
            value={c.whatsappUrl ?? ""}
            placeholder="https://wa.me/…"
            onChange={(v) => field("content.whatsappUrl", v)}
          />
        </Field>
        <Field label="Booking Calendar URL">
          <TextInput
            value={c.bookingUrl ?? ""}
            placeholder="https://calendly.com/…"
            onChange={(v) => field("content.bookingUrl", v)}
          />
        </Field>
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
          <span className="text-xs font-medium text-foreground">
            Add "Download Contact Card" button
          </span>
          <Toggle
            checked={c.downloadContact ?? false}
            onChange={(v) => field("content.downloadContact", v)}
          />
        </div>
      </Section>

      <Section title="Custom Call to Action">
        <Field label="Custom CTA Button Label">
          <TextInput
            value={c.customCtaLabel ?? ""}
            placeholder="e.g. Schedule call"
            onChange={(v) => field("content.customCtaLabel", v)}
          />
        </Field>
        <Field label="Custom CTA Button URL">
          <TextInput
            value={c.customCtaUrl ?? ""}
            placeholder="https://…"
            onChange={(v) => field("content.customCtaUrl", v)}
          />
        </Field>
      </Section>
    </div>
  );
}

function ProductBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Product details">
        <Field label="Title">
          <TextInput value={c.title ?? ""} onChange={(v) => field("content.title", v)} />
        </Field>
        <Field label="Description">
          <TextArea
            value={c.description ?? ""}
            onChange={(v) => field("content.description", v)}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Price">
            <TextInput
              value={c.price ?? ""}
              placeholder="e.g. $199.99"
              onChange={(v) => field("content.price", v)}
            />
          </Field>
          <Field label="Compare Price">
            <TextInput
              value={c.comparePrice ?? ""}
              placeholder="e.g. $249.99"
              onChange={(v) => field("content.comparePrice", v)}
            />
          </Field>
        </div>
        <Field label="Badge (e.g. Sale, New)">
          <TextInput
            value={typeof c.badge === "string" ? c.badge : (c.badge?.label ?? "")}
            onChange={(v) => field("content.badge", v)}
          />
        </Field>
        <AssetField
          label="Product Image"
          accept="image/*"
          value={c.imageUrl ?? ""}
          onChange={(v) => field("content.imageUrl", v)}
        />
        <Field label="CTA Button Label">
          <TextInput value={c.ctaLabel ?? ""} onChange={(v) => field("content.ctaLabel", v)} />
        </Field>
        <Field label="CTA Button URL">
          <TextInput value={c.ctaUrl ?? ""} onChange={(v) => field("content.ctaUrl", v)} />
        </Field>
      </Section>
    </div>
  );
}

function ProductGridBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const products = block.content.products ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.products", next);

  return (
    <div className="space-y-3">
      {products.map((prod: BlockItem, index: number) => (
        <div
          key={prod.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Product {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(products.filter((p) => p.id !== prod.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Title">
            <TextInput
              value={prod.title ?? ""}
              onChange={(v) =>
                update(products.map((p) => (p.id === prod.id ? { ...p, title: v } : p)))
              }
            />
          </Field>
          <Field label="Price">
            <TextInput
              value={prod.price ?? ""}
              onChange={(v) =>
                update(products.map((p) => (p.id === prod.id ? { ...p, price: v } : p)))
              }
            />
          </Field>
          <AssetField
            label="Image"
            accept="image/*"
            value={prod.imageUrl ?? ""}
            onChange={(v) =>
              update(products.map((p) => (p.id === prod.id ? { ...p, imageUrl: v } : p)))
            }
          />
          <Field label="CTA URL">
            <TextInput
              value={prod.ctaUrl ?? ""}
              placeholder="https://…"
              onChange={(v) =>
                update(products.map((p) => (p.id === prod.id ? { ...p, ctaUrl: v } : p)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([
            ...products,
            { id: uid("prd"), title: "New Product", price: "$0.00", imageUrl: "" },
          ])
        }
      >
        Add product card
      </GhostButton>
    </div>
  );
}

function BookingBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Booking service">
        <Field label="Booking block title">
          <TextInput value={c.title ?? ""} onChange={(v) => field("content.title", v)} />
        </Field>
        <Field label="Description">
          <TextArea
            value={c.description ?? ""}
            onChange={(v) => field("content.description", v)}
            rows={2}
          />
        </Field>
        <Field label="Service Name">
          <TextInput
            value={c.service ?? ""}
            placeholder="e.g. Design Consulting"
            onChange={(v) => field("content.service", v)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Duration">
            <TextInput
              value={c.duration ?? ""}
              placeholder="e.g. 60 mins"
              onChange={(v) => field("content.duration", v)}
            />
          </Field>
          <Field label="Price">
            <TextInput
              value={c.price ?? ""}
              placeholder="e.g. $150"
              onChange={(v) => field("content.price", v)}
            />
          </Field>
        </div>
        <Field label="Available Dates (comma separated)">
          <TextInput
            value={c.availableDates ? c.availableDates.join(", ") : ""}
            onChange={(v) => {
              const list = v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              field("content.availableDates", list);
            }}
          />
        </Field>
        <Field label="Available Times (comma separated)">
          <TextInput
            value={c.availableTimes ? c.availableTimes.join(", ") : ""}
            onChange={(v) => {
              const list = v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              field("content.availableTimes", list);
            }}
          />
        </Field>
        <Field label="CTA Button Label">
          <TextInput value={c.ctaLabel ?? ""} onChange={(v) => field("content.ctaLabel", v)} />
        </Field>
      </Section>
    </div>
  );
}

function CalendarBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Calendar settings">
        <Field label="Disabled dates (comma separated YYYY-MM-DD)">
          <TextInput
            value={c.disabledDates ? c.disabledDates.join(", ") : ""}
            placeholder="e.g. 2026-08-10, 2026-08-15"
            onChange={(v) => {
              const list = v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              field("content.disabledDates", list);
            }}
          />
        </Field>
      </Section>
    </div>
  );
}

function EventsBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((event: BlockItem, index: number) => (
        <div
          key={event.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Event {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((e) => e.id !== event.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Event Title">
            <TextInput
              value={event.title ?? ""}
              onChange={(v) =>
                update(items.map((e) => (e.id === event.id ? { ...e, title: v } : e)))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
              <TextInput
                value={event.date ?? ""}
                placeholder="e.g. Sep 12, 2026"
                onChange={(v) =>
                  update(items.map((e) => (e.id === event.id ? { ...e, date: v } : e)))
                }
              />
            </Field>
            <Field label="Time">
              <TextInput
                value={event.time ?? ""}
                placeholder="e.g. 7:00 PM"
                onChange={(v) =>
                  update(items.map((e) => (e.id === event.id ? { ...e, time: v } : e)))
                }
              />
            </Field>
          </div>
          <Field label="Location">
            <TextInput
              value={event.location ?? ""}
              onChange={(v) =>
                update(items.map((e) => (e.id === event.id ? { ...e, location: v } : e)))
              }
            />
          </Field>
          <AssetField
            label="Event Image"
            accept="image/*"
            value={event.imageUrl ?? ""}
            onChange={(v) =>
              update(items.map((e) => (e.id === event.id ? { ...e, imageUrl: v } : e)))
            }
          />
          <Field label="CTA Button Label">
            <TextInput
              value={event.ctaLabel ?? ""}
              onChange={(v) =>
                update(items.map((e) => (e.id === event.id ? { ...e, ctaLabel: v } : e)))
              }
            />
          </Field>
          <Field label="CTA Button URL">
            <TextInput
              value={event.ctaUrl ?? ""}
              onChange={(v) =>
                update(items.map((e) => (e.id === event.id ? { ...e, ctaUrl: v } : e)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([
            ...items,
            {
              id: uid("evt"),
              date: "Sep 15",
              title: "New event",
              ctaLabel: "Register",
              ctaUrl: "",
            },
          ])
        }
      >
        Add event item
      </GhostButton>
    </div>
  );
}

function MapBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const loc = c.location ?? { lat: -33.45, lng: -70.66, label: "Santiago Center" };
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  const setLocation = (key: string, value: unknown) => {
    field("content.location", {
      ...loc,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <Section title="Map location coordinates">
        <Field label="Address / Label text">
          <TextInput value={loc.label ?? ""} onChange={(v) => setLocation("label", v)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude">
            <TextInput
              value={String(loc.lat ?? "")}
              onChange={(v) => setLocation("lat", Number(v) || 0)}
            />
          </Field>
          <Field label="Longitude">
            <TextInput
              value={String(loc.lng ?? "")}
              onChange={(v) => setLocation("lng", Number(v) || 0)}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function MusicBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Track details">
        <Field label="Song / Track Title">
          <TextInput value={c.title ?? ""} onChange={(v) => field("content.title", v)} />
        </Field>
        <Field label="Artist / Publisher">
          <TextInput value={c.artist ?? ""} onChange={(v) => field("content.artist", v)} />
        </Field>
        <Field label="Audio Source URL (.mp3)">
          <TextInput
            value={c.audioUrl ?? ""}
            placeholder="https://…"
            onChange={(v) => field("content.audioUrl", v)}
          />
        </Field>
        <AssetField
          label="Track Cover Art"
          accept="image/*"
          value={c.coverUrl ?? ""}
          onChange={(v) => field("content.coverUrl", v)}
        />
      </Section>
    </div>
  );
}

function CarouselBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((slide: BlockItem, index: number) => (
        <div
          key={slide.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Slide {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((s) => s.id !== slide.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <AssetField
            label="Slide Image"
            accept="image/*"
            value={slide.imageUrl ?? ""}
            onChange={(v) =>
              update(items.map((s) => (s.id === slide.id ? { ...s, imageUrl: v } : s)))
            }
          />
          <Field label="Title text overlay">
            <TextInput
              value={slide.title ?? ""}
              onChange={(v) =>
                update(items.map((s) => (s.id === slide.id ? { ...s, title: v } : s)))
              }
            />
          </Field>
          <Field label="Description text overlay">
            <TextInput
              value={slide.description ?? ""}
              onChange={(v) =>
                update(items.map((s) => (s.id === slide.id ? { ...s, description: v } : s)))
              }
            />
          </Field>
          <Field label="Link URL on click">
            <TextInput
              value={slide.linkUrl ?? ""}
              placeholder="https://…"
              onChange={(v) =>
                update(items.map((s) => (s.id === slide.id ? { ...s, linkUrl: v } : s)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() =>
          update([...items, { id: uid("sl"), imageUrl: "", title: "", description: "" }])
        }
      >
        Add carousel slide
      </GhostButton>
    </div>
  );
}

function TabsBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((tab: BlockItem, index: number) => (
        <div
          key={tab.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tab {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((t) => t.id !== tab.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Tab label">
            <TextInput
              value={tab.label ?? ""}
              onChange={(v) => update(items.map((t) => (t.id === tab.id ? { ...t, label: v } : t)))}
            />
          </Field>
          <Field label="Content body text">
            <TextArea
              value={tab.contentText ?? ""}
              rows={3}
              onChange={(v) =>
                update(items.map((t) => (t.id === tab.id ? { ...t, contentText: v } : t)))
              }
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() => update([...items, { id: uid("tb"), label: "New Tab", contentText: "" }])}
      >
        Add tab item
      </GhostButton>
    </div>
  );
}

function BottomNavBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const update = (next: BlockItem[]) => field("content.items", next);

  return (
    <div className="space-y-3">
      {items.map((item: BlockItem, index: number) => (
        <div
          key={item.id ?? index}
          className="space-y-2 rounded-xl border border-border p-3 bg-muted/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tab button {index + 1}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Button Label">
            <TextInput
              value={item.label ?? ""}
              onChange={(v) =>
                update(items.map((i) => (i.id === item.id ? { ...i, label: v } : i)))
              }
            />
          </Field>
          <Field label="URL target">
            <TextInput
              value={item.url ?? ""}
              placeholder="e.g. #section or https://…"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, url: v } : i)))}
            />
          </Field>
          <Field label="Icon name">
            <TextInput
              value={item.icon ?? ""}
              placeholder="e.g. home, services, profile"
              onChange={(v) => update(items.map((i) => (i.id === item.id ? { ...i, icon: v } : i)))}
            />
          </Field>
        </div>
      ))}
      <GhostButton
        className="w-full"
        onClick={() => update([...items, { id: uid("nav"), label: "Tab", url: "", icon: "home" }])}
      >
        Add bottom navigation tab
      </GhostButton>
    </div>
  );
}

function TrustBlockInspector({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const [pickerOpen, setPickerOpen] = useState(false);
  const badges = (block.content.badges ?? []) as TrustBadge[];
  const enabled = block.content.enabled !== false;
  const setSignals = (next: TrustBadge[]) =>
    dispatch({ type: "patchBlockField", id: block.id, path: "content.badges", value: next });
  const setEnabled = (v: boolean) =>
    dispatch({ type: "patchBlockField", id: block.id, path: "content.enabled", value: v });
  const activeCount = badges.length;
  const atMax = activeCount >= MAX_TRUST_SIGNALS;
  const addSignal = (type: TrustSignalType) => {
    if (atMax) return;
    const signal: TrustBadge = { id: uid("sig"), type };
    const v = defaultTrustSignalValue(type);
    if (v !== undefined) signal.value = v;
    setSignals([...badges, signal]);
    setPickerOpen(false);
  };
  const removeSignal = (id: string) => setSignals(badges.filter((s) => s.id !== id));
  const updateSignal = (id: string, patch: Partial<TrustBadge>) =>
    setSignals(badges.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const activeTypes = new Set(badges.map((b) => b.type).filter(Boolean));
  const available = USER_SELECTABLE_SIGNALS.filter((d) => !activeTypes.has(d.type));

  return (
    <Section title="Confianza">
      <Toggle
        label="Mostrar señales de confianza"
        checked={enabled}
        onChange={setEnabled}
      />
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <span className="text-xs font-medium text-foreground">Señales activas</span>
        <span className="text-xs text-muted-foreground">
          {activeCount}/{MAX_TRUST_SIGNALS}
        </span>
      </div>

      {badges.map((signal) => {
        const def = signal.type ? getTrustSignalDefinition(signal.type) : undefined;
        return (
          <div key={signal.id} className="space-y-2 rounded-lg border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {def?.label ?? signal.label ?? signal.type}
              </span>
              <button
                type="button"
                title="Eliminar"
                aria-label="Eliminar señal"
                onClick={() => removeSignal(signal.id)}
                className="rounded p-0.5 text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {signal.type === "response_time" && (
              <Field label="Tiempo habitual de respuesta">
                <NumberSlider
                  value={typeof signal.value === "number" ? signal.value : 2}
                  min={1}
                  max={72}
                  suffix=" h"
                  onChange={(v) => updateSignal(signal.id, { value: v })}
                />
              </Field>
            )}
            {signal.type === "rating" && (
              <>
                <Field label="Valoración">
                  <NumberSlider
                    value={typeof signal.value === "number" ? signal.value : 4.8}
                    min={1}
                    max={5}
                    step={0.1}
                    onChange={(v) => updateSignal(signal.id, { value: v })}
                  />
                </Field>
                <Field label="Número de reseñas">
                  <NumberSlider
                    value={signal.reviewCount ?? 0}
                    min={0}
                    max={100000}
                    onChange={(v) => updateSignal(signal.id, { reviewCount: v })}
                  />
                </Field>
              </>
            )}
            {signal.type === "experience" && (
              <Field label="Años de experiencia">
                <NumberSlider
                  value={typeof signal.value === "number" ? signal.value : 5}
                  min={1}
                  max={80}
                  onChange={(v) => updateSignal(signal.id, { value: v })}
                />
              </Field>
            )}
            {signal.type === "customers_served" && (
              <Field label="Clientes atendidos">
                <NumberSlider
                  value={typeof signal.value === "number" ? signal.value : 100}
                  min={1}
                  max={1000000}
                  onChange={(v) => updateSignal(signal.id, { value: v })}
                />
              </Field>
            )}
            {(signal.type === "certification" ||
              signal.type === "award" ||
              signal.type === "guarantee") && (
              <Field label={def?.label ?? "Texto"}>
                <TextInput
                  value={typeof signal.value === "string" ? signal.value : ""}
                  onChange={(v) => updateSignal(signal.id, { value: v })}
                  placeholder={signal.type === "award" ? "Escribe el reconocimiento" : ""}
                />
              </Field>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        disabled={atMax}
        aria-disabled={atMax}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        + Añadir señal
      </button>
      {atMax && (
        <p className="text-[11px] text-muted-foreground">
          Puedes mostrar hasta 4 señales de confianza.
        </p>
      )}

      {pickerOpen && !atMax && (
        <div className="space-y-1">
          {available.map((d) => (
            <button
              key={d.type}
              type="button"
              onClick={() => addSignal(d.type)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground transition hover:bg-accent"
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function BlockInspector({ block }: { block: TemplateBlock }) {
  const { state, dispatch, breakpoint, tier } = useStudio();
  const { locale, messages } = usePowerEditorLocale();
  const motionLocked = isCapabilityLocked(tier, "advanced_motion");
  const duplicateLocked = isAssetLocked("block", block.type, tier);
  if (block.type === "hero") {
    return <HeroBlockInspector block={block} />;
  }

  const layout = state.config.layout;
  const isGridOrBento = layout.type === "grid" || layout.type === "bento";
  const definition = getBlockDefinition(block.type);
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });
  const content = block.content;
  const has = (key: keyof typeof content) => content[key] !== undefined;

  // Responsive getters
  const currentAlign = block.responsive?.[breakpoint]?.align ?? block.layout.align ?? "center";
  const currentColSpan =
    block.responsive?.[breakpoint]?.colSpan ?? block.layout.colSpan ?? block.layout.span ?? 1;
  const currentRowSpan = block.responsive?.[breakpoint]?.rowSpan ?? block.layout.rowSpan ?? 1;
  const currentPadding = block.responsive?.[breakpoint]?.padding ?? block.style.padding ?? 16;

  // Find the index of the block to show/edit order
  const blockIndex = state.config.blocks.findIndex((b) => b.id === block.id);
  const currentOrder =
    block.responsive?.[breakpoint]?.order !== undefined
      ? block.responsive[breakpoint].order
      : blockIndex;

  // Responsive setters helper
  const setResponsiveField = (fieldKey: string, value: unknown) => {
    if (breakpoint === "desktop") {
      if (fieldKey === "padding") {
        field("style.padding", value);
      } else if (fieldKey === "colSpan" || fieldKey === "rowSpan" || fieldKey === "align") {
        field(`layout.${fieldKey}`, value);
      } else if (fieldKey === "order") {
        field(`responsive.desktop.order`, value);
      }
    } else {
      field(`responsive.${breakpoint}.${fieldKey}`, value);
    }
  };

  return (
    <div>
      <Section
        title={definition?.name ?? block.type}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={duplicateLocked ? messages.inspector.duplicatePro : messages.inspector.duplicate}
              aria-disabled={duplicateLocked}
              onClick={() => {
                if (duplicateLocked) return;
                dispatch({ type: "duplicateBlock", id: block.id });
              }}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {duplicateLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              title={messages.inspector.delete}
              onClick={() => dispatch({ type: "deleteBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        {definition && definition.variants.length > 1 && (
          <Field label={messages.inspector.variant}>
            <Segmented
              size="sm"
              value={block.variant}
              options={definition.variants.map((variant) => ({ value: variant, label: variant }))}
              onChange={(v) =>
                dispatch({ type: "updateBlock", id: block.id, patch: { variant: v } })
              }
            />
          </Field>
        )}
        {block.type === "stats" && <StatsBlockInspector block={block} />}
        {block.type === "trust" && <TrustBlockInspector block={block} />}
        {block.type === "services" && <ServicesBlockInspector block={block} />}
        {block.type === "testimonials" && <TestimonialsBlockInspector block={block} />}
        {block.type === "pricing" && <PricingBlockInspector block={block} />}
        {block.type === "faq" && <FAQBlockInspector block={block} />}
        {block.type === "timeline" && <TimelineBlockInspector block={block} />}
        {block.type === "featuredMedia" && <FeaturedMediaBlockInspector block={block} />}
        {block.type === "floatingActions" && <FloatingActionsBlockInspector block={block} />}
        {block.type === "contact" && <ContactBlockInspector block={block} />}
        {block.type === "product" && <ProductBlockInspector block={block} />}
        {block.type === "productGrid" && <ProductGridBlockInspector block={block} />}
        {block.type === "booking" && <BookingBlockInspector block={block} />}
        {block.type === "calendar" && <CalendarBlockInspector block={block} />}
        {block.type === "events" && <EventsBlockInspector block={block} />}
        {block.type === "map" && <MapBlockInspector block={block} />}
        {block.type === "music" && <MusicBlockInspector block={block} />}
        {block.type === "carousel" && <CarouselBlockInspector block={block} />}
        {block.type === "tabs" && <TabsBlockInspector block={block} />}
        {block.type === "bottomNav" && <BottomNavBlockInspector block={block} />}

        {block.type !== "stats" &&
          block.type !== "trust" &&
          block.type !== "services" &&
          block.type !== "testimonials" &&
          block.type !== "pricing" &&
          block.type !== "faq" &&
          block.type !== "timeline" &&
          block.type !== "featuredMedia" &&
          block.type !== "floatingActions" &&
          block.type !== "contact" &&
          block.type !== "product" &&
          block.type !== "productGrid" &&
          block.type !== "booking" &&
          block.type !== "calendar" &&
          block.type !== "events" &&
          block.type !== "map" &&
          block.type !== "music" &&
          block.type !== "carousel" &&
          block.type !== "tabs" &&
          block.type !== "bottomNav" && (
            <>
              {has("title") && (
                <Field label={messages.inspector.title}>
                  <TextInput
                    value={content.title ?? ""}
                    onChange={(v) => field("content.title", v)}
                  />
                </Field>
              )}
              {has("subtitle") && (
                <Field label={messages.inspector.subtitle}>
                  <TextInput
                    value={content.subtitle ?? ""}
                    onChange={(v) => field("content.subtitle", v)}
                  />
                </Field>
              )}
              {has("body") && (
                <Field label={messages.inspector.text}>
                  <TextArea
                    value={content.body ?? ""}
                    onChange={(v) => field("content.body", v)}
                    rows={4}
                  />
                </Field>
              )}
              {has("label") && (
                <Field label={messages.inspector.buttonLabel}>
                  <TextInput
                    value={content.label ?? ""}
                    onChange={(v) => field("content.label", v)}
                  />
                </Field>
              )}
              {has("url") && (
                <Field label={messages.inspector.url}>
                  <TextInput value={content.url ?? ""} onChange={(v) => field("content.url", v)} />
                </Field>
              )}
              {has("imageUrl") && (
                <AssetField
                  label={messages.inspector.image}
                  accept="image/*"
                  value={content.imageUrl ?? ""}
                  onChange={(v) => field("content.imageUrl", v)}
                />
              )}
              {has("videoId") && (
                <Field label={messages.inspector.videoIdOrUrl}>
                  <TextInput
                    value={content.videoId ?? ""}
                    onChange={(v) => {
                      const parsed = parseVideoUrl(v);
                      if (parsed) {
                        field("content.videoId", parsed.videoId);
                        field("content.provider", parsed.provider);
                      } else {
                        field("content.videoId", v.replace(/[^A-Za-z0-9_-]/g, ""));
                      }
                    }}
                  />
                </Field>
              )}
              {has("fileName") && (
                <>
                  <Field label={messages.inspector.fileName}>
                    <TextInput
                      value={content.fileName ?? ""}
                      onChange={(v) => field("content.fileName", v)}
                    />
                  </Field>
                  <AssetField
                    label={messages.inspector.file}
                    accept="*/*"
                    value={content.url ?? ""}
                    onChange={(v, asset) => {
                      field("content.url", v);
                      if (asset?.name) field("content.fileName", asset.name);
                    }}
                  />
                </>
              )}
            </>
          )}
      </Section>

      {content.items &&
        block.type !== "stats" &&
        block.type !== "services" &&
        block.type !== "testimonials" &&
        block.type !== "pricing" &&
        block.type !== "faq" &&
        block.type !== "timeline" &&
        block.type !== "floatingActions" &&
        block.type !== "events" &&
        block.type !== "carousel" &&
        block.type !== "tabs" &&
        block.type !== "bottomNav" && (
          <Section title={messages.inspector.items}>
            <ItemsEditor block={block} />
          </Section>
        )}
      {content.socials && (
        <Section title={messages.inspector.socials}>
          <SocialsEditor block={block} />
        </Section>
      )}

      <Section title={`${messages.inspector.layout} (${formatBreakpoint(locale, breakpoint)})`}>
        <Field label={messages.inspector.alignment}>
          <Segmented
            size="sm"
            value={currentAlign}
            options={[
              { value: "left", label: messages.options.left },
              { value: "center", label: messages.options.center },
              { value: "right", label: messages.options.right },
            ]}
            onChange={(v) => setResponsiveField("align", v)}
          />
        </Field>
        <Field label={messages.inspector.width}>
          <Segmented
            size="sm"
            value={block.layout.width ?? "content"}
            options={[
              { value: "content", label: messages.options.content },
              { value: "full", label: messages.options.full },
            ]}
            onChange={(v) => field("layout.width", v)}
          />
        </Field>
        <Field label={messages.inspector.gridSpan}>
          <Segmented
            size="sm"
            value={String(block.layout.span ?? 2)}
            options={[
              { value: "1", label: messages.options.half },
              { value: "2", label: messages.options.full },
            ]}
            onChange={(v) => field("layout.span", Number(v))}
          />
        </Field>
        {block.type === "buttonGroup" ? (
          <Field label={messages.inspector.buttonColumns}>
            <NumberSlider
              value={Math.max(1, Math.min(2, block.layout.columns ?? 2))}
              min={1}
              max={2}
              step={1}
              onChange={(v) => field("layout.columns", v)}
            />
          </Field>
        ) : null}
        {isGridOrBento && (
          <>
            <Field label={messages.inspector.columnSpan}>
              <NumberSlider
                value={currentColSpan}
                min={1}
                max={4}
                step={1}
                onChange={(v) => setResponsiveField("colSpan", v)}
              />
            </Field>
            <Field label={messages.inspector.rowSpan}>
              <NumberSlider
                value={currentRowSpan}
                min={1}
                max={4}
                step={1}
                onChange={(v) => setResponsiveField("rowSpan", v)}
              />
            </Field>
          </>
        )}
        <Field label={messages.inspector.order}>
          <NumberSlider
            value={currentOrder}
            min={0}
            max={30}
            step={1}
            onChange={(v) => setResponsiveField("order", v)}
          />
        </Field>
      </Section>

      <Section title={`${messages.inspector.style} (${formatBreakpoint(locale, breakpoint)})`}>
        <Field
          label={messages.inspector.backgroundOverride}
          action={
            block.style.background !== undefined && (
              <button
                type="button"
                onClick={() => field("style.background", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                {messages.inspector.reset}
              </button>
            )
          }
        >
          <ColorInput
            value={block.style.background ?? state.config.theme.colors.card}
            onChange={(v) => field("style.background", v)}
          />
        </Field>
        <Field
          label={messages.inspector.textColorOverride}
          action={
            block.style.textColor !== undefined && (
              <button
                type="button"
                onClick={() => field("style.textColor", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                {messages.inspector.reset}
              </button>
            )
          }
        >
          <ColorInput
            value={block.style.textColor ?? state.config.theme.colors.text}
            onChange={(v) => field("style.textColor", v)}
          />
        </Field>
        <Field
          label={messages.inspector.cornerRadiusOverride}
          action={
            block.style.radius !== undefined && (
              <button
                type="button"
                onClick={() => field("style.radius", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                {messages.inspector.reset}
              </button>
            )
          }
        >
          <NumberSlider
            value={
              block.style.radius !== undefined
                ? block.style.radius
                : state.config.theme.cards.radius
            }
            min={0}
            max={40}
            onChange={(v) => field("style.radius", v)}
          />
        </Field>
        <Field
          label={messages.inspector.shadowOverride}
          action={
            block.style.shadow !== undefined && (
              <button
                type="button"
                onClick={() => field("style.shadow", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                {messages.inspector.reset}
              </button>
            )
          }
        >
          <Segmented
            size="sm"
            value={block.style.shadow ?? "theme"}
            options={[
              { value: "theme", label: messages.options.theme },
              { value: "none", label: messages.options.none },
              { value: "soft", label: messages.options.soft },
              { value: "elevated", label: messages.options.elevated },
              { value: "floating", label: messages.options.float },
              { value: "glow", label: messages.options.glow },
            ]}
            onChange={(v) => field("style.shadow", v === "theme" ? undefined : v)}
          />
        </Field>
        <Field
          label={messages.inspector.borderWidthOverride}
          action={
            block.style.borderWidth !== undefined && (
              <button
                type="button"
                onClick={() => field("style.borderWidth", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                {messages.inspector.reset}
              </button>
            )
          }
        >
          <NumberSlider
            value={
              block.style.borderWidth !== undefined
                ? block.style.borderWidth
                : state.config.theme.cards.borderWidth
            }
            min={0}
            max={10}
            onChange={(v) => field("style.borderWidth", v)}
          />
        </Field>
        <Field label={messages.inspector.accentColor}>
          <ColorInput
            value={block.style.accentColor ?? state.config.theme.colors.accent}
            onChange={(v) => field("style.accentColor", v)}
          />
        </Field>
        <Field label={messages.inspector.decorativeFrame}>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            value={block.style.frame ?? "none"}
            onChange={(e) => field("style.frame", e.target.value)}
          >
            {[
              ["none", messages.options.none],
              ["hairline", messages.options.hairline],
              ["double", messages.options.double],
              ["inset", messages.options.inset],
              ["gradient", messages.options.gradient],
              ["luxury", messages.options.luxury],
              ["glow", messages.options.glow],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={messages.inspector.padding}>
          <NumberSlider
            value={currentPadding}
            min={0}
            max={48}
            onChange={(v) => setResponsiveField("padding", v)}
          />
        </Field>
        <Field label={messages.inspector.animation}>
          <Segmented
            size="sm"
            value={block.interaction.animation ?? "soft-rise"}
            options={[
              { value: "none", label: messages.options.none },
              { value: "fade", label: messages.options.fade },
              { value: "slide", label: messages.options.slide },
              { value: "soft-rise", label: messages.options.rise },
            ]}
            onChange={(v) => field("interaction.animation", v)}
          />
        </Field>
      </Section>

      <PositioningInspectorSection block={block} />

      {/* ---- Local Motion Overrides ---- */}
      <Locked locked={motionLocked}>
        <Section title={messages.inspector.motion} action={motionLocked ? <ProBadge /> : undefined}>
          <Toggle
            label={messages.inspector.useGlobalMotion}
            checked={block.motion?.useGlobal !== false}
            onChange={(v) => field("motion.useGlobal", v)}
          />
          {block.motion?.useGlobal === false && (
            <>
              <Toggle
                label={messages.inspector.disableMotion}
                checked={block.motion?.disableMotion === true}
                onChange={(v) => field("motion.disableMotion", v)}
              />
              {!block.motion?.disableMotion && (
                <>
                  <Field label={messages.inspector.entranceOverride}>
                    <Segmented
                      value={(block.motion?.entrance ?? "soft-rise") as EntrancePreset}
                      options={ENTRANCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => field("motion.entrance", v)}
                      size="sm"
                    />
                  </Field>
                  <Field label={messages.inspector.hoverOverride}>
                    <Segmented
                      value={(block.motion?.hover ?? "lift") as HoverPreset}
                      options={HOVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => field("motion.hover", v)}
                      size="sm"
                    />
                  </Field>
                </>
              )}
            </>
          )}
        </Section>
      </Locked>

      <Section title={messages.inspector.visibility}>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([key, IconCmp]) => (
            <button
              key={key}
              type="button"
              onClick={() => field(`visibility.${key}`, !block.visibility[key])}
              className={
                block.visibility[key]
                  ? "flex flex-col items-center gap-1 rounded-lg border border-foreground/40 bg-accent px-2 py-2 text-[10px] text-foreground"
                  : "flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 text-[10px] text-muted-foreground"
              }
            >
              <IconCmp className="h-4 w-4" />
              {formatBreakpoint(locale, key)}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function Inspector() {
  const { state } = useStudio();
  const block = state.config.blocks.find((b) => b.id === state.selectedBlockId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const previousSelectionRef = useRef<string | null>(state.selectedBlockId);

  // Phase 5A — contextual inspector autofocus. Reset the Inspector's own scroll
  // to the top of the relevant controls ONLY when the selection identity changes.
  // Editing the same block keeps `selectedBlockId` stable and must never scroll,
  // so the panel stays put while the user types or drags a slider. This touches
  // only the Inspector scroll container — never the Canvas / camera / Stage.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (!shouldResetInspectorScroll(previousSelectionRef.current, state.selectedBlockId)) return;
    previousSelectionRef.current = state.selectedBlockId;
    if (container.scrollTop !== 0) container.scrollTop = 0;
  }, [state.selectedBlockId]);

  // Phase 5B2 — clicking the profile cover requests a one-shot Inspector scroll
  // to the Cover/Banner section. `requestInspectorFocus` fires only on an explicit
  // user click (never on render/edit/load/resize/zoom), so this cannot jump
  // repeatedly. Deferred one frame so the ProfileInspector (and its Cover section)
  // is mounted after any block selection clears.
  useEffect(() => {
    return subscribeInspectorFocus((target) => {
      if (!shouldScrollInspectorToFocus(target)) return;
      const container = scrollRef.current;
      if (!container) return;
      const defer = (cb: () => void) => {
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => cb());
        else setTimeout(cb, 0);
      };
      defer(() => {
        const el = container.querySelector<HTMLElement>(`[data-inspector-focus="${target}"]`);
        if (!el) return;
        // Exact-target centering: place the target's center at ~45% of the
        // visible Inspector height (comfortable 35%–55% band), clamped to the
        // scroll range so it never overshoots the top or bottom edge.
        const delta = computeInspectorFocusScroll(
          container.getBoundingClientRect(),
          el.getBoundingClientRect(),
        );
        if (delta !== 0) {
          container.scrollTop = clampScrollValue(
            container.scrollTop + delta,
            container.scrollHeight,
            container.clientHeight,
          );
        }
      });
    });
  }, []);

  return (
    <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div
        ref={scrollRef}
        data-inspector-scroll-root
        className="pts-inspector-scroll pts-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {block ? <BlockInspector block={block} /> : <ProfileInspector />}
      </div>
    </aside>
  );
}

export function InspectorContent() {
  const { state } = useStudio();
  const block = state.config.blocks.find((b) => b.id === state.selectedBlockId);
  return block ? <BlockInspector block={block} /> : <ProfileInspector />;
}
