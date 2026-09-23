TASK:
  id: "CRIPQER_MAGIC_CARD_PHASE_2B_REAL_CONTROLS_WIRING_V1"
  project: "CRIPQER"
  mode: "TARGETED_CONTEXTUAL_CONTROL_WIRING"

OBJECTIVE: >
  Mantener EXACTAMENTE la tarjeta y toolbar que ya aprobaron visualmente
  y conectar sus controles visibles a las autoridades reales de Cripqer.

ABSOLUTE_FREEZE:
  - "PremiumProductCardMagicV1 visual"
  - "toolbar visual"
  - "toolbar dimensions"
  - "toolbar positioning"
  - "card proportions"
  - "Premium Page Canvas"

DO_NOT_REDESIGN:
  true

CONTROLS_TO_WIRE:

  title:
    - "inline text"
    - "font family"
    - "font size"
    - "color"
    - "bold"
    - "italic"
    - "alignment"

  description:
    - "inline text"
    - "font family"
    - "font size"
    - "color"
    - "weight"
    - "alignment"

  price:
    - "direct value"
    - "font size"
    - "color"
    - "weight"
    - "alignment"

  image:
    - "Cambiar imagen"
    - "Quitar"

  cta:
    - "label"
    - "URL"
    - "color"
    - "style"
    - "alignment"

  card:
    - "background"
    - "border"
    - "radius"

DISABLED_UNTIL_REAL_AUTHORITY_EXISTS:
  - "crop"
  - "image position"
  - "move"
  - "detail"
  - "advanced effects"

CANONICAL_STATE:
  MUST_USE:
    - "existing blockId"
    - "existing itemId"
    - "existing field selection"
    - "templateReducer"
    - "existing history"
    - "existing TypographyOverride/style authority"

  MUST_NOT:
    - "store real values only in local component state"
    - "fake working controls"
    - "change DOM without canonical persistence"

RUNTIME_REQUIRED:

  sequence:
    - "change title text"
    - "change title size"
    - "change title color"
    - "undo"
    - "redo"
    - "change description"
    - "change price"
    - "change CTA label"
    - "change CTA URL"
    - "change CTA color"
    - "remove image"
    - "undo image removal"
    - "change card background"
    - "save"
    - "reload"

  after_reload:
    require:
      - "all canonical changes remain"

CRITICAL_RULE: >
  A control is not considered implemented because it renders,
  receives clicks or changes local state.

  PASS requires:
  UI -> canonical reducer/state -> history -> save -> reload.

SUCCESS_GATE:
  "CRIPQER_MAGIC_CARD_PHASE_2B_REAL_CONTROLS_PASS_FROZEN"

AFTER_SUCCESS:
  next:
    "CRIPQER_MAGIC_CARD_PHASE_3_DUPLICATION_AND_GRID_V1"

STOP_AFTER:
  true