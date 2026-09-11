# WitnessOps demo UI

Clickable prototype of the authenticated WitnessOps product and the public External Exposure check.

This is a UI/UX prototype with mocked data. It does not implement real authentication, database tenancy, invitation security, billing, RLS, report generation, or backend infrastructure.

**Product split**

- `witnessops.com` — public site and public External Exposure check
- `app.witnessops.com` — authenticated workspace for assets, saved runs, reports, history, and members

One modular application serves both surfaces.

## Product model

Workspace → Assets → Runbooks → Runs → Observations → Evidence

The default path is simpler: add an asset, accept the recommended checks, inspect the result, and see what changed later.

A runbook is the observation profile underneath. A run is one immutable execution against one asset. Adding an asset does not prove ownership.

## Run

```bash
npm install
npm run dev
```

Try the product loop: open the Acme Ltd workspace, add `api.acme.com`, accept Web Exposure, inspect the result, run again, then add `203.0.113.24` with Public Services.

## Note

A workspace is an access and retention container. It does not prove company identity or domain ownership. Checks are unauthenticated observations, not a penetration test or a security score. Coverage can improve over time without rewriting previous evidence.
