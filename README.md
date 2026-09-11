# WitnessOps demo UI

Clickable prototype of the authenticated WitnessOps product and the public External Exposure check.

This is a UI/UX prototype with mocked data. It does not implement real authentication, database tenancy, invitation security, billing, RLS, report generation, or backend infrastructure.

**Product split**

- `witnessops.com` — public site and public External Exposure check
- `app.witnessops.com` — authenticated workspace for assets, runbooks, saved runs, reports, history, and members

One modular application serves both surfaces.

## Product model

Workspace → Assets → Runbooks → Runs → Observations → Evidence

A runbook defines what WitnessOps will observe. A run is one immutable execution of one runbook against one asset. Adding an asset does not prove ownership.

## Run

```bash
npm install
npm run dev
```

Try the product loop: run a public snapshot for `acme.com`, save it, sign in, open the Acme Ltd workspace, inspect assets, add `api.acme.com`, run Web Exposure, then add `203.0.113.24` with Public Services.

## Note

A workspace is an access and retention container. It does not prove company identity or domain ownership. Checks are unauthenticated observations, not a penetration test or a security score. Coverage can improve over time without rewriting previous evidence.
