import { Monitor, Smartphone, Tablet, Trash2, Copy } from "lucide-react";
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
import type {
  BlockItem,
  SocialItem,
  TemplateBlock,
  EntrancePreset,
  HoverPreset,
} from "../../types";
import type { StudioAdapters } from "../../adapters";
import { ENTRANCE_OPTIONS, HOVER_OPTIONS } from "../../constants/motionPresets";
import { useRef, useState } from "react";

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
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  return (
    <Field label={label}>
      <div className="space-y-2">
        <TextInput value={value} onChange={(v) => onChange(v)} placeholder="https://…" />
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
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
              Remove
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
  const { profile, layout } = state.config;
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

  return (
    <div>
      <Section title="Profile">
        <Field label="Name">
          <TextInput value={profile.name} onChange={(v) => patch("profile.name", v)} />
        </Field>
        <Field label="Username">
          <TextInput
            value={profile.username ?? ""}
            onChange={(v) => patch("profile.username", v)}
          />
        </Field>
        <Field label="Role">
          <TextInput value={profile.role ?? ""} onChange={(v) => patch("profile.role", v)} />
        </Field>
        <Field label="Company">
          <TextInput value={profile.company ?? ""} onChange={(v) => patch("profile.company", v)} />
        </Field>
        <Field label="Location">
          <TextInput
            value={profile.location ?? ""}
            onChange={(v) => patch("profile.location", v)}
          />
        </Field>
        <Field label="Bio">
          <TextArea
            value={profile.description ?? ""}
            onChange={(v) => patch("profile.description", v)}
          />
        </Field>
        <AssetField
          label="Avatar"
          accept="image/*"
          value={profile.avatarUrl ?? ""}
          onChange={(v) => patch("profile.avatarUrl", v)}
        />
        <Toggle
          label="Verified badge"
          checked={profile.verified ?? false}
          onChange={(v) => patch("profile.verified", v)}
        />
        <Field label="Avatar alignment">
          <Segmented
            size="sm"
            value={profile.avatar.align}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => patch("profile.avatar.align", v)}
          />
        </Field>
        <Field label="Avatar overlap">
          <NumberSlider
            value={profile.avatar.overlap}
            min={0}
            max={180}
            suffix="px"
            onChange={(v) => patch("profile.avatar.overlap", v)}
          />
        </Field>
        <Toggle
          label="Avatar shadow"
          checked={profile.avatar.shadow}
          onChange={(v) => patch("profile.avatar.shadow", v)}
        />
      </Section>

      <Section title={`Container Layout (${breakpoint})`}>
        <Field label="Layout Type">
          <Segmented
            size="sm"
            value={layoutType}
            options={[
              { value: "stack", label: "Stack" },
              { value: "grid", label: "Grid" },
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
            <Field label="Columns">
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
            <Field label="Gap">
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
            <Field label="Align Items">
              <Segmented
                size="sm"
                value={alignItems}
                options={[
                  { value: "start", label: "Start" },
                  { value: "center", label: "Center" },
                  { value: "stretch", label: "Stretch" },
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
            <Field label="Justify Items">
              <Segmented
                size="sm"
                value={justifyItems}
                options={[
                  { value: "start", label: "Start" },
                  { value: "center", label: "Center" },
                  { value: "stretch", label: "Stretch" },
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

      <Section title="Tip">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Select any element on the canvas to edit it here, or click its text to type directly on
          the page.
        </p>
      </Section>
    </div>
  );
}

function ItemsEditor({ block }: { block: TemplateBlock }) {
  const { dispatch } = useStudio();
  const items = block.content.items ?? [];
  const update = (next: BlockItem[]) =>
    dispatch({ type: "patchBlockField", id: block.id, path: "content.items", value: next });
  const supportsMediaPresentation = block.type === "links" || block.type === "buttonGroup";

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
                <Field label="Media position">
                  <Segmented
                    size="sm"
                    value={item.mediaPosition ?? "left"}
                    options={[
                      { value: "left", label: "Left" },
                      { value: "right", label: "Right" },
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
      <Section title={`Layout Constraints (${breakpoint})`}>
        <Field label="Max Width">
          <NumberSlider
            value={Number(constraints.maxWidth) || 0}
            min={0}
            max={1000}
            step={20}
            suffix={constraints.maxWidth ? "px" : "auto"}
            onChange={(v) => setResponsiveField("constraints.maxWidth", v > 0 ? v : null)}
          />
        </Field>
        <Field label="Min Height">
          <NumberSlider
            value={Number(constraints.minHeight) || 0}
            min={0}
            max={800}
            step={20}
            suffix={constraints.minHeight ? "px" : "auto"}
            onChange={(v) => setResponsiveField("constraints.minHeight", v > 0 ? v : null)}
          />
        </Field>
        <Field label="Aspect Ratio">
          <Segmented
            size="sm"
            value={constraints.aspectRatio ?? "auto"}
            options={[
              { value: "auto", label: "Auto" },
              { value: "1/1", label: "1:1" },
              { value: "16/9", label: "16:9" },
              { value: "9/16", label: "9:16" },
              { value: "4/3", label: "4:3" },
            ]}
            onChange={(v) => setResponsiveField("constraints.aspectRatio", v === "auto" ? null : v)}
          />
        </Field>
        <Field label="Overflow">
          <Segmented
            size="sm"
            value={constraints.overflow ?? "visible"}
            options={[
              { value: "visible", label: "Visible" },
              { value: "hidden", label: "Hidden" },
              { value: "clip", label: "Clip" },
              { value: "auto", label: "Auto" },
            ]}
            onChange={(v) => setResponsiveField("constraints.overflow", v)}
          />
        </Field>
      </Section>

      <Section title={`Positioning Overrides (${breakpoint})`}>
        {/* Overlap */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Visual Overlap</span>
            <Toggle
              checked={overlap.enabled ?? false}
              onChange={(v) => setResponsiveField("overlap.enabled", v)}
            />
          </div>
          {overlap.enabled && (
            <>
              <Field label="Overlap Amount">
                <NumberSlider
                  value={overlap.amount ?? 40}
                  min={0}
                  max={200}
                  step={4}
                  suffix="px"
                  onChange={(v) => setResponsiveField("overlap.amount", v)}
                />
              </Field>
              <Field label="Direction">
                <Segmented
                  size="sm"
                  value={overlap.direction ?? "top"}
                  options={[
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bottom" },
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                  onChange={(v) => setResponsiveField("overlap.direction", v)}
                />
              </Field>
            </>
          )}
        </div>

        {/* Offsets */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <span className="text-xs font-semibold block">Relative Offset</span>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Offset X">
              <NumberSlider
                value={offset.x ?? 0}
                min={-150}
                max={150}
                step={2}
                suffix="px"
                onChange={(v) => setResponsiveField("offset.x", v)}
              />
            </Field>
            <Field label="Offset Y">
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
        <Field label="Z-Index Layer">
          <Segmented
            size="sm"
            value={String(zIndex)}
            options={[
              { value: "0", label: "Base" },
              { value: "1", label: "L1" },
              { value: "2", label: "L2" },
              { value: "5", label: "L5" },
              { value: "10", label: "Top" },
            ]}
            onChange={(v) => setResponsiveField("zIndex", Number(v))}
          />
        </Field>
      </Section>

      <Section title={`Behavior Overrides (${breakpoint})`}>
        {/* Sticky */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Sticky Scroll</span>
            <Toggle
              checked={sticky.enabled ?? false}
              onChange={(v) => setResponsiveField("sticky.enabled", v)}
            />
          </div>
          {sticky.enabled && (
            <Field label="Top Offset">
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
            <span className="text-xs font-semibold">Fixed Floating Position</span>
            <Toggle
              checked={floating.enabled ?? false}
              onChange={(v) => setResponsiveField("floating.enabled", v)}
            />
          </div>
          {floating.enabled && (
            <>
              <Field label="Anchor Corner">
                <Segmented
                  size="sm"
                  value={floating.anchor ?? "bottom-right"}
                  options={[
                    { value: "top-left", label: "Top Left" },
                    { value: "top-right", label: "Top Right" },
                    { value: "bottom-left", label: "Btm Left" },
                    { value: "bottom-right", label: "Btm Right" },
                    { value: "bottom-center", label: "Btm Center" },
                  ]}
                  onChange={(v) => setResponsiveField("floating.anchor", v)}
                />
              </Field>
              <Field label="Edge Distance">
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

function HeroBlockInspector({ block }: { block: TemplateBlock }) {
  const { state, dispatch, breakpoint } = useStudio();
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
        title="Premium Hero"
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Duplicate"
              onClick={() => dispatch({ type: "duplicateBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => dispatch({ type: "deleteBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        <Field label="Hero Variant">
          <Segmented
            size="sm"
            value={block.variant ?? "centered"}
            options={[
              { value: "centered", label: "Centered" },
              { value: "split", label: "Split" },
              { value: "editorial", label: "Editorial" },
              { value: "full-image", label: "Full Image" },
            ]}
            onChange={(v) => dispatch({ type: "updateBlock", id: block.id, patch: { variant: v } })}
          />
        </Field>
      </Section>

      {/* Content Section */}
      <Section title="Text Content">
        <Field label="Eyebrow">
          <TextInput value={content.eyebrow ?? ""} onChange={(v) => field("content.eyebrow", v)} />
        </Field>
        <Field label="Title">
          <TextInput value={content.title ?? ""} onChange={(v) => field("content.title", v)} />
        </Field>
        <Field label="Subtitle">
          <TextInput
            value={content.subtitle ?? ""}
            onChange={(v) => field("content.subtitle", v)}
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={content.description ?? ""}
            onChange={(v) => field("content.description", v)}
            rows={3}
          />
        </Field>

        {/* Badge Sub-section */}
        <div className="mt-3 space-y-2 rounded-lg border border-border p-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Verification Badge</span>
            <Toggle
              checked={badge.enabled ?? false}
              onChange={(v) => field("content.badge.enabled", v)}
            />
          </div>
          {badge.enabled && (
            <Field label="Badge Label">
              <TextInput
                value={badge.label ?? ""}
                onChange={(v) => field("content.badge.label", v)}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* Avatar Section */}
      <Section title="Avatar Configuration">
        <AssetField
          label="Avatar Image"
          accept="image/*"
          value={avatar.url ?? ""}
          onChange={(v) => field("content.avatar.url", v)}
        />
        <Field label="Avatar Size">
          <NumberSlider
            value={currentAvatarSize}
            min={48}
            max={200}
            step={8}
            onChange={(v) => setResponsiveField("avatarSize", v)}
          />
        </Field>
        <Field label="Avatar Overlap">
          <NumberSlider
            value={avatar.overlap ?? 48}
            min={0}
            max={100}
            step={4}
            onChange={(v) => field("content.avatar.overlap", v)}
          />
        </Field>
        <Field label="Border Width">
          <NumberSlider
            value={avatar.borderWidth ?? 4}
            min={0}
            max={12}
            step={1}
            onChange={(v) => field("content.avatar.borderWidth", v)}
          />
        </Field>
        <Field label="Shadow">
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
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "hard", label: "Hard" },
            ]}
            onChange={(v) => field("content.avatar.shadow", v)}
          />
        </Field>
      </Section>

      {/* Banner & Background Section */}
      <Section title="Banner & Background">
        <AssetField
          label="Top Banner Image"
          accept="image/*"
          value={bannerImage.url ?? ""}
          onChange={(v) => field("content.bannerImage.url", v)}
        />
        {bannerImage.url && (
          <Field label="Banner Blur">
            <NumberSlider
              value={bannerImage.blur ?? 0}
              min={0}
              max={20}
              step={1}
              onChange={(v) => field("content.bannerImage.blur", v)}
            />
          </Field>
        )}

        <AssetField
          label="Full Background Image"
          accept="image/*"
          value={backgroundImage.url ?? ""}
          onChange={(v) => field("content.backgroundImage.url", v)}
        />
        {backgroundImage.url && (
          <Field label="Background Blur">
            <NumberSlider
              value={backgroundImage.blur ?? 0}
              min={0}
              max={20}
              step={1}
              onChange={(v) => field("content.backgroundImage.blur", v)}
            />
          </Field>
        )}
      </Section>

      {/* Layout Section */}
      <Section title={`Layout (${breakpoint})`}>
        <Field label="Alignment">
          <Segmented
            size="sm"
            value={currentAlign}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => setResponsiveField("align", v)}
          />
        </Field>
        <Field label="Hero Height (Min Height)">
          <NumberSlider
            value={currentMinHeight}
            min={200}
            max={700}
            step={20}
            suffix="px"
            onChange={(v) => setResponsiveField("minHeight", v)}
          />
        </Field>
        <Field label="CTA Buttons Direction">
          <Segmented
            size="sm"
            value={currentCtaDirection}
            options={[
              { value: "row", label: "Row" },
              { value: "column", label: "Column" },
            ]}
            onChange={(v) => setResponsiveField("ctaDirection", v)}
          />
        </Field>
      </Section>

      {/* Style & Appearance Section */}
      <Section title="Appearance">
        <Field label="Corner Radius">
          <NumberSlider
            value={block.style.radius ?? 24}
            min={0}
            max={48}
            onChange={(v) => field("style.radius", v)}
          />
        </Field>

        {/* Overlay Configuration */}
        <div className="mt-3 space-y-2 rounded-lg border border-border p-2 bg-muted/20">
          <span className="text-xs font-semibold">Overlay Control</span>
          <Field label="Overlay Type">
            <Segmented
              size="sm"
              value={overlay.type ?? "gradient"}
              options={[
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
              ]}
              onChange={(v) => field("style.overlay.type", v)}
            />
          </Field>
          <Field label="Opacity">
            <NumberSlider
              value={overlay.opacity ?? 0.4}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => field("style.overlay.opacity", v)}
            />
          </Field>
          {overlay.type === "gradient" && (
            <Field label="Gradient Direction">
              <Segmented
                size="sm"
                value={overlay.direction ?? "to-top"}
                options={[
                  { value: "to-top", label: "To Top" },
                  { value: "to-bottom", label: "To Bottom" },
                ]}
                onChange={(v) => field("style.overlay.direction", v)}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* Call to Actions (CTAs) */}
      <Section title="Actions (CTAs)">
        {/* Primary CTA */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10 mb-2">
          <span className="text-xs font-bold text-foreground">Primary CTA</span>
          <Field label="Label">
            <TextInput
              value={primaryCTA.label ?? ""}
              onChange={(v) => field("content.primaryCTA.label", v)}
            />
          </Field>
          <Field label="URL">
            <TextInput
              value={primaryCTA.url ?? ""}
              onChange={(v) => field("content.primaryCTA.url", v)}
            />
          </Field>
          <Field label="Icon">
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
        </div>

        {/* Secondary CTA */}
        <div className="space-y-2 rounded-lg border border-border p-2 bg-muted/10">
          <span className="text-xs font-bold text-foreground">Secondary CTA</span>
          <Field label="Label">
            <TextInput
              value={secondaryCTA.label ?? ""}
              onChange={(v) => field("content.secondaryCTA.label", v)}
            />
          </Field>
          <Field label="URL">
            <TextInput
              value={secondaryCTA.url ?? ""}
              onChange={(v) => field("content.secondaryCTA.url", v)}
            />
          </Field>
          <Field label="Icon">
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
        </div>
      </Section>

      <PositioningInspectorSection block={block} />

      {/* Visibility */}
      <Section title="Visibility">
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
              {key}
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
  const c = block.content;
  const field = (path: string, value: unknown) =>
    dispatch({ type: "patchBlockField", id: block.id, path, value });

  return (
    <div className="space-y-4">
      <Section title="Media Source">
        <Field label="Media Type">
          <Segmented
            size="sm"
            value={c.mediaType ?? "image"}
            options={[
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
            onChange={(v) => field("content.mediaType", v)}
          />
        </Field>
        {c.mediaType === "video" ? (
          <>
            <Field label="Video Provider">
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
            <Field label="Video ID or URL">
              <TextInput
                value={c.videoId ?? ""}
                placeholder="e.g. dQw4w9WgXcQ"
                onChange={(v) => field("content.videoId", v)}
              />
            </Field>
          </>
        ) : (
          <AssetField
            label="Image"
            accept="image/*"
            value={c.imageUrl ?? ""}
            onChange={(v) => field("content.imageUrl", v)}
          />
        )}
      </Section>

      <Section title="Media Content">
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
        <Field label="CTA Label">
          <TextInput
            value={c.ctaLabel ?? ""}
            placeholder="Button label"
            onChange={(v) => field("content.ctaLabel", v)}
          />
        </Field>
        <Field label="CTA URL">
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

function BlockInspector({ block }: { block: TemplateBlock }) {
  const { state, dispatch, breakpoint } = useStudio();
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
              title="Duplicate"
              onClick={() => dispatch({ type: "duplicateBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => dispatch({ type: "deleteBlock", id: block.id })}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        {definition && definition.variants.length > 1 && (
          <Field label="Variant">
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
                <Field label="Title">
                  <TextInput
                    value={content.title ?? ""}
                    onChange={(v) => field("content.title", v)}
                  />
                </Field>
              )}
              {has("subtitle") && (
                <Field label="Subtitle">
                  <TextInput
                    value={content.subtitle ?? ""}
                    onChange={(v) => field("content.subtitle", v)}
                  />
                </Field>
              )}
              {has("body") && (
                <Field label="Text">
                  <TextArea
                    value={content.body ?? ""}
                    onChange={(v) => field("content.body", v)}
                    rows={4}
                  />
                </Field>
              )}
              {has("label") && (
                <Field label="Button label">
                  <TextInput
                    value={content.label ?? ""}
                    onChange={(v) => field("content.label", v)}
                  />
                </Field>
              )}
              {has("url") && (
                <Field label="URL">
                  <TextInput value={content.url ?? ""} onChange={(v) => field("content.url", v)} />
                </Field>
              )}
              {has("imageUrl") && (
                <AssetField
                  label="Image"
                  accept="image/*"
                  value={content.imageUrl ?? ""}
                  onChange={(v) => field("content.imageUrl", v)}
                />
              )}
              {has("videoId") && (
                <Field label="Video ID or URL">
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
                  <Field label="File name">
                    <TextInput
                      value={content.fileName ?? ""}
                      onChange={(v) => field("content.fileName", v)}
                    />
                  </Field>
                  <AssetField
                    label="File"
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
          <Section title="Items">
            <ItemsEditor block={block} />
          </Section>
        )}
      {content.socials && (
        <Section title="Socials">
          <SocialsEditor block={block} />
        </Section>
      )}

      <Section title={`Layout (${breakpoint})`}>
        <Field label="Alignment">
          <Segmented
            size="sm"
            value={currentAlign}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => setResponsiveField("align", v)}
          />
        </Field>
        <Field label="Width">
          <Segmented
            size="sm"
            value={block.layout.width ?? "content"}
            options={[
              { value: "content", label: "Content" },
              { value: "full", label: "Full" },
            ]}
            onChange={(v) => field("layout.width", v)}
          />
        </Field>
        <Field label="Grid span">
          <Segmented
            size="sm"
            value={String(block.layout.span ?? 2)}
            options={[
              { value: "1", label: "Half" },
              { value: "2", label: "Full" },
            ]}
            onChange={(v) => field("layout.span", Number(v))}
          />
        </Field>
        {block.type === "buttonGroup" ? (
          <Field label="Button columns">
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
            <Field label="Column Span">
              <NumberSlider
                value={currentColSpan}
                min={1}
                max={4}
                step={1}
                onChange={(v) => setResponsiveField("colSpan", v)}
              />
            </Field>
            <Field label="Row Span">
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
        <Field label="Order">
          <NumberSlider
            value={currentOrder}
            min={0}
            max={30}
            step={1}
            onChange={(v) => setResponsiveField("order", v)}
          />
        </Field>
      </Section>

      <Section title={`Style (${breakpoint})`}>
        <Field
          label="Background override"
          action={
            block.style.background !== undefined && (
              <button
                type="button"
                onClick={() => field("style.background", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset
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
          label="Text color override"
          action={
            block.style.textColor !== undefined && (
              <button
                type="button"
                onClick={() => field("style.textColor", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset
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
          label="Corner radius override"
          action={
            block.style.radius !== undefined && (
              <button
                type="button"
                onClick={() => field("style.radius", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset
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
          label="Shadow override"
          action={
            block.style.shadow !== undefined && (
              <button
                type="button"
                onClick={() => field("style.shadow", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset
              </button>
            )
          }
        >
          <Segmented
            size="sm"
            value={block.style.shadow ?? "theme"}
            options={[
              { value: "theme", label: "Theme" },
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "elevated", label: "Elev" },
              { value: "floating", label: "Float" },
              { value: "glow", label: "Glow" },
            ]}
            onChange={(v) => field("style.shadow", v === "theme" ? undefined : v)}
          />
        </Field>
        <Field
          label="Border width override"
          action={
            block.style.borderWidth !== undefined && (
              <button
                type="button"
                onClick={() => field("style.borderWidth", undefined)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset
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
        <Field label="Accent color">
          <ColorInput
            value={block.style.accentColor ?? state.config.theme.colors.accent}
            onChange={(v) => field("style.accentColor", v)}
          />
        </Field>
        <Field label="Decorative frame">
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            value={block.style.frame ?? "none"}
            onChange={(e) => field("style.frame", e.target.value)}
          >
            {[
              ["none", "None"],
              ["hairline", "Hairline"],
              ["double", "Double"],
              ["inset", "Inset"],
              ["gradient", "Gradient"],
              ["luxury", "Luxury"],
              ["glow", "Glow"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Padding">
          <NumberSlider
            value={currentPadding}
            min={0}
            max={48}
            onChange={(v) => setResponsiveField("padding", v)}
          />
        </Field>
        <Field label="Animation">
          <Segmented
            size="sm"
            value={block.interaction.animation ?? "soft-rise"}
            options={[
              { value: "none", label: "None" },
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
              { value: "soft-rise", label: "Rise" },
            ]}
            onChange={(v) => field("interaction.animation", v)}
          />
        </Field>
      </Section>

      <PositioningInspectorSection block={block} />

      {/* ---- Local Motion Overrides ---- */}
      <Section title="Motion">
        <Toggle
          label="Use global motion"
          checked={block.motion?.useGlobal !== false}
          onChange={(v) => field("motion.useGlobal", v)}
        />
        {block.motion?.useGlobal === false && (
          <>
            <Toggle
              label="Disable motion"
              checked={block.motion?.disableMotion === true}
              onChange={(v) => field("motion.disableMotion", v)}
            />
            {!block.motion?.disableMotion && (
              <>
                <Field label="Entrance override">
                  <Segmented
                    value={(block.motion?.entrance ?? "soft-rise") as EntrancePreset}
                    options={ENTRANCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(v) => field("motion.entrance", v)}
                    size="sm"
                  />
                </Field>
                <Field label="Hover override">
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

      <Section title="Visibility">
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
              {key}
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
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto">
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
