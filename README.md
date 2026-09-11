# WitnessOps demo UI

Clickable prototype of the authenticated WitnessOps product and the public External Exposure check.

This is a UI/UX prototype with mocked data. It does not implement real authentication, database tenancy, invitation security, billing, RLS, report generation, or backend infrastructure.

**Product split**

- `witnessops.com` — public site and public External Exposure check
- `app.witnessops.com` — authenticated workspace for saved checks, reports, history, and members

One modular application serves both surfaces.

## Run

```bash
npm install
npm run dev
```

Try the product loop: run a public snapshot for `acme.com`, save it, sign in, create the Acme Ltd workspace, activate External Exposure, choose checks, run again, then inspect change history, an observation, and the report.

## Note

A workspace is an access and retention container. It does not prove company identity or domain ownership. Checks are unauthenticated observations, not a penetration test or a security score.
