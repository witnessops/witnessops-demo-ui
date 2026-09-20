# WitnessOps alignment

Practical map from this prototype to existing WitnessOps systems.

**Integration correction — 2026-09-20 (RF-TAIL-DEMO-001).** `apps/witnessops-app` already exists in `witnessops/witnessops-web`; its [README at the inspected revision](https://github.com/witnessops/witnessops-web/blob/ec7aa61f2641d073a7f1ea3dfb744b04ac35c29c/apps/witnessops-app/README.md) names this prototype's `4887c0fc5f2ac6742de0f4c9e11cb11e8603ade4` revision as its UX reference. Continue in that existing application; do not scaffold a second app from this guide.

This correction establishes source existence and the recorded UX reference, not deployment or completion of every product capability. The remaining mappings and backlog are retained prototype-era analysis, not a freshly assessed delivery checklist. Consult the current owning app documentation and accepted scope before implementation; historical V1 exclusions here do not override them.

Reference sources (not modified):

- `witnessops/witnessops-web` — public External Exposure snapshot
- `witnessops/witnessops-offsec` — governed OFFSEC runbook engine

This prototype remains a clickable UI. It does not execute real checks.

---

## 1. Current prototype concept

Customer path:

Add asset → recommended checks → observe → inspect evidence → rerun → see what changed

Underlying model:

Workspace → Assets → Runbooks / observation profiles → Runs → Observations → Evidence

A run is one immutable execution of one profile against one asset.

The public check at `/check` is the existing ten-observation hostname snapshot. It is not a workspace product, not an IP/port scanner, and not an OFFSEC engagement.

---

## 2. Existing witnessops-web capability mapping

Authoritative contract: `apps/witnessops-web/src/lib/external-exposure/contracts.ts`

| Customer label | Contract ID | Status |
|---|---|---|
| Public DNS target | `dns.public_target.v1` | REAL_NOW |
| TLS certificate state | `tls.certificate.v1` | REAL_NOW |
| Legacy TLS protocols | `tls.legacy_protocols.v1` | REAL_NOW |
| HTTP to HTTPS transition | `web.https_redirect.v1` | REAL_NOW |
| HTTP Strict Transport Security | `web.hsts.v1` | REAL_NOW |
| Browser security headers | `web.security_headers.v1` | REAL_NOW |
| Vulnerability reporting contact | `web.security_txt.v1` | REAL_NOW |
| SPF publication | `mail.spf.v1` | REAL_NOW |
| DMARC publication | `mail.dmarc.v1` | REAL_NOW |
| CAA publication | `dns.caa.v1` | REAL_NOW |

Public API: `POST /api/external-exposure` with `{ hostname }`. Hostname only. Body ≤ 1 KiB. Same-origin. Rate-limited. No IPs, ports, paths, or extra fields.

Do not widen this endpoint for the authenticated app.

Runner output to persist later: `ExternalSnapshotV1` / `ExternalCheckResultV1`.

The prototype observation source fields are shaped after that result: `check_id`, `check_version`, `status`, `method`, `title`, `observation`, `evidence`, `interpretation`, `limitations`, `recommendation`, `collected`.

---

## 3. Existing OFFSEC runbook mapping

Useful concepts, not customer UI:

- stable runbook id + version
- normalized inputs
- execution class
- approval requirement
- evidence tags
- authoritative run state
- immutable artifacts (manifest / receipt)

Relevant runbooks:

| OFFSEC id | Relation to this product |
|---|---|
| `external-exposure-assessment` | Governed paid VA. Informs future escalation. **Not** a self-service profile. |
| `external-exposure-assessment-retest` | Finding-specific retest. Governed. |
| `email-posture-discovery` | Broader passive mail DNS (DKIM, MTA-STS, SRV). Inspired Mail Exposure. Do not execute as self-service. |
| `tls-review` | nmap + nuclei TLS assessment. Governed. Product TLS uses the web snapshot subset only. |
| `attack-surface-discovery` | Subfinder, nmap, nuclei. Governed. |
| `ext-attack-surface-map` | Open discovery + approval-gated active. Governed. |
| `governed-passive-recon` | Exact-scope passive, mobile-control. Governed. |
| `network-service-validation` / `web-recon` | nmap / ffuf / nuclei. Governed. |

OFFSEC execution classes: `passive` / `active` / `synthesis` / `finalize`.

Product classes (this prototype): `public_observation` / `authorized_active`.

---

## 4. Classification

### REAL_NOW

The ten snapshot checks above. Directly backed by `witnessops-web` runner + `ExternalSnapshotV1`.

### REUSABLE_PRIMITIVE

| Prototype check | Why |
|---|---|
| `mail.mx.v1` | MX is already collected as supporting data for SPF/DMARC. Not a standalone public check. |

Network transport primitives in witnessops-web (DNS, one TLS handshake, bounded HTTP GET, 80/443 only) can later back a **separate** authenticated runner. They are not a public-IP product today.

### OFFSEC_GOVERNED

Do not expose as one-click self-service:

- `external-exposure-assessment` and retest
- nmap / nuclei / ffuf workflows
- `tls-review`
- `attack-surface-discovery` / `ext-attack-surface-map`
- authenticated surface discovery
- bounded-web Nuclei allowlist
- banner grabbing as an OFFSEC `service_identification` step after approval

These may inform later architecture and escalation. They are a different execution tier.

### MOCK_ONLY

| Prototype check / profile | Note |
|---|---|
| `mail.dkim.v1` | Exists in OFFSEC email-posture. Not in the public snapshot. |
| `mail.host.v1` | Mock. Future bounded runner required. |
| `web.technology_signals.v1` | Prototype-only. |
| `dns.ct_names.v1` | Prototype-only. TLS names already come from `tls.certificate.v1`. |
| `web.common_interfaces.v1` | Guessed admin paths. Not the public snapshot. Optional, not default. |
| `net.public_banner.v1` | Mock. |
| Public Services ports (`port-N`) | Mock. **Future bounded product runner required.** Not `POST /api/external-exposure`. Not the OFFSEC executor. |

---

## 5. Source-of-truth boundaries

| Concern | Source of truth |
|---|---|
| Public hostname snapshot checks, IDs, statuses, methods | `witnessops-web` External Exposure contract |
| Public API constraints | `createExternalExposureHandler` |
| Snapshot JSON shape | `ExternalSnapshotV1` |
| Customer workspace UX | this prototype is a UX reference; the existing `apps/witnessops-app` in repository `witnessops/witnessops-web` and its owning documentation govern implementation |
| Governed operator workflows | `witnessops-offsec` |
| Product vs OFFSEC execution | Keep separate. Reuse contracts, not the OFFSEC executor |

Where they conflict: production contract and security boundary beat prototype convenience.

---

## 6. What can be reused directly

- The ten check IDs, titles, methods, and status union
- `ExternalSnapshotV1` as the immutable source for a public or hostname-equivalent run
- Interpretation/limitations/recommendation text model
- `SNAPSHOT_BOUNDARY` and `EXCLUSIONS`
- Hostname normalization and target-safety rules
- Declared API inventory idea (`api-contract.ts` + drift test)

A future app run of Web Exposure against a hostname should call the **same snapshot primitives**, then persist the snapshot next to workspace metadata (asset, runbook version, initiator, saved-at).

---

## 7. What must remain separate

- Public `/api/external-exposure` stays hostname-only
- Authenticated app actions do not ride that public handler
- OFFSEC `external-exposure-assessment` is not a selectable product runbook
- nmap, nuclei, ffuf, open discovery, and approval-gated active checks stay in OFFSEC
- Public Services (IPs/ports) must not be implied as already implemented in witnessops-web
- Unsigned snapshot observations are not proof, certification, or a pentest

---

## 8. What needs to be built for the authenticated product

**Historical backlog, not current implementation status.** Item 1 is corrected below; items 2–8 must be reconciled against the existing app before treating them as missing work.

1. Use the existing `apps/witnessops-app` in repository `witnessops/witnessops-web`; the earlier absence claim is superseded by the source readback above.
2. Workspace / membership / asset persistence
3. A server path that reuses snapshot execution primitives **without** widening the public endpoint
4. Persist `ExternalSnapshotV1` as the run source; UI remains a projection
5. Coverage vs environment diff on successive snapshots
6. A **new** bounded Public Services runner if that profile stays in V1 — with authorization, port allowlist, and no OFFSEC executor
7. Declared API contract + drift test for app routes
8. Honest free-to-paid boundary (save snapshot vs repeat/history)

The [original prototype-era V1 exclusions](https://github.com/witnessops/witnessops-demo-ui/blob/4887c0fc5f2ac6742de0f4c9e11cb11e8603ade4/docs/WITNESSOPS_ALIGNMENT.md#8-what-needs-to-be-built-for-the-authenticated-product) remain historical reference, not current product approval.

---

## 9. Known semantic mismatches

| Prototype UI | Production contract |
|---|---|
| Pill **Clear** | `OBSERVED_EXPECTED` / public UI “Observed as expected”. Clear still means the named check matched, not that the asset is safe. |
| Undetermined pill | `UNDETERMINED` **and** `CHECK_ERROR`. Compact summaries fold collection errors into undetermined. Provenance keeps the contract status. |
| DMARC `p=none` | Production: **INFORMATIONAL**. Prototype now matches. Older prototype treated it as needs attention. |
| Combined “HTTP security headers” | Production splits `web.hsts.v1` and `web.security_headers.v1`. |
| Public snapshot included ports / tech / admin paths | Production public snapshot does not. Ports other than 80/443 are excluded. Prototype public check now uses the real ten. |
| `check_version` | Production uses `external-demo-v0.1` for every snapshot check. |
| Run “complete” | Production also has `collected` per check and CHECK_ERROR. Prototype records `completionState` complete/partial. |
| Mail Exposure | Product profile composes SPF/DMARC first. OFFSEC email-posture is broader and engagement-gated. |
| Certificate Watch | Product subset = `tls.certificate.v1` + `tls.legacy_protocols.v1`. OFFSEC `tls-review` is nmap/nuclei. |
| Public Services | Mocked authorized-active profile. Approval is recorded as `explicit` in provenance; no approval UI in the demo. |

---

## 10. Recommended migration path into `apps/witnessops-app`

Historical migration outline, not a fresh instruction to repeat implemented work. Reconcile the remaining steps against the existing app and its current contracts first:

1. Continue in the existing `apps/witnessops-app` beside `apps/witnessops-web` in repository `witnessops/witnessops-web`; do not create a duplicate application.
2. Extract or import `external-exposure/contracts.ts` (and later the runner) as a shared package. Do not copy a second check taxonomy.
3. Keep `POST /api/external-exposure` as the public hostname snapshot. Add **new** authenticated routes for workspace runs. Put those routes in a declared API inventory with a drift test.
4. Persist the runner’s `ExternalSnapshotV1` as the source artifact for each hostname run. Derive the customer observation list from it.
5. Map statuses with the table in §9. Do not invent pass/fail.
6. Leave Public Services and OFFSEC runbooks disconnected until a separate bounded product runner exists.

Customer UI can stay: Add asset → recommended checks → observe → inspect → rerun → see what changed.

---

## 11. Prototype persist version

Persisted demo state is `witnessops-prototype-v6` (`version: 6`).

Migrating from v5 or earlier resets workspace, asset, run, and runbook state. That prevents previous short check IDs (`tls`, `headers`, `spf`, …) mixing with the aligned contract IDs (`tls.certificate.v1`, `web.security_headers.v1`, `mail.spf.v1`, …).

