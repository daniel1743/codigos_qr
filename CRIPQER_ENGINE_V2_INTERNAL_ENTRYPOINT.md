# Cripqer — Engine V2 Internal Entrypoint

Date: 2026-09-03  
Status: **DORMANT / SERVER-ONLY**

## Entry point

`src/lib/parametric-engine-v2/internal-entrypoint.ts`

Exported function:

`generateCripqerPageWithEngineV2`

The module imports the server-only marker and is not imported by routes,
onboarding, navigation or public renderers.

## Contract

`EngineV2HostGenerationInput` extends the host
`CripqerOnboardingIntentV1` contract and adds optional server-side media,
preferred color and an explicit primary action. The adapter maps these fields
to the frozen Engine V2 `OnboardingIntentV1` shape without changing the frozen
Engine or Power Editor contracts.

The output contains:

- `editorConfig`: the Engine V2 `BioTemplateConfig`.
- `canonicalEnvelope`: the result of `acceptEngineGeneratedConfig`.
- deterministic candidate ID, score, family, layout and fingerprint.
- media provenance metadata.
- optional injected `SupervisorOutcome`.
- the existing `CRIPQER_ACTION_HOST_POLICY_V1`.

## Safety behavior

- A profession with fewer than two characters is rejected.
- A primary action must be supplied or a valid content link must exist.
- No placeholder URL, fabricated media asset or invented action destination is
  created.
- Curated media and AI results are injected by a server caller; this dormant
  adapter does not call external providers automatically.
- Canonical persistence remains the caller's responsibility through the
  existing canonical page service/RPC.
- Forms and native calendar actions remain blocked by the host policy.

## Provider boundary

Pexels, Unsplash and DeepSeek adapters use
`src/server/integrations/server-fetch.ts` for server-only secrets and fetch.
No provider secret is read from `import.meta.env` or exposed through a
browser-facing variable.

## Activation gate

Before activation, complete a real same-profile Supabase round trip with a
canonical config containing premium fields, then add an explicitly authorized
internal route or server caller. Public onboarding, Basic Editor and public
routes must remain unchanged.
