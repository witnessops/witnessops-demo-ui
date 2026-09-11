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

Returning to the workspace should answer: what changed, what needs attention, what has better coverage, and what is stale. History is compact so a later visit is more useful than the first.

## Run

```bash
npm install
npm run dev
```

Try the return loop: open Acme Ltd, read “Since your last observations”, inspect `api.acme.com`, run again, then look at `mail.acme.com` (coverage) and `203.0.113.24` (older observation).

## Note

A workspace is an access and retention container. It does not prove company identity or domain ownership. Checks are unauthenticated observations, not a penetration test or a security score. Coverage can improve over time without rewriting previous evidence.

The public hostname snapshot is aligned to the existing WitnessOps External Exposure contract (`ExternalSnapshotV1`). See `docs/WITNESSOPS_ALIGNMENT.md`.
