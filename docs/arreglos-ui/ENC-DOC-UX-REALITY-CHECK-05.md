# ENC-DOC-UX-REALITY-CHECK-05

// Modified by ChatGPT Work — ENC-DOC-UX-REALITY-CHECK-05

## Branch / Deploy

- CURRENT_BRANCH: `main`
- CURRENT_HEAD: `cddafab`
- PR_HEAD: `origin/main` = `cddafab`
- DEPLOY_TARGET: Vercel project `codigos-qr` from `.vercel/repo.json`

## Root Cause

The UI mismatch is primarily `A) cambios nunca desplegados`.

The document QR/password UI changes from the previous phase were present only in the local working tree. `main` and `origin/main` still point to `cddafab`, so a Git-connected Vercel preview/production deployment cannot contain those changes until they are committed and deployed.

## Connected Component Check

The real success-screen QR component in `src/routes/encrypted-documents.tsx` now renders through `ThemedDocumentQr`, which passes:

- `fgColor={theme.foreground}`
- `bgColor={theme.background}`
- `level="H"`
- `includeMargin={true}`
- `imageSettings.src` with an encoded SVG data URI
- `imageSettings.excavate = true`

The local Vercel build output contains:

- `fgColor: theme.foreground`
- `imageSettings`
- `Documento protegido`
- `Generar contraseña segura — recomendado`
- `Descargar PNG`

## Excel Runtime

Local runtime detection for a `.xlsx` file:

```json
{
  "filename": "budget.xlsx",
  "extension": "xlsx",
  "browserMime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "category": "excel",
  "icon": "spreadsheet",
  "foreground": "#0F5F3A",
  "background": "#FFFFFF",
  "label": "Excel"
}
```

## Password Compatibility

An isolated Web Crypto parity test with `TestSecure123!` confirms:

- correct password verifier matches
- wrong password verifier is rejected
- correct password decrypts
- wrong password fails decryption

This does not validate existing database rows or a deployed RPC. Legacy document compatibility remains not guaranteed without testing real stored rows.

## Remaining Deploy Gap

No new commit or deployment was created in this check because the working tree contains unrelated modified files outside this task. A clean deployment should commit only the intended document QR/password changes, or first resolve the unrelated dirty state.

## QA

- Build: PASS locally.
- Visual screenshots: not captured because authenticated `/encrypted-documents` flow requires a real session and deployed/preview environment access.
- Scan QA: manual required.
