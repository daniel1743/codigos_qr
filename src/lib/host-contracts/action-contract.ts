/**
 * Host action vocabulary shared by future generated pages and renderers.
 * These are semantics, not provider integrations or booking/form storage.
 */
export type CripqerActionTypeV1 =
  "external_url" | "whatsapp" | "phone" | "email" | "social" | "booking" | "form" | "section";

export interface CripqerActionV1 {
  readonly type: CripqerActionTypeV1;
  readonly label: string;
  readonly destination: string;
  readonly sectionId?: string;
}

export interface CripqerActionHostPolicyV1 {
  readonly type: CripqerActionTypeV1;
  readonly currentResolution:
    | "external_href"
    | "whatsapp_href"
    | "tel_href"
    | "mailto_href"
    | "internal_section"
    | "not_implemented";
  readonly persistence: "none" | "future_host_defined";
  readonly validation: readonly string[];
}

export const CRIPQER_ACTION_HOST_POLICY_V1: readonly CripqerActionHostPolicyV1[] = [
  {
    type: "external_url",
    currentResolution: "external_href",
    persistence: "none",
    validation: ["http/https URL allowlist"],
  },
  {
    type: "whatsapp",
    currentResolution: "whatsapp_href",
    persistence: "none",
    validation: ["phone normalization", "https://wa.me destination"],
  },
  {
    type: "phone",
    currentResolution: "tel_href",
    persistence: "none",
    validation: ["telephone destination normalization"],
  },
  {
    type: "email",
    currentResolution: "mailto_href",
    persistence: "none",
    validation: ["email address validation"],
  },
  {
    type: "social",
    currentResolution: "external_href",
    persistence: "none",
    validation: ["recognized platform or safe external URL"],
  },
  {
    type: "booking",
    currentResolution: "external_href",
    persistence: "none",
    validation: ["external booking URL required"],
  },
  {
    type: "form",
    currentResolution: "not_implemented",
    persistence: "future_host_defined",
    validation: ["endpoint, payload, spam protection and notification owner required"],
  },
  {
    type: "section",
    currentResolution: "internal_section",
    persistence: "none",
    validation: ["sectionId must resolve within the same page"],
  },
] as const;
