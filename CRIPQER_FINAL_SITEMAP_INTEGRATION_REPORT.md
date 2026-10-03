# CRIPQER final secure sitemap integration

- Branch: `codex/final-secure-sitemap-integration`
- Secure base: `9283123e719e8308de5462f414265ade72a041cc`
- Sitemap integration commit: `bfac336`
- TanStack family preserved exactly: Start `1.168.60`, server core `1.169.39`,
  React Router `1.170.41`, router core `1.171.34`, router plugin `1.168.42`.

## QA migration and RPC

- Supabase target verified as QA project `tjigzcyoogmvdkivypym`, distinct from
  production `mlinfiuhkxdhlveflbkj`.
- Migration `20261002000001_sitemap_magic_profile_resolver.sql` is present in
  the QA migration history.
- Anonymous RPC call succeeded and returned one published mapping in QA:
  `G9erG8Y -> 6W4B9Zy`.
- The preferred production identity `KTRdygd` is not present in QA; its bridge
  RPC returned an empty result without error.

## Code validation

- Focused suites: 28 files, 160 passed, 1 skipped integration test (no
  integration credentials configured in the test process).
- Client and SSR/Nitro production builds: PASS.
- `git diff --check`: PASS.
- Sitemap now uses the SECURITY DEFINER batch RPC and throws on resolver errors;
  no anon SELECT access or application behavior outside sitemap resolution was
  changed.

## Preview gate

- Preview deployment: `https://codigos-nxg4k9ika-daniels-projects-29fb139e.vercel.app`
- Vercel build completed successfully.
- Deployment Protection redirects all requested routes to Vercel SSO (HTTP
  302), so anonymous runtime checks for `/sitemap.xml`, `/p/KTRdygd`, and
  `/pg/VvUsngW` cannot be completed. Production was not deployed and no
  protection bypass was used.
