# CRIPQER EMAIL CONFIRMATION PRODUCTION SMOKE V1

**Task ID:** `CRIPQER_EMAIL_CONFIRMATION_PRODUCTION_SMOKE_V1`  
**Status:** `BLOCKED — PRODUCTION ROUTES RETURN 404`  
**Success gate:** `CRIPQER_EMAIL_CONFIRMATION_SUCCESS_PAGE_RUNTIME_PASS_FROZEN`

## Scope

Runtime QA only. No application code, authentication configuration, Supabase
data, email templates or credentials were changed.

## Public precheck

Read-only HTTP checks against the requested production host returned:

| URL                                         | Result          |
| ------------------------------------------- | --------------- |
| `https://www.cripqer.dev/correo-confirmado` | `404 Not Found` |
| `https://www.cripqer.dev/login`             | `404 Not Found` |

Because the landing route and its login destination are not currently
reachable in production, the real email confirmation flow was not started.

## Not run

- Supabase Site URL and redirect allow-list review;
- hosted email-template confirmation-link audit;
- registration with a new email address;
- clicking the real Supabase confirmation email;
- verification of `email_confirmed = true`;
- landing-page and `/login` runtime proof.

These items are **NOT RUN**, not passes. No confirmation email was sent and no
credentials or inbox contents were accessed.

## Required continuation

1. Deploy the route-tree/application changes containing `/correo-confirmado`
   and `/login` to `www.cripqer.dev`.
2. Confirm Supabase allows
   `https://www.cripqer.dev/correo-confirmado` as a redirect URL.
3. Confirm the email button still uses Supabase's generated confirmation URL,
   not the static success route directly.
4. Repeat the new-account confirmation and login smoke, then verify the user
   record has `email_confirmed` set.
