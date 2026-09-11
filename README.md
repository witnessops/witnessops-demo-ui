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

Sign in with any mocked identity, create the Acme Ltd workspace, run a check, open an observation, view the report, invite a viewer, and switch workspaces.

## Note

A workspace is an access and retention container. It does not prove company identity or domain ownership. Checks are unauthenticated observations, not a penetration test or a security score.
