export type CheckGroupId = "web" | "dns" | "email" | "exposure";
export type Cadence = "manual" | "weekly" | "daily";

export interface CheckDef {
  id: string;
  group: CheckGroupId;
  name: string;
  blurb: string;
  core: boolean;
}

export interface CheckGroup {
  id: CheckGroupId;
  label: string;
}

export const CHECK_GROUPS: CheckGroup[] = [
  { id: "web", label: "Web presence" },
  { id: "dns", label: "Domain & DNS" },
  { id: "email", label: "Email" },
  { id: "exposure", label: "Public exposure" },
];

export const CHECK_CATALOG: CheckDef[] = [
  {
    id: "tls",
    group: "web",
    name: "TLS & certificates",
    blurb: "Whether the hostname presents a publicly trusted certificate.",
    core: true,
  },
  {
    id: "headers",
    group: "web",
    name: "HTTP security headers",
    blurb: "Which common security headers appear on the apex HTTPS response.",
    core: true,
  },
  {
    id: "tech",
    group: "web",
    name: "Public technology signals",
    blurb: "What libraries, servers or CDNs are visible without logging in.",
    core: true,
  },
  {
    id: "securitytxt",
    group: "web",
    name: "security.txt",
    blurb: "Whether a contact file is published at the well-known path.",
    core: true,
  },
  {
    id: "dns",
    group: "dns",
    name: "DNS configuration",
    blurb: "Whether public resolvers receive ordinary answers for the hostname.",
    core: true,
  },
  {
    id: "certificate",
    group: "dns",
    name: "Certificate transparency",
    blurb: "Names on the presented certificate and matching public CT log entries.",
    core: true,
  },
  {
    id: "domain",
    group: "dns",
    name: "Domain observations",
    blurb: "CAA publication and whether the apex nameserver set looks ordinary.",
    core: false,
  },
  {
    id: "spf",
    group: "email",
    name: "SPF",
    blurb: "Whether an SPF record is published for the domain.",
    core: true,
  },
  {
    id: "dkim",
    group: "email",
    name: "DKIM",
    blurb: "Whether common DKIM selectors are visible in public DNS.",
    core: false,
  },
  {
    id: "dmarc",
    group: "email",
    name: "DMARC",
    blurb: "Whether a DMARC policy is published, and what it declares.",
    core: true,
  },
  {
    id: "services",
    group: "exposure",
    name: "Publicly observable services",
    blurb: "A short allowlisted set of commonly exposed ports.",
    core: true,
  },
  {
    id: "exposure",
    group: "exposure",
    name: "Common exposed interfaces",
    blurb: "Whether a few commonly guessed admin paths return an application.",
    core: true,
  },
];

export const ALL_CHECK_IDS = CHECK_CATALOG.map((check) => check.id);

export const PUBLIC_CHECK_IDS = CHECK_CATALOG.filter((check) => check.core).map(
  (check) => check.id,
);

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
    checkIds: [...ALL_CHECK_IDS],
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
    checksetVersion: "public",
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
