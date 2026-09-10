# CRIPQER - PRODUCT NORTH STAR

Status: AUTHORITATIVE STRATEGIC REFERENCE  
Version: V1  
Date: 2026-09-09  
Repository: `daniel1743/codigos_qr`  
Branch: `feat/basic-editor-editorial-canvas-ui`

---

## PURPOSE OF THIS DOCUMENT

This document defines Cripqer's strategic product direction for human developers,
Codex, Cline, AntiGravity, and future AI agents.

It explains what Cripqer is trying to become, what market problem it should
compete against, which product systems matter, and which boundaries must be
preserved.

THIS DOCUMENT DESCRIBES PRODUCT DIRECTION.

IT DOES NOT AUTHORIZE IMPLEMENTATION.

RELATED DOES NOT MEAN AUTHORIZED.

Repository remains frozen by default.

An agent must only modify files explicitly authorized by the active task.

See also: [CRIPQER_STATUS_2026-09-09.md](./CRIPQER_STATUS_2026-09-09.md)

## WHAT CRIPQER IS

Cripqer is evolving from QR + Link-in-Bio + page editing into a Smart Conversion
Page Platform and Intent-to-Outcome layer for businesses and professionals that
convert social and physical traffic into customers.

It is not just a QR image generator, not just a profile page, and not just a
visual editor.

## WHAT CRIPQER IS BECOMING

Cripqer is becoming a conversion-oriented page and workflow layer that helps a
business understand why a visitor arrived, present the right next action,
preserve context when the visitor moves to another channel, measure the final
outcome, and learn what converts.

The historical thesis was:

> Cripqer should compete against lost customers, not against Linktree.

The refined thesis is:

> Cripqer should compete against intent leakage.

## WHO CRIPQER SERVES

Priority users include:

- independent professionals
- local businesses
- beauty / personal care businesses
- fitness / wellness businesses
- professional services
- real estate operators
- WhatsApp-first businesses
- QR-driven businesses
- service-oriented local businesses

## THE USER PROBLEM

Businesses receive attention from Instagram, TikTok, Google, ads, QR codes, and
physical campaigns, but much of that attention leaks before it becomes an
outcome.

The leak happens when visitor intent is unclear, the page experience is generic,
the CTA is not matched to the situation, the handoff loses context, attribution
is incomplete, and no follow-up loop exists.

## MARKET THESIS

Cripqer should not compete primarily against Linktree.

Cripqer should compete against INTENT LEAKAGE: the loss of visitor context,
intention, attribution, follow-up, and eventual business outcome between
discovery and conversion.

Cripqer is not "the most advanced Link-in-Bio". It is a conversion-oriented page
and workflow layer.

## VALUE PROPOSITION

Cripqer turns traffic from social, search, ads, QR, and physical campaigns into
measurable business outcomes.

Target outcomes include:

- WhatsApp conversation
- lead
- booking
- quote request
- call
- form submission
- payment
- sale
- physical visit

## DIFFERENTIATING FACTOR

The real differentiation is the connected chain:

```text
SOURCE
+
INTENT
+
PAGE EXPERIENCE
+
CTA
+
HANDOFF CONTEXT
+
OUTCOME
+
LEARNING
```

The moat is not:

- more templates
- more colors
- more visual effects
- QR by itself
- AI page generation by itself
- basic analytics
- a Mini CRM by itself
- a Power Editor by itself

## LONG-TERM MOAT

Competitors can copy templates, buttons, layouts, and individual features.

The harder asset to copy is accumulated, reliable knowledge showing which
combinations of source, intent, content, page structure, CTA, and handoff produce
confirmed outcomes for different business types.

The future moat is:

```text
conversion history
+
workflow data
+
vertical schemas
+
integrations
+
outcome intelligence
```

## PRODUCT LOOP

Strategic loop:

```text
SOURCE
  ↓
INTENT
  ↓
CONTEXT
  ↓
PAGE
  ↓
CTA
  ↓
HANDOFF
  ↓
OUTCOME
  ↓
ATTRIBUTION
  ↓
FOLLOW-UP
  ↓
LEARNING
  ↺
```

Long product loop:

```text
ATTENTION
  ↓
INTENT
  ↓
ACTION
  ↓
OUTCOME
  ↓
LEARNING
  ↓
BETTER CONVERSION
  ↺
```

## ROLE OF ONBOARDING

Onboarding collects the minimum useful business context required for Engine V2
to make real downstream decisions.

It must avoid collecting dead fields that do not affect generation, page
structure, CTAs, handoff context, analytics, or follow-up.

## ROLE OF ENGINE V2

Engine V2 converts semantic business and onboarding input into a valid page plan
and canonical configuration.

Engine V2 must understand current Power Editor capabilities and when to use
them.

Engine V2 must not become a second production engine outside the canonical
system.

## ROLE OF POWER EDITOR

Power Editor is the default primary editor.

Its role is human refinement and visual/structural control. It should be
powerful enough to build professional pages, but it must not grow indefinitely
into a Canva or Figma clone.

New Power Editor work should only be accepted if it is necessary to:

```text
CREATE
EDIT
SAVE
REOPEN
PRESERVE
PUBLISH
USE
```

Non-essential visual features belong in FUTURE EDITOR ENHANCEMENTS.

## ROLE OF SMART PAGES / PAGE SYSTEM

The Page System connects Landing with Catalog, Services, Menu, Portfolio,
Listings, and Detail Pages when the business requires them.

The intended architecture is:

```text
semantic input
  ↓
Page Plan
  ↓
Host Engine V2
  ↓
canonical
  ↓
host renderer
```

There must be no second production renderer for Smart Pages.

## ROLE OF QR

QR is a measurable physical/digital source of visitor intent, not merely a QR
image generator.

QR should preserve source and campaign context so physical-world attention can
be connected to page actions, outcomes, attribution, and follow-up.

## ROLE OF ANALYTICS

Analytics must evolve from views, clicks, and CTR toward:

```text
source → intent → action → outcome
```

Analytics should explain what converts, not only count what happened.

## ROLE OF MINI CRM

Mini CRM is lightweight operational memory of opportunities, intent, source,
status, and outcome.

It must not become Salesforce.

Its role is to preserve conversion context and support follow-up, not to become
a full enterprise CRM.

## ROLE OF FOLLOW-UP

Follow-up closes the loop between visitor action and business outcome.

It should preserve context from source, intent, page, CTA, and handoff so the
business can act intelligently after the first interaction.

## WHAT CRIPQER MUST NOT BECOME

Cripqer must not become:

- another Linktree clone
- a full website builder
- a Canva replacement
- a Shopify replacement
- a full CRM
- a full email marketing platform
- a social scheduling platform
- a full booking platform
- an all-in-one suite that tries to replace every specialist product

## PRODUCT PRINCIPLES

- One canonical system.
- No second production canonical document.
- No second production Engine.
- No second production renderer for Smart Pages.
- Integrate specialist systems rather than rebuilding them unnecessarily.
- Preserve context across integrations.
- Data preservation is non-negotiable.
- Mobile is first-class.
- Functional integrity comes before final visual polish.
- AI recommendations should preserve human control.

## CURRENT EXECUTION PHILOSOPHY

The repository is frozen by default.

Current work must prioritize Creation Core completion before new non-essential
editor features. The system must be able to create, edit, save, reopen,
preserve, publish, and use a generated page before moving to broader Conversion
Core work.

## AGENT RULES

- This document is strategic reference, not implementation permission.
- Do not modify source code unless the active task explicitly authorizes it.
- Do not implement related features just because they are mentioned here.
- Do not create a second canonical document, second production Engine, or second
  production renderer.
- Do not change project strategy based on personal interpretation.
- Preserve existing data and user work.
- Treat mobile functionality as first-class when a task authorizes product work.

## ONE-SENTENCE NORTH STAR

Cripqer turns attention into measurable outcomes by understanding intent,
presenting the right experience, preserving context across handoffs, and
learning what converts.
