TASK:
  id: "CRIPQER_PHASE_8_RUNTIME_CERTIFICATION_RESUME_V2"
  project: "CRIPQER"
  mode: "RUNTIME_CERTIFICATION"
  language: "es"

PARENT_GATE:
  "CRIPQER_POWER_EDITOR_TEMPLATE_PRODUCTIZATION_RUNTIME_PASS_FROZEN"

NEWLY_CLOSED_GATES:
  - "CRIPQER_P1_CHILD_PAGE_PUBLISH_PERSISTENCE_FIXED_FROZEN"
  - "CRIPQER_CATALOG_AND_PAGE_PUBLISH_CONTRACT_VERIFIED"

CONFIRMED_RUNTIME:
  catalog:
    starter_semantics: "PASS"
    persistence_reload: "PASS"
    publish: "PASS"
    public_route: "PASS"

  portfolio:
    starter_semantics: "PASS"
    distinct_from_catalog: "PASS"

  child_publish:
    single_publish_single_revision: "PASS"
    snapshot: "PASS"
    main_bio_isolation: "PASS"
    main_qr_isolation: "PASS"

OBJECTIVE: >
  Reanudar únicamente los gates runtime restantes de Phase 8.
  No reabrir Catalog/Publish salvo regresión nueva demostrada.

CODE_POLICY:
  default: "FROZEN"

  repair_only_if:
    "runtime reproduce un defecto concreto"

DO_NOT_REPEAT:
  - "Catalog starter certification"
  - "Catalog publish contract"
  - "public_id investigation"
  - "child public route investigation"
  - "revision monotonicity"
  - "Bio isolation"
  - "QR isolation"

# ------------------------------------------------------------
# GATE A — RESTAURANT STARTER FRESH RUNTIME
# ------------------------------------------------------------

RESTAURANT_RUNTIME:

  reason: >
    Las páginas antiguas fueron creadas antes del último cleanup semántico.
    Se necesita una página fresca posterior al fix.

  create_through:
    "/pages/new"

  title:
    "QA Menu Clean Final"

  type:
    "Menú"

  require:
    - "Restaurant Visual / menu starter correcto"
    - "sin Creative Director"
    - "sin Shop"
    - "sin texto creator residual"
    - "semántica restaurante coherente"
    - "hard reload preserva contenido"

  gate:
    "CRIPQER_RESTAURANT_VISUAL_TRUE_MENU_STARTER_RUNTIME_PASS"

# ------------------------------------------------------------
# GATE B — CONTEXTUAL SELECTION RESPONSIVE
# ------------------------------------------------------------

CONTEXTUAL_SELECTION:

  desktop:
    require:
      - "selección de child item"
      - "reorder conserva identidad"
      - "inspector apunta al item correcto"

  mobile:
    widths:
      - 360
      - 390
      - 430

    require:
      - "canvas sigue utilizable"
      - "selección contextual funciona"
      - "controles no ocultan permanentemente canvas"
      - "sin crash"

# ------------------------------------------------------------
# GATE C — CTA EDITOR/PUBLIC PARITY
# ------------------------------------------------------------

CTA_PARITY:

  verify:
    - "ButtonGroup item CTA"
    - "ProductGrid item CTA"
    - "Hero CTA"
    - "shared/block fallback"

  require:
    - "editor preview coincide con public renderer"
    - "destination preservado"
    - "item override precedence correcta"

# ------------------------------------------------------------
# GATE D — HOVER / MOTION / REDUCED MOTION
# ------------------------------------------------------------

MOTION:

  desktop_pointer:
    require:
      - "hover afecta child interactivo"
      - "no transforma container completo"

  reduced_motion:
    require:
      - "animaciones reducidas/desactivadas según contrato"
      - "sin pérdida funcional"

  touch:
    require:
      - "hover no queda sticky"

# ------------------------------------------------------------
# GATE E — KEYBOARD / FOCUS
# ------------------------------------------------------------

KEYBOARD:

  require:
    - "focus-visible observable"
    - "controles principales accesibles por teclado"
    - "no focus trap accidental"
    - "acciones esenciales alcanzables"

# ------------------------------------------------------------
# GATE F — PUBLIC PARITY
# ------------------------------------------------------------

PUBLIC_PARITY:

  require:
    - "documento publicado usa snapshot publicado"
    - "no muestra chrome/editor controls"
    - "contenido principal coincide con preview esperado"
    - "CTA funcionales"
    - "media correcta"
    - "sin crash"

# ------------------------------------------------------------
# RESULT CLASSIFICATION
# ------------------------------------------------------------

EACH_GATE:
  allowed:
    - "PASS"
    - "FAIL"
    - "BLOCKED"
    - "NOT_VERIFIED"

RULE:
  "No convertir static/code/test PASS en runtime PASS."

IF_AUTOMATION_FAILS:
  classify:
    "BLOCKED_AUTOMATION"

  rule:
    "No modificar producto por falla del debugger."

FINAL_SUCCESS_REQUIRES:
  - "Restaurant fresh runtime PASS"
  - "Contextual selection desktop/mobile PASS"
  - "CTA parity PASS"
  - "Motion/reduced-motion PASS"
  - "Keyboard/focus PASS"
  - "Public parity PASS"
  - "ZERO known P0"
  - "ZERO release-blocking P1"

FINAL_GATE:
  "CRIPQER_POWER_EDITOR_TEMPLATE_PRODUCTIZATION_RUNTIME_PASS_FROZEN"

STOP_AFTER:
  true