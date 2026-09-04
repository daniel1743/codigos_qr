# Cripqer — Product Strategy V1

This document records the approved product, onboarding, monetization and packaging direction for Cripqer. It is strategic documentation only; it does not define an implementation change or alter current product behavior.

## Product direction

### Engine V2 for everyone

Engine V2 is the generation engine for all users. It must generate both minimal and rich pages, with complexity responding to actual user intent and available content. It must not force rich blocks onto users with sparse content, and Free must not use a deliberately weakened generation engine.

### Onboarding

Onboarding discovers what the user needs. It does not predict willingness to pay.

```text
Onboarding
    ↓
Engine V2 understands profession, goal, content, style and requested features
    ↓
Essential / Free                         Pro
focused professional page                complete expression of the same intent
    ↓                                      ↓
Publish Free                              Unlock / Publish Pro
Quick Editor                              Power Editor
```

Free and Pro share the user's identity, content and creative direction. Pro is the expanded version of the same page, not an unrelated template. The user decides which version to use.

The product must clearly identify Pro capabilities before publication and must not surprise a user with a paywall after presenting Premium as free. There is no automatic one-month Premium trial in V1. A future trial may exist only as an explicit voluntary action.

## Essential / Free

**Positioning:** Creation

**Promise:** Give every user a genuinely attractive, useful and publishable professional page. Free must not look intentionally cheap or incomplete.

Free uses Engine V2 and the Quick / Basic Editor. Its expected core capabilities include:

- professional generated design;
- avatar, banner, name, profession and bio;
- links, social networks, WhatsApp and a primary CTA;
- basic services and simple cards;
- basic media;
- approved basic colors and fonts;
- limited gallery or portfolio when appropriate.

Free solves the underlying user need, but does not automatically receive every advanced commercial or presentation capability.

### Free fallbacks

When a Free user requests a Pro capability, the underlying need should receive a Core fallback where practical instead of being ignored.

| Pro capability | Free fallback |
| --- | --- |
| Integrated booking | CTA, booking URL or WhatsApp |
| Product catalog | Basic cards or links |
| Embedded video block | External video link or card |
| Advanced pricing | Simple service cards with price |
| Advanced portfolio | Limited media or cards |
| Floating or sticky CTA | Normal CTA |
| Advanced gallery | Limited media or gallery |
| Motion and animation | Static presentation |

## Pro

**Positioning:** Capability + Professional Control

**Promise:** A complete digital presence plus professional control over the page.

Pro includes Engine V2, full Pro generation capability, the Quick Editor when desired, and the Power Editor.

Possible advanced capabilities include:

- advanced gallery, portfolio and pricing;
- booking, video embeds, testimonials and FAQ;
- products or commerce as released;
- advanced, sticky and floating CTA systems;
- motion and advanced layouts;
- advanced responsive controls and card systems;
- textures, frames, advanced gradients, glass, blur, glow and other advanced visual effects.

Premium must not be sold merely as more colors or prettier styling. Premium sells more capability, more control and more commercial value.

## Business / PYME

**Positioning:** Operation + Collaboration

Business is not a higher tier because it has more visual effects. It exists to operate a business with multiple pages, people, leads, campaigns and shared brand assets.

The initial packaging hypothesis is approximately 10 pages with multiple seats; exact limits remain open.

Candidate capabilities:

- appropriate Pro capabilities;
- multiple pages and team seats;
- Brand Kit, shared assets and brand-consistency controls;
- centralized leads and business analytics;
- campaign and QR management;
- roles, permissions and stronger administrative controls.

**Brand Kit** means shared logos, official colors, typography, assets and brand rules that keep multiple pages consistent.

**Lead generation** means capturing and managing prospects such as a name, email, phone number, booking request, interest or other conversion information.

## Enterprise

**Positioning:** Governance + Integration + Security + Scale

Enterprise buys organizational governance and infrastructure rather than exclusive decorative design capabilities.

Candidate capabilities:

- SSO / SAML and SCIM / provisioning;
- granular RBAC and audit logs;
- approval workflows and corporate policies;
- multiple organizational workspaces or departments;
- controlled corporate templates;
- enterprise APIs and integrations;
- security and compliance controls;
- SLA and dedicated or priority support;
- contract-based page, user or usage volumes.

## Agency — future optional line

Agency is future scope and is not required for V1.

**Positioning:** Multi-client Management

Possible capabilities include client workspaces, multiple brands and collaborators, project duplication, Brand Kits per client, centralized reporting, billing administration and white-label options.

## Secure QR / Encrypted Documents

Cryptographic strength must never be intentionally weakened for cheaper plans.

Cripqer reportedly has three security or encryption modes, but their real technical behavior must be audited before commercial assignment.

Recommended packaging:

| Plan | Product name | Value |
| --- | --- | --- |
| Free | Secure Basic | Essential protection and simple use |
| Pro | Secure Advanced | Additional expiry, use and management controls |
| Business | Secure Control | Team policies, traceability and centralized administration |
| Enterprise | Secure Governance | Corporate identity, audit, policy, integrations and compliance |

Monetize administration, governance, traceability and enterprise controls—not unsafe cryptography.

## Pricing hypotheses

Pricing is not final. It must later be validated against the market, costs, usage and willingness to pay.

| Plan | Working hypothesis |
| --- | --- |
| Free | USD 0 |
| Pro | Approximately USD 10–25/month |
| Business | Approximately USD 50–150/month, depending on pages, seats and usage |
| Enterprise | Approximately USD 250–500+/month or custom |

These are working hypotheses, not launch commitments.

## Downgrade safety

A subscription downgrade must not destroy Premium or Power page state.

Future downgrade behavior must:

- preserve hidden Premium fields;
- avoid destructively rewriting the canonical page;
- disable or gate capabilities according to entitlement;
- define publication behavior explicitly before launch.

## Open product decisions

- Final Engine V2 entitlement matrix.
- Classification of every capability as FREE, FREE_LIMITED, FREE_FALLBACK, PREMIUM or FUTURE.
- Exact page and seat limits per plan.
- Media and storage limits.
- Lead and analytics limits.
- Which operational functions belong to Pro versus Business.
- Audit of the three current encryption or security modes.
- Final pricing.
- Downgrade behavior after subscription cancellation.

## Frozen product principles

1. Engine V2 for everyone.
2. Onboarding discovers needs, not willingness to pay.
3. Essential versus Pro comparison is transparent.
4. Free is attractive and publishable.
5. Pro means capability plus professional control.
6. Business means operation plus collaboration.
7. Enterprise means governance, integration, security and scale.
8. Agency remains a future optional line.
9. There is no automatic Premium trial in V1.
10. Cryptographic security is never weakened for monetization.

## Implementation boundary

This README does not authorize implementation of any future architecture. In particular, the following remain separate future work:

- `BioTemplateConfig` migration;
- database migration or revision model;
- controlled dual-read or dual-write migration;
- Engine V2 port;
- Power Editor port;
- Basic safe-patch adapter;
- `PublicTemplateRenderer` integration;
- media or AI server integration.

The approved future receiving direction is a controlled gradual dual-read migration, but it must not begin without explicit authorization.
