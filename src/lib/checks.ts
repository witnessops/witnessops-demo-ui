import {
  CONTRACT_STATUS_LABEL,
  EXTERNAL_VERSION,
  MOCK_CHECK_VERSION,
  SNAPSHOT_CHECK_IDS,
  SNAPSHOT_METHODS,
  SNAPSHOT_TITLES,
  type CheckStatus,
} from "./contracts";

export type CheckGroupId = "web" | "dns" | "email" | "exposure";
export type Cadence = "manual" | "weekly" | "daily";
export type ImplementationClass =
  | "REAL_NOW"
  | "REUSABLE_PRIMITIVE"
  | "OFFSEC_GOVERNED"
  | "MOCK_ONLY";

export interface CheckDef {
  id: string;
  group: CheckGroupId;
  name: string;
  blurb: string;
  core: boolean;
  /** Same as id for REAL_NOW snapshot checks. */
  contractId: string;
  implementation: ImplementationClass;
  checkVersion: string;
  method: string;
}

export interface CheckGroup {
  id: CheckGroupId;
  label: string;
}

export const CHECK_GROUPS: CheckGroup[] = [
  { id: "web", label: "Web presence" },
  { id: "dns", label: "Domain & DNS" },
  { id: "email", label: "Email" },
  { id: "exposure", label: "Public services" },
];

function snapshotCheck(
  id: (typeof SNAPSHOT_CHECK_IDS)[number],
  group: CheckGroupId,
  blurb: string,
): CheckDef {
  return {
    id,
    group,
    name: SNAPSHOT_TITLES[id],
    blurb,
    core: true,
    contractId: id,
    implementation: "REAL_NOW",
    checkVersion: EXTERNAL_VERSION,
    method: SNAPSHOT_METHODS[id],
  };
}

export const CHECK_CATALOG: CheckDef[] = [
  snapshotCheck(
    "dns.public_target.v1",
    "dns",
    "Whether public resolvers return connection-eligible addresses for the hostname.",
  ),
  snapshotCheck(
    "tls.certificate.v1",
    "web",
    "Whether the hostname presents a trusted certificate that matches its name.",
  ),
  snapshotCheck(
    "tls.legacy_protocols.v1",
    "web",
    "Whether TLS 1.0 or TLS 1.1 can still be negotiated.",
  ),
  snapshotCheck(
    "web.https_redirect.v1",
    "web",
    "Whether the HTTP root request transitions to a usable HTTPS response.",
  ),
  snapshotCheck(
    "web.hsts.v1",
    "web",
    "Whether the HTTPS response includes Strict-Transport-Security with a positive max-age.",
  ),
  snapshotCheck(
    "web.security_headers.v1",
    "web",
    "Whether nosniff, a framing policy, CSP and Referrer-Policy appear on the HTTPS response.",
  ),
  snapshotCheck(
    "web.security_txt.v1",
    "web",
    "Whether a security.txt contact file is published at the well-known path.",
  ),
  snapshotCheck(
    "mail.spf.v1",
    "email",
    "Whether an SPF record is published for the hostname, and what it declares.",
  ),
  snapshotCheck(
    "mail.dmarc.v1",
    "email",
    "Whether a DMARC policy is published, and whether it asks receivers to monitor or enforce.",
  ),
  snapshotCheck(
    "dns.caa.v1",
    "dns",
    "Whether CAA issuance restrictions are published within the registrable-domain boundary.",
  ),
  {
    id: "mail.mx.v1",
    group: "email",
    name: "MX",
    blurb: "Whether public MX records point the domain at a mail host.",
    core: true,
    contractId: "mail.mx.v1",
    implementation: "REUSABLE_PRIMITIVE",
    checkVersion: MOCK_CHECK_VERSION,
    method: "DNS MX lookup at the submitted hostname.",
  },
  {
    id: "mail.dkim.v1",
    group: "email",
    name: "DKIM selectors",
    blurb: "Whether common DKIM selectors are visible in public DNS.",
    core: false,
    contractId: "mail.dkim.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "DNS TXT lookup of a short list of common DKIM selectors.",
  },
  {
    id: "mail.host.v1",
    group: "email",
    name: "Mail host exposure",
    blurb: "Whether the published mail host presents a public mail service.",
    core: false,
    contractId: "mail.host.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "Bounded connection to the published mail host. Not a mail-server test.",
  },
  {
    id: "web.technology_signals.v1",
    group: "web",
    name: "Public technology signals",
    blurb: "What libraries, servers or CDNs are visible without logging in.",
    core: false,
    contractId: "web.technology_signals.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "Inspection of public HTTP response headers and HTML references.",
  },
  {
    id: "dns.ct_names.v1",
    group: "dns",
    name: "Certificate transparency names",
    blurb: "Names on the presented certificate and matching public CT log entries.",
    core: false,
    contractId: "dns.ct_names.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "Inspection of the presented certificate and a public CT log query.",
  },
  {
    id: "web.common_interfaces.v1",
    group: "web",
    name: "Common exposed interfaces",
    blurb: "Whether a few commonly guessed admin paths return an application.",
    core: false,
    contractId: "web.common_interfaces.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "Unauthenticated GET of a short list of commonly guessed paths.",
  },
  {
    id: "net.public_banner.v1",
    group: "exposure",
    name: "Public banners",
    blurb: "Whether a short identifying banner is returned by an observed service.",
    core: false,
    contractId: "net.public_banner.v1",
    implementation: "MOCK_ONLY",
    checkVersion: MOCK_CHECK_VERSION,
    method: "Read of a short identifying banner from an observed service.",
  },
];

