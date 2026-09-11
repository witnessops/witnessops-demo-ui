/**
 * Demo-local mirror of the witnessops-web External Exposure snapshot contract.
 *
 * Source of truth:
 *   apps/witnessops-web/src/lib/external-exposure/contracts.ts
 *
 * This file exists so a future apps/witnessops-app integration can persist a
 * real ExternalSnapshotV1 with minimal transformation. The customer UI still
 * projects these fields into friendly labels. Do not invent a second evidence
 * model.
 *
 * The public POST /api/external-exposure handler stays a hostname-only
 * snapshot. It must not be widened to IPs, ports, or authenticated product
 * actions. See docs/WITNESSOPS_ALIGNMENT.md.
 */

export const EXTERNAL_VERSION = "external-demo-v0.1" as const;
export const MOCK_CHECK_VERSION = "mock-v0.1" as const;

export const SNAPSHOT_CHECK_IDS = [
  "dns.public_target.v1",
  "tls.certificate.v1",
  "tls.legacy_protocols.v1",
  "web.https_redirect.v1",
  "web.hsts.v1",
  "web.security_headers.v1",
  "web.security_txt.v1",
  "mail.spf.v1",
  "mail.dmarc.v1",
  "dns.caa.v1",
] as const;

export type SnapshotCheckId = (typeof SNAPSHOT_CHECK_IDS)[number];

/** Contract statuses from ExternalCheckResultV1. Not pass/fail. */
export type CheckStatus =
  | "OBSERVED_EXPECTED"
  | "NEEDS_ATTENTION"
  | "INFORMATIONAL"
  | "UNDETERMINED"
  | "CHECK_ERROR";

export const CONTRACT_STATUS_LABEL: Record<CheckStatus, string> = {
  OBSERVED_EXPECTED: "Observed as expected",
  NEEDS_ATTENTION: "Needs attention",
  INFORMATIONAL: "Informational",
  UNDETERMINED: "Undetermined",
  CHECK_ERROR: "Collection error",
};

export type ExternalCheckResultV1 = {
  check_id: string;
  check_version: string;
  target: string;
  started_at: string;
  finished_at: string;
  status: CheckStatus;
  method: string;
  title: string;
  observation: unknown;
  evidence: string[];
  interpretation: string;
  limitations: string[];
  recommendation: string | null;
  collected: boolean;
};

export type BudgetUsage = {
  dns: number;
  normalTls: number;
  legacyTls: number;
  http: number;
  redirects: number;
};

export type NetworkEvent = {
  kind: "dns" | "connect" | "http" | "redirect";
  hostname: string;
  detail: string;
  address?: string;
  port?: 80 | 443;
};

export type ExternalSnapshotV1 = {
  version: string;
  target: string;
  started_at: string;
  finished_at: string;
  checks: ExternalCheckResultV1[];
  usage: BudgetUsage;
  network: NetworkEvent[];
};

export const SNAPSHOT_BOUNDARY =
  "This snapshot covers ten defined public observations against the submitted hostname at the recorded time. It does not establish the absence of vulnerabilities and does not constitute a penetration test, complete attack-surface assessment, certification, compliance assessment, or assurance opinion.";

export const EXCLUSIONS = [
  "Application vulnerability exploitation",
  "Authenticated functionality",
  "Credentials and brute force",
  "Ports other than 80/443",
  "Internal infrastructure",
  "Cloud/IAM configuration",
  "Complete subdomain discovery",
  "Agent permissions and internal controls",
  "Malware",
  "Full TLS/cipher audit",
  "Complete mail architecture",
] as const;

export const SNAPSHOT_TITLES: Record<SnapshotCheckId, string> = {
  "dns.public_target.v1": "Public DNS target",
  "tls.certificate.v1": "TLS certificate state",
  "tls.legacy_protocols.v1": "Legacy TLS protocols",
  "web.https_redirect.v1": "HTTP to HTTPS transition",
  "web.hsts.v1": "HTTP Strict Transport Security",
  "web.security_headers.v1": "Browser security headers",
  "web.security_txt.v1": "Vulnerability reporting contact",
  "mail.spf.v1": "SPF publication",
  "mail.dmarc.v1": "DMARC publication",
  "dns.caa.v1": "CAA publication",
};

export const SNAPSHOT_METHODS: Record<SnapshotCheckId, string> = {
  "dns.public_target.v1":
    "Controlled A and AAAA resolution; reject every non-global candidate before application traffic.",
  "tls.certificate.v1":
    "One TLS handshake to a validated address on 443, with logical hostname SNI and certificate hostname validation.",
  "tls.legacy_protocols.v1":
    "At most one TLS 1.0 and one TLS 1.1 attempt, without cipher enumeration.",
  "web.https_redirect.v1":
    "GET the HTTP root and follow at most three HTTP/HTTPS redirects, validating each new connection.",
  "web.hsts.v1":
    "Parse Strict-Transport-Security from the shared final usable HTTPS response.",
  "web.security_headers.v1":
    "Inspect nosniff, framing protection, CSP and Referrer-Policy on the shared HTTPS response.",
  "web.security_txt.v1":
    "At most two HTTPS GETs: /.well-known/security.txt, then /security.txt if needed; 64 KiB each.",
  "mail.spf.v1":
    "TXT and MX at the submitted hostname. Bounded publication syntax only; no mechanism recursion.",
  "mail.dmarc.v1":
    "TXT at _dmarc.hostname and the shared MX observation. No contact with reporting destinations.",
  "dns.caa.v1":
    "Recursive resolver CAA lookup and parent inheritance, at most five names, bounded by the PSL registrable domain.",
};

export function isSnapshotCheckId(id: string): id is SnapshotCheckId {
  return (SNAPSHOT_CHECK_IDS as readonly string[]).includes(id);
}
