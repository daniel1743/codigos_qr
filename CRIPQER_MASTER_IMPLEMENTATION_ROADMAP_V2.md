# CRIPQER — MASTER IMPLEMENTATION ROADMAP V2

> **Purpose.** One clear execution sheet: what Cripqer is becoming, why it exists, its real
> differentiator, the benefits it delivers, the quality of service it must meet, what is already
> built, what is active, and what remains.
>
> **Authority note.** This is an *execution/roadmap synthesis*. It does **not** replace
> `CRIPQER_OFFICIAL_PRODUCT_VISION.md` (canonical product vision) nor
> `CRIPQER_EDITOR_EXPERIENCE_STRATEGY.md` (concurrent editor strategy work). Superseded
> strategies are recorded here rather than silently deleted.

---

## 1. WHAT CRIPQER IS

> **Cripqer is a Smart Conversion Platform for small businesses, independent professionals and
> entrepreneurs.**

It turns attention arriving from Instagram, TikTok, Google, advertising, referrals, links, QR
codes and physical interactions into **measurable business opportunities and outcomes**.

Cripqer's purpose is **not** simply to create pages, generate QR codes, display links or count
clicks. Its purpose is to **reduce the loss of customer intent** between the moment somebody
becomes interested and the moment that interest becomes a conversation, lead, booking,
quotation, purchase, visit or other measurable business outcome.

### Thesis

- **Primary:** Cripqer competes against **lost customer intent**, not primarily against Linktree.
- **Refined:** Cripqer must reduce **intent leakage between SOURCE and OUTCOME**.

---

## 2. PRODUCT BENEFITS

| # | Capability | Benefit |
|---|---|---|
| 1 | **Create** | Give a small business a professional conversion experience without requiring web-development expertise. |
| 2 | **Attract** | Let traffic arrive through pages, links, QR codes, campaigns, physical material, social media and referrals. |
| 3 | **Understand** | Preserve what the visitor was interested in, where they came from, what product/service they viewed and what they wanted to do. |
| 4 | **Handoff** | Send the visitor toward WhatsApp, booking, calling or payment *with context* instead of forcing the business to restart the conversation from zero. |
| 5 | **Capture** | Turn anonymous interest into a manageable opportunity whenever the visitor voluntarily identifies or performs a qualifying action. |
| 6 | **Act** | Tell the business what needs attention now instead of requiring the owner to interpret complicated dashboards. |
| 7 | **Recover** | Reduce forgotten leads, abandoned quotations, samples without follow-up and opportunities buried inside WhatsApp. |
| 8 | **Attribute** | Connect campaigns, QR codes, links, products and touchpoints with confirmed outcomes whenever sufficient evidence exists. |
| 9 | **Learn** | Eventually learn which *source + intent + offer + CTA + handoff* combinations generate real business outcomes. |

---

## 3. DIFFERENTIATION

### What is NOT the moat

QR generation by itself · Link-in-Bio by itself · more templates · more editor effects · basic
analytics · visit/click/scan dashboards · generic AI copy generation · a mini CRM by itself · a
chatbot by itself.

### The actual connected value

```
SOURCE → TOUCHPOINT → CONTEXT → INTENT → EXPERIENCE / DIRECT HANDOFF
        → LEAD → NEXT ACTION → OUTCOME → ATTRIBUTION → LEARNING
```

> **Important:** a PAGE is one *available conversion experience*, not a mandatory step in every
> future journey.

### Example journeys

**Page flow**
```
QR → Cripqer Page → service → price → intent → WhatsApp → lead → outcome
```

**Direct flow**
```
Meta Ad / Smart Link / QR → known context → WhatsApp → lead → outcome
```

---

## 4. QUALITY OF SERVICE

| Principle | Rule |
|---|---|
| **Simplicity** | A small-business owner must receive useful value without learning enterprise CRM terminology. |
| **Mobile-first** | Core workflows must be practical from a phone; many target users run their business from mobile. |
| **Low setup** | Minimize API keys, complicated configuration, integrations and technical onboarding. |
| **Data preservation** | User-created work is never destroyed simply because UI, editor mode or subscription capability changes. |
| **Truthful attribution** | Never invent certainty; distinguish deterministic, probable, manual and unknown evidence. |
| **Stable identity** | Public IDs, URLs and QR destinations should remain stable wherever architecture permits. |
| **Integration over rebuilding** | Integrate WhatsApp, AgendaPro, Calendly, Mercado Pago, Stripe — don't rebuild them without strategic justification. |
| **Canonical integrity** | One canonical document, one production renderer, one primary generation architecture. |
| **Task-driven UX** | Backend may be event-driven; the owner-facing experience should be task-driven. |
| **Reliability** | Create, edit, save, reopen, preserve, publish and public rendering must be dependable before cosmetic expansion. |
| **Privacy** | Track first-party context and consented actions without pretending to silently read private WhatsApp conversations. |

