# E2E Pilot 10 Report

Run ID: cripqer-e2e-pilot-10-2026-08-25T22-35-29-291Z
Batch ID: cripqer-e2e-pilot-10-2026-08-25T22-35-29-291Z
Final verdict: E2E_PARTIAL

## Live Resume

- SUPABASE_SERVICE_ROLE_KEY verified present without printing value.
- Admin ingestion did not use anon fallback.
- Live ingest attempted through ingestToTemplateBank(records, { mode: 'live' }).

## Details

```json
{
  "reason": "Live ingest/admin workflow/public visibility/unpublish passed. Normal-user authenticated copy/edit security was not executed in this resume scope.",
  "selectedTemplateId": "0fe43a78-3df1-441a-8892-abd7d828a189"
}
```