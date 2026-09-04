# Cripqer — Engine V2 Source Parity

Date: 2026-09-03  
Status: **INSTALLED WITH EXPLICIT HOST ADAPTERS**

## Source and destination

| Item                                | Path / result                                           |
| ----------------------------------- | ------------------------------------------------------- |
| Authoritative source                | `PROYECTO PARA INTEGRA A QR/src/lib/parametric-engine/` |
| Host destination                    | `src/lib/parametric-engine-v2/`                         |
| Source TypeScript files             | 82                                                      |
| Destination source TypeScript files | 82 copied + 1 host entrypoint                           |
| Missing source files                | 0                                                       |
| Extra destination file              | `internal-entrypoint.ts`                                |
| Relative import closure             | PASS                                                    |

## SHA-256 comparison

All 82 source `.ts`/`.tsx` files were compared by SHA-256 before host
adaptation:

- **79/82 identical** after the controlled import.
- The only three source differences are explicit server-boundary adapters:
  `media/pexels-provider.ts`, `media/unsplash-provider.ts`, and
  `ai/deepseek-provider.ts`.
- No Engine business logic was rewritten, merged with Engine V1, or replaced.

The three adapter differences replace direct provider secret/fetch access with
the existing server-only seam at `src/server/integrations/server-fetch.ts`.
The seam reads `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, and
`DEEPSEEK_API_KEY` only on the server. No provider key uses a `VITE_` variable
or browser import.

## Included capability areas

- Core Engine V2 generation, validation, scoring, diversity, responsive and
  fingerprinting modules.
- `power-editor/` mapping to the installed frozen Power Editor contract.
- `media/`: Pexels, Unsplash, provider routing and Media Curator.
- `ai/`: DeepSeek Supervisor and structured guardrails.
- `fixtures/`, `integration/`, and direct Engine V2 tests.

The authoritative Power Editor snapshot remains byte-identical for its 46
TypeScript/TSX/CSS files. It was not reformatted or modified by this import.

## Deliberate exclusions

- Source snapshot Markdown files were not copied as Engine runtime files.
- Nested source routes, app shells, auth, billing, database, onboarding and
  public renderer routes were not copied.
- Engine V1 at `src/lib/parametric-engine/` was not changed; Git diff is empty
  for that path.
- No public route or navigation import references Engine V2.

## Result

The source parity gate is **PASS with three documented HOST_ADAPTER_ONLY
differences**. The installed namespace is isolated and the frozen Power
Editor dependency is resolved from `src/premium-template-studio/`.