**Task-driven UX — preferred phrasing:**
- "3 personas necesitan seguimiento hoy."
- "2 cotizaciones están esperando respuesta."
- "Este QR produjo 4 compras."

**Avoid:**
- "1,843 events" · "CTR 4.23%" · "927 anonymous sessions"

---

## 5. EDITOR STRATEGY — NEW AUTHORITY

**Status: DECISION FROZEN / IMPLEMENTATION PENDING POST-PAGES.**

Supersedes: "Basic and Power as permanent independent products" and the "permanent dual-editor
preservation architecture".

```
CANONICAL DOCUMENT
      ↓
  EDITOR CORE
   ├─ QUICK EDIT
   └─ ADVANCED EDIT
      ↓
  SAME PERSISTENCE
      ↓
  SAME RENDERER
```

- **Power** → future role: **Editor Core / Advanced experience**.
- **Basic** → current role: **legacy temporary compatibility surface**.
- **Quick Edit** → future role: simplified experience over the same Editor Core.

**Permanent rules**
- Quick Edit only performs targeted safe patches.
- Quick Edit never destructively rewrites the whole document.
- Unknown advanced properties are preserved.
- Capability lock ≠ data deletion.
- Subscription downgrade never destroys Premium configuration.
- Basic legacy is removed only after Quick Edit is proven.
- Founding/Beta users initially receive full Advanced access.
- Final Free/Pro matrix is decided from real usage evidence.

---

## 6. CONVERSION CORE

**Status: STRATEGY DEFINED / IMPLEMENTATION POST-CREATION-CORE.**

> One shared Conversion Core. Do not create ten disconnected production engines.

```
TOUCHPOINT → SESSION → INTENT → HANDOFF → LEAD → NEXT ACTION → OUTCOME → ATTRIBUTION
```

### P0

| Component | Status | Purpose |
|---|---|---|
| Touchpoint/Event Core | 🆕 NEW / PENDING | identify QR, Smart Link, campaign, location, seller, product, sample, flyer, referral |
| Intent | ⏳ PLANNED | price, availability, booking, quotation, purchase, information |
| Contextual Handoff | ⏳ PLANNED | preserve source/product/service/intent when handing to WhatsApp or specialist service |
| Lead Operating Layer | ⏳ PLANNED | identity, source, intent, status, next action, date, outcome, notes — **NOT a full CRM** |
| Next Action | 🆕 NEW / PENDING | surface what the owner must do next |
| Outcome one-tap | 🆕 NEW / PENDING | won/purchased, booked, waiting, lost, visited, redeemed — V1 manual confirmation allowed |
| Lead Rescue | ⏳ PLANNED | surface opportunities that are cooling down or being forgotten |

### P1

| Component | Status |
|---|---|
| Outcome Attribution | ⏳ PLANNED |
| Attribution Confidence | 🆕 NEW (DETERMINISTIC / PROBABLE / MANUAL / UNKNOWN) |
| Smart Links | 🆕 NEW |
| QR Campaign Intelligence | ⏳ PLANNED |
| Sample Follow-up Loop | 🧪 CANDIDATE PILOT #1 |
| Quotation Lead Rescue | 🧪 CANDIDATE PILOT #2 |

**Pilot #1 — Sample Follow-up Loop:** SAMPLE/KIT → seller+products+date → UNIQUE QR → scan →
product info → intent → contextual WhatsApp → lead → next action → outcome. Use cases:
supplements, cosmetics, wellness, direct sales, product sampling.

**Pilot #2 — Quotation/WhatsApp Lead Rescue:** photographers, home services, consultants,
independent professionals, real estate.

### FUTURE

| Component | Status | Note |
|---|---|---|
| Meta CTWA/CAPI Bridge | 🆕 FUTURE HIGH-VALUE | depends on Conversion Core; must not make Cripqer structurally dependent on Meta |
| Booking integrations | ⏳ PENDING | integrate, do not rebuild |
| Payment integrations | ⏳ PENDING | integrate, do not become a processor |
| Intent routing | ⏳ PENDING | — |
| Vertical Action Packs | FUTURE | prerequisite: real pilot evidence |
| Conversion Learning | FUTURE | prerequisite: reliable longitudinal outcome history |
| AI Recommendations | FUTURE / DEFER | prerequisite: sufficient reliable conversion data |

