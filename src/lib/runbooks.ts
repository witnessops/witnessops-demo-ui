import { DEFAULT_PUBLIC_SERVICE_PORTS } from "./ports";
import type {
  AssetType,
  Runbook,
  RunbookKind,
  RunbookTemplateId,
} from "./types";

export interface RunbookTemplate {
  templateId: RunbookTemplateId;
  name: string;
  version: string;
  description: string;
  kind: RunbookKind;
  supportedAssetTypes: AssetType[];
  checkIds: string[];
  optionalCheckIds: string[];
  defaultPorts: number[];
  cadence: Runbook["cadence"];
}

export const RUNBOOK_TEMPLATES: RunbookTemplate[] = [
  {
    templateId: "web",
    name: "Web Exposure",
    version: "1.2",
    description:
      "Public DNS, TLS, HTTP and related signals for a domain or hostname.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: [
      "dns",
      "tls",
      "http",
      "headers",
      "tech",
      "securitytxt",
      "certificate",
      "exposure",
    ],
    optionalCheckIds: ["domain"],
    defaultPorts: [],
    cadence: "weekly",
  },
  {
    templateId: "mail",
    name: "Mail Exposure",
    version: "1.0",
    description:
      "Public mail DNS records and bounded observations of the mail host.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: ["mx", "spf", "dkim", "dmarc", "tls", "mailhost"],
    optionalCheckIds: ["dkim"],
    defaultPorts: [],
    cadence: "weekly",
  },
  {
    templateId: "public-services",
    name: "Public Services",
    version: "1.1",
    description:
      "Bounded TCP reachability and public service observations for an address you are authorized to assess.",
    kind: "authorized_active",
    supportedAssetTypes: ["public_ip", "hostname", "server"],
    checkIds: ["tls", "headers", "banner"],
    optionalCheckIds: ["banner"],
    defaultPorts: [...DEFAULT_PUBLIC_SERVICE_PORTS],
    cadence: "manual",
  },
  {
    templateId: "certificate",
    name: "Certificate Watch",
    version: "1.0",
    description:
      "Presented certificate, issuer, expiry, SANs and public CT visibility.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: ["tls", "certificate"],
    optionalCheckIds: [],
    defaultPorts: [],
    cadence: "weekly",
  },
];

export const WEB_EXPOSURE_V11_CHECK_IDS = [
  "dns",
  "tls",
  "http",
  "headers",
  "certificate",
  "exposure",
  "securitytxt",
];

export function templateById(id: RunbookTemplateId) {
  return RUNBOOK_TEMPLATES.find((item) => item.templateId === id);
}

export function suggestedTemplate(type: AssetType) {
  if (type === "public_ip" || type === "server") {
    return templateById("public-services")!;
  }
  return templateById("web")!;
}

export function runbookIdFor(workspaceId: string, templateId: RunbookTemplateId) {
  return `rb-${workspaceId}-${templateId}`;
}

export function instantiateRunbooks(
  workspaceId: string,
  updatedAt: string,
): Runbook[] {
  return RUNBOOK_TEMPLATES.map((template) => ({
    id: runbookIdFor(workspaceId, template.templateId),
    workspaceId,
    templateId: template.templateId,
    name: template.name,
    version: template.version,
    description: template.description,
    checkIds: [...template.checkIds],
    ports: [...template.defaultPorts],
    cadence: template.cadence,
    kind: template.kind,
    supportedAssetTypes: [...template.supportedAssetTypes],
    updatedAt,
  }));
}

export function runbookLabel(runbook: Pick<Runbook, "name" | "version">) {
  return `${runbook.name} ${runbook.version}`;
}

export function runbookLabelFromRun(run: {
  runbookName?: string;
  runbookVersion?: string;
  checkset: string;
  checksetVersion: string;
}) {
  const name = run.runbookName ?? run.checkset;
  const version = run.runbookVersion ?? run.checksetVersion;
  if (!version || version === name || version === "public") return name;
  return `${name} ${version}`;
}

export function kindLabel(kind: RunbookKind) {
  return kind === "authorized_active"
    ? "Authorized active check"
    : "Public observation";
}

export function assetTypeLabel(type: AssetType) {
  switch (type) {
    case "domain":
      return "Domain";
    case "hostname":
      return "Hostname";
    case "public_ip":
      return "Public IP";
    case "server":
      return "Server";
  }
}

export function compatibleRunbooks(runbooks: Runbook[], type: AssetType) {
  return runbooks.filter((runbook) =>
    runbook.supportedAssetTypes.includes(type),
  );
}

export function looksLikeIp(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value.trim());
}

export function inferAssetType(value: string): AssetType {
  const host = value.trim().toLowerCase();
  if (looksLikeIp(host)) return "public_ip";
  if (host.split(".").length > 2) return "hostname";
  return "domain";
}

export function normalizeAssetName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export function assetIdFor(workspaceId: string, name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `asset-${workspaceId}-${slug || "host"}`;
}
