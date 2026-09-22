# CRIPQER CONTEXTUAL MEDIA LIVE RUNTIME QA V1

**Task ID:** `CRIPQER_CONTEXTUAL_MEDIA_LIVE_RUNTIME_QA_V1`  
**Status:** `PARTIAL — PROVIDERS LIVE VERIFIED; AUTHENTICATED UI QA BLOCKED`  
**Required gate:** `CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_RUNTIME_VISUAL_PASS_FROZEN`

## Pre-flight

Secret values were not printed or inspected beyond presence checks.

| Provider | Environment variable  | Status      |
| -------- | --------------------- | ----------- |
| Unsplash | `UNSPLASH_ACCESS_KEY` | `CONNECTED` |
| Pexels   | `PEXELS_API_KEY`      | `CONNECTED` |

## Live provider verification

A real server-side request was made to each existing provider endpoint using
the configured environment values. Secret values and authorization headers were
not printed.

- Sanitized query: `modern premium hair salon interior`
- Unsplash: `CONNECTED`, 5 candidates; selected-candidate evidence included
  public asset ID `jsuWg7IXx1k`, dimensions `5761×4000`, creator `Greg Trowman`
  and a present source page.
- Pexels: `CONNECTED`, 5 candidates; selected-candidate evidence included
  public asset ID `7195805`, dimensions `7360×4912`, creator `Max Vakhtbovych`
  and a present source page.

These requests prove provider reachability and normalized public metadata, but
not the complete onboarding/persistence path.

## Stop condition

The authenticated `/onboarding-test` flow requires QA login credentials. The
current environment has no `QA_EMAIL` or `QA_PASSWORD`, so the browser flow
cannot safely reach generation, persistence or editor reload. No mocked
response was substituted for the required live test.

An existing Chrome tab was detected, but the available browser-control bridge
could not attach/read that tab's authenticated state. No credentials were
entered and no alternate login or service-role bypass was attempted.

## Not run

- `/onboarding-test` live contextual service scenario
- Real Unsplash/Pexels request and selected asset verification — **PASS**
- Contextual hero visual screenshots
- Canonical contextual provenance read-after-write
- Editor reload and duplicate-search verification
- Owner-priority, retail-protection and portfolio-protection live scenarios
- Provider failure/fallback runtime screenshots

## Changes

None. This was runtime verification only; no application code, tests,
configuration, provider clients, secrets or Git history were modified.

## Resume condition

Provide at least one real server-side `UNSPLASH_ACCESS_KEY` or
`PEXELS_API_KEY` through the normal server environment, then rerun this QA.
The key must remain server-only and must not be included in browser payloads,
Inspector output or reports.
