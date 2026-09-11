import { PUBLIC_CHECK_IDS } from "./checks";
import { DEFAULT_PUBLIC_SERVICE_PORTS } from "./ports";
import type {
  AssetType,
  Runbook,
  RunbookKind,
  RunbookProvenance,
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
  provenance: RunbookProvenance;
}

export const RUNBOOK_TEMPLATES: RunbookTemplate[] = [
  {
    templateId: "web",
    name: "Web Exposure",
    version: "1.2",
    description:
      "The ten public External Exposure observations for a domain or hostname.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: [...PUBLIC_CHECK_IDS],
    optionalCheckIds: [
      "web.technology_signals.v1",
      "dns.ct_names.v1",
      "web.common_interfaces.v1",
    ],
    defaultPorts: [],
    cadence: "weekly",
    provenance: {
      source: "witnessops-web",
      sourceContract: "ExternalSnapshotV1",
      approvalRequirement: "none",
    },
  },
  {
    templateId: "mail",
    name: "Mail Exposure",
    version: "1.0",
    description:
      "Public mail DNS observations, composing the existing SPF and DMARC snapshot checks first.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: [
      "mail.spf.v1",
      "mail.dmarc.v1",
      "mail.mx.v1",
      "tls.certificate.v1",
    ],
    optionalCheckIds: ["mail.dkim.v1", "mail.host.v1"],
    defaultPorts: [],
    cadence: "weekly",
    provenance: {
      source: "witnessops-web",
      sourceContract: "ExternalSnapshotV1",
      sourceRunbook: "email-posture-discovery",
      approvalRequirement: "none",
    },
  },
  {
    templateId: "public-services",
    name: "Public Services",
    version: "1.1",
    description:
      "Bounded TCP reachability and public service observations for an address you are authorized to assess.",
    kind: "authorized_active",
    supportedAssetTypes: ["public_ip", "hostname", "server"],
    checkIds: [
      "tls.certificate.v1",
      "web.security_headers.v1",
      "net.public_banner.v1",
    ],
    optionalCheckIds: ["net.public_banner.v1"],
    defaultPorts: [...DEFAULT_PUBLIC_SERVICE_PORTS],
    cadence: "manual",
    provenance: {
      source: "mock",
      approvalRequirement: "explicit",
    },
  },
  {
    templateId: "certificate",
    name: "Certificate Watch",
    version: "1.0",
    description:
      "The TLS certificate and legacy-protocol observations already supported by the public snapshot.",
    kind: "public_observation",
    supportedAssetTypes: ["domain", "hostname"],
    checkIds: ["tls.certificate.v1", "tls.legacy_protocols.v1"],
    optionalCheckIds: ["dns.ct_names.v1"],
    defaultPorts: [],
    cadence: "weekly",
    provenance: {
      source: "witnessops-web",
      sourceContract: "ExternalSnapshotV1",
      sourceRunbook: "tls-review",
      approvalRequirement: "none",
    },
  },
];

/** Older Web Exposure profile used to demonstrate coverage change. */
export const WEB_EXPOSURE_V11_CHECK_IDS = [
  "dns.public_target.v1",
  "tls.certificate.v1",
  "tls.legacy_protocols.v1",
  "web.https_redirect.v1",
  "web.hsts.v1",
  "web.security_headers.v1",
  "mail.spf.v1",
  "mail.dmarc.v1",
  "dns.caa.v1",
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
    provenance: { ...template.provenance },
  }));
}

export function profileName(runbook: Pick<Runbook, "name">) {
  return runbook.name;
}

export function methodLabel(runbook: Pick<Runbook, "name" | "version">) {
  return `${runbook.name} ${runbook.version}`;
}

export function runbookLabel(runbook: Pick<Runbook, "name" | "version">) {
  return methodLabel(runbook);
}

export function profileNameFromRun(run: {
  runbookName?: string;
  checkset: string;
}) {
  return run.runbookName ?? run.checkset;
}

export function methodLabelFromRun(run: {
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

export function runbookLabelFromRun(run: {
  runbookName?: string;
  runbookVersion?: string;
  checkset: string;
  checksetVersion: string;
}) {
  return methodLabelFromRun(run);
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

export function observeActionLabel(templateId?: RunbookTemplateId | string) {
  return templateId === "public-services"
    ? "Observe public services"
    : "Add and observe";
}