---


## 7. ADVANCED ANALYTICS POSITION

- **Current:** external system exists, not yet integrated.
- **Roadmap status:** PENDING INTEGRATION.
- **Strategic rule:** do not treat Advanced Analytics itself as Cripqer's wedge.

Integrate **after** the Event/Touchpoint model and the Outcome model.

**Evolution**

```
OLD:    visits · clicks · CTR · scans
TARGET: source → intent → CTA/handoff → lead → next action → outcome
```

**Desired answers:** Which QR produced customers? Which campaign generated bookings? Which offer
creates interest but fails before purchase? Which leads require follow-up today? Which source
produced confirmed revenue?

---

## 8. DO NOT BUILD AS CORE

full CRM · complete WhatsApp replacement · universal booking platform · payment processor · POS ·
complete ERP · generic chatbot · generic analytics dashboard as differentiator · generic AI page
builder as differentiator · full ecommerce platform.

---

## 9. IMPLEMENTATION STATUS

**Legend:** ✅ PASS / FROZEN · 🟢 IMPLEMENTED · 🟡 EN EJECUCIÓN · ➡️ PRÓXIMO · 🆕 NUEVO · ⏳
PENDIENTE · 🧪 PILOT · 🚫 AVOID · 🔴 BLOQUEADO · ⚪ NOT_VERIFIED

### Infrastructure
- Supabase baseline — ✅ PASS / FROZEN
- Billing persistence — ✅ PASS / FROZEN
- Storage bootstrap — ✅ PASS / FROZEN
- Analytics security hardening — ⏳ PENDIENTE

### Pages
- Pages 0 (data contract) — ✅
- Pages 1 (create/list/detail) — ✅
- Pages 2 (Power document adapter) — ✅
- Pages 3 (save/publish) — ✅
- Pages 3B (canonical integrity) — ✅
- Pages 4A (public read contract) — ✅
- Pages 4B (public child route) — ✅ PASS / FROZEN
- Pages 5 (per-page QR) — ✅ PASS / FROZEN
- Pages 6 (alias/custom link) — ✅ PASS / FROZEN
- Pages 7 (Page Generator integration) — ✅ PASS / FROZEN

### QR
- QR Studio — implemented/connected, final runtime verification pending
- Per-page QR — current task
- QR Campaign Intelligence — future Conversion Core

### External systems
- Page Generator / Engine V2 package — ✅ INTEGRATED (PAGES_7 PASS / FROZEN)
- Advanced Analytics package — EXISTS / INTEGRATION PENDING

### Editor
- Power → future Editor Core
- Basic → legacy temporary
- Quick Edit — pending
- Advanced Edit — pending
- Single canonical document — approved
- Safe patch architecture — pending
- Founding Access — approved strategy

### Conversion
- Touchpoint/Event Core — NEW
- Intent — planned
- Contextual Handoff — planned
- Lead Operating Layer — planned
- Next Action — NEW
- Outcome one-tap — NEW
- Lead Rescue — planned
- Outcome Attribution — planned
- Attribution Confidence — NEW
- Smart Links — NEW
- Sample Follow-up Loop — NEW
- Quotation Lead Rescue pilot — NEW
- Meta CTWA/CAPI Bridge — NEW/FUTURE
- Booking/payment connectors — pending
- Conversion Learning — future
- AI Recommendations — future

---

## 10. MASTER EXECUTION ORDER

```
PRODUCT MODEL:  CREATE → CONVERT → LEARN
```

### ERA 1 — CREATE
```
Pages 5 → Pages 6 → Pages 7 → QR Studio final runtime → Onboarding V2 → Engine V2
→ Power/mobile functional closure
→ Editor convergence (Editor Core, Quick Edit, Advanced Edit)
→ Full Creation Core round-trip
→ CREATION CORE COMPLETE
```

### ERA 2 — CONVERT
```
Event/Touchpoint Core → Intent → Contextual Handoff → Lead Operating Layer
→ Next Action → Outcome one-tap → Lead Rescue
→ Source → Outcome Attribution → Outcome-first Analytics
→ PILOT #1 Sample Follow-up Loop   ·   PILOT #2 Quotation / WhatsApp Lead Rescue
→ QR Campaign Intelligence → Booking/payment webhooks
→ Meta CTWA/CAPI → Optional WhatsApp Platform integration
```

### ERA 3 — LEARN
```
Vertical Action Packs → Conversion Learning → AI Recommendations → Optimization loops
```

---