export const ALL_CHECK_IDS = CHECK_CATALOG.map((check) => check.id);

export const PUBLIC_CHECK_IDS = [...SNAPSHOT_CHECK_IDS];

export const OPTIONAL_CHECK_IDS = CHECK_CATALOG.filter((check) => !check.core).map(
  (check) => check.id,
);

export function defaultCheckProfile() {
  return {
    checkIds: [...PUBLIC_CHECK_IDS],
    cadence: "manual" as Cadence,
  };
}

export function subscribedCheckProfile() {
  return {
    checkIds: [...PUBLIC_CHECK_IDS],
    cadence: "weekly" as Cadence,
  };
}

export function checkById(id: string) {
  return CHECK_CATALOG.find((check) => check.id === id);
}

export function stepsForIds(ids: string[]) {
  const allowed = new Set(ids);
  return CHECK_CATALOG.filter((check) => allowed.has(check.id));
}

export function profileCountLabel(count: number) {
  return count === 1 ? "1 check enabled" : `${count} checks enabled`;
}

export function cadenceLabel(cadence: Cadence) {
  switch (cadence) {
    case "manual":
      return "Manual only";
    case "weekly":
      return "Weekly";
    case "daily":
      return "Daily";
  }
}

export function publicCheckset() {
  return {
    checkset: "Public snapshot",
    checksetVersion: EXTERNAL_VERSION,
    checkIds: [...PUBLIC_CHECK_IDS],
  };
}

export function workspaceCheckset(checkIds: string[]) {
  return {
    checkset: "Workspace profile",
    checksetVersion: `${checkIds.length}-checks`,
    checkIds: [...checkIds],
  };
}

/**
 * UI projection of contract statuses.
 *
 * Clear ← OBSERVED_EXPECTED
 *   Production public UI says "Observed as expected". The prototype keeps
 *   "Clear" as the compact pill. It still means the named check matched its
 *   expected observation, not that the asset is safe.
 *
 * Needs attention ← NEEDS_ATTENTION
 * Informational ← INFORMATIONAL
 * Undetermined ← UNDETERMINED and CHECK_ERROR
 *   CHECK_ERROR is a collection failure. Compact summaries fold it into
 *   undetermined. Provenance keeps the contract status and collected=false.
 */
export function uiStatus(
  status: CheckStatus,
): "clear" | "needs_attention" | "informational" | "undetermined" {
  switch (status) {
    case "OBSERVED_EXPECTED":
      return "clear";
    case "NEEDS_ATTENTION":
      return "needs_attention";
    case "INFORMATIONAL":
      return "informational";
    case "UNDETERMINED":
    case "CHECK_ERROR":
      return "undetermined";
  }
}

export function contractStatusFromUi(
  status: "clear" | "needs_attention" | "informational" | "undetermined",
  collected = true,
): CheckStatus {
  if (!collected) return "CHECK_ERROR";
  switch (status) {
    case "clear":
      return "OBSERVED_EXPECTED";
    case "needs_attention":
      return "NEEDS_ATTENTION";
    case "informational":
      return "INFORMATIONAL";
    case "undetermined":
      return "UNDETERMINED";
  }
}

export function contractStatusLabel(status: CheckStatus) {
  return CONTRACT_STATUS_LABEL[status];
}

export function implementationLabel(implementation: ImplementationClass) {
  switch (implementation) {
    case "REAL_NOW":
      return "Backed by the public hostname snapshot.";
    case "REUSABLE_PRIMITIVE":
      return "Not a standalone public snapshot check.";
    case "MOCK_ONLY":
      return "Not currently backed by the public hostname runner.";
    case "OFFSEC_GOVERNED":
      return "Governed OFFSEC workflow — not self-service.";
  }
}

