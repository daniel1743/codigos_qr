# CRIPQER EMAIL CONFIRMATION PRODUCTION SMOKE V2

**Task ID:** `CRIPQER_EMAIL_CONFIRMATION_PRODUCTION_SMOKE_V2`  
**Status:** `RUNTIME_NOT_VERIFIED — HUMAN EMAIL/SUPABASE ACCESS REQUIRED`  
**Success gate:** `CRIPQER_EMAIL_CONFIRMATION_SUCCESS_PAGE_RUNTIME_PASS_FROZEN`

## Scope

Production QA only. No application code, Supabase configuration, user record,
email template or authentication state was changed.

## Public route precheck

Read-only checks against production passed:

| URL | HTTP |
|---|---:|
| `https://www.cripqer.dev/correo-confirmado` | `200` |
| `https://www.cripqer.dev/login` | `200` |

## Not verified

The following require human access that was not available in this environment:

- Supabase Site URL and redirect allow-list;
- hosted confirmation-template link audit;
- registration with a genuinely new email address;
- receipt and inspection of the real confirmation email;
- Supabase verification callback and redirect destination;
- `Correo confirmado` landing after clicking the real email CTA;
- login with the newly confirmed account;
- confirmed-email state in Supabase;
- post-login destination and screenshots `01`–`05`.

These are **NOT_VERIFIED**, not passes. No email was sent, no existing account
was used, and no user was manually confirmed.

## Human continuation

Use a new disposable email account and the Supabase dashboard, verify that the
email button retains Supabase's generated confirmation URL, then execute the
full registration → email CTA → `/correo-confirmado` → `/login` flow and record
only screenshots actually captured.

