import type {
  CripqerRendererCapabilitiesV1,
  RendererRequirementsValidationV1,
  RendererRuntimeContextV1,
} from "../renderer-capabilities";
import type { OverrideKey, PageRecipeV1 } from "../parametric-engine";
import type { BasicTemplateConfig, SocialPlatform } from "@/types/basic-templates";
import type { CardCtaLabel } from "@/types/basic-templates";

export type BasicEditorAdapterStatus = "compatible" | "compatible_with_downgrade" | "incompatible";

export interface BasicEditorAdapterLinkV1 {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly platform?: string;
  readonly description?: string;
  /** Declared media only. The adapter never manufactures image assets. */
  readonly imageUrl?: string;
  /** Optional renderer-approved CTA copy for this card. */
  readonly cardCtaLabel?: CardCtaLabel;
}

export interface BasicEditorAdapterSocialV1 {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly url: string;
}

export interface BasicEditorAdapterContentV1 {
  readonly links: readonly BasicEditorAdapterLinkV1[];
  readonly socials?: readonly BasicEditorAdapterSocialV1[];
  readonly footerText?: string;
  /**
   * Lab/application-owned copy for the primary action. The frozen Engine still
   * owns action type, destination, hierarchy and its canonical recipe label.
   */
  readonly primaryAction?: {
    readonly label: string;
    readonly description?: string;
    readonly cardCtaLabel?: CardCtaLabel;
    /** Preserve the Engine label even when it is generic. */
    readonly locked?: boolean;
  };
}

export interface BasicEditorCtaProjectionV1 {
  readonly originalLabel: string;
  readonly fixturePreferredLabel: string | null;
  readonly renderedLabel: string;
  readonly classification: "high_information" | "low_information";
  readonly contextualizationApplied: boolean;
  readonly reason:
    | "generic_engine_label_contextualized"
    | "low_information_engine_label_contextualized"
    | "engine_label_specific"
    | "high_information_engine_label_preserved"
    | "low_information_engine_label_preserved"
    | "cta_locked"
    | "no_contextual_label";
}

export type BasicEditorMediaSourceTypeV1 =
  "real_image" | "platform_icon" | "generic_fallback" | "none";

export interface BasicEditorAdapterMediaDiagnosticV1 {
  readonly id: string;
  readonly platform: string | null;
  readonly sourceType: BasicEditorMediaSourceTypeV1;
  readonly effectiveMediaMode: "image" | "platform_icon" | "none";
  readonly mediaPosition: "right" | "bottom" | "none";
  readonly reason: string;
}

export interface BasicEditorContrastCheckV1 {
  readonly id: string;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number | null;
  readonly threshold: number;
  readonly size: "normal" | "large";
  readonly status: "PASS" | "FAIL" | "NOT_VERIFIABLE";
  readonly trace: readonly string[];
}

export interface BasicEditorContrastValidationV1 {
  readonly status: "PASS" | "FAIL" | "NOT_VERIFIABLE";
  readonly checks: readonly BasicEditorContrastCheckV1[];
  readonly rejectedForContrast: boolean;
}

export interface BasicEditorAdapterInputV1 {
  readonly recipe: PageRecipeV1;
  readonly templateId: string;
  readonly capabilities: CripqerRendererCapabilitiesV1;
  readonly content: BasicEditorAdapterContentV1;
  readonly runtimeContext?: RendererRuntimeContextV1;
  /** Locks live in Engine options, not PageRecipeV1, so callers carry them here. */
  readonly lockedOverrides?: readonly OverrideKey[];
}

export interface BasicEditorAdapterIssueV1 {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface BasicEditorAdapterDowngradeV1 {
  readonly code: string;
  readonly path: string;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
}

export interface BasicEditorRecipeProjectionV1 {
  readonly heroMode: PageRecipeV1["structure"]["hero"]["mode"];
  readonly identityAlignment: string;
  readonly linksPresentation: "buttons" | "cards" | "mixed";
  readonly primaryActionPresentation: "button" | "professional_card";
  readonly background: string;
  readonly headingFont: string;
  readonly bodyFont: string;
  readonly density: "compact" | "standard" | "generous";
  readonly avatarShape: "circle" | "rounded" | "square" | "none";
  readonly buttonVariant: "solid" | "outline" | "soft";
  readonly buttonRadius: "none" | "rounded" | "full";
  readonly cardMediaPosition: "right" | "bottom" | "none";
  readonly visibleBlockTypes: readonly string[];
}

export interface BasicEditorAdapterBaseResultV1 {
  readonly status: BasicEditorAdapterStatus;
  readonly renderable: boolean;
  readonly templateId: string;
  readonly projection: BasicEditorRecipeProjectionV1 | null;
  readonly requirementsValidation: RendererRequirementsValidationV1;
  readonly downgrades: readonly BasicEditorAdapterDowngradeV1[];
  readonly warnings: readonly string[];
  readonly errors: readonly BasicEditorAdapterIssueV1[];
  readonly unsupportedCapabilities: readonly string[];
  readonly ctaProjection: BasicEditorCtaProjectionV1 | null;
  readonly mediaDiagnostics: readonly BasicEditorAdapterMediaDiagnosticV1[];
  readonly contrast: BasicEditorContrastValidationV1 | null;
}

export interface BasicEditorAdapterSuccessV1 extends BasicEditorAdapterBaseResultV1 {
  readonly status: "compatible" | "compatible_with_downgrade";
  readonly renderable: true;
  readonly projection: BasicEditorRecipeProjectionV1;
  readonly config: BasicTemplateConfig;
}

export interface BasicEditorAdapterFailureV1 extends BasicEditorAdapterBaseResultV1 {
  readonly status: "incompatible";
  readonly renderable: false;
  readonly config?: never;
}

export type BasicEditorAdapterResultV1 = BasicEditorAdapterSuccessV1 | BasicEditorAdapterFailureV1;

export interface BasicEditorTemplateEvaluationV1 {
  readonly templateId: string;
  readonly templateName: string;
  readonly result: BasicEditorAdapterResultV1;
}
