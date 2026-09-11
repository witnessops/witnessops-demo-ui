import type { Cadence, ImplementationClass } from "./checks";
import type { CheckStatus } from "./contracts";

export type Role = "owner" | "viewer";

export type ObservationStatus =
  | "clear"
  | "needs_attention"
  | "undetermined"
  | "informational";

export type DiffLabel =
  | "changed"
  | "unchanged"
  | "new_check"
  | "no_longer_checked"
  | "undetermined";

export type MemberStatus = "active" | "invited";

export type AssetType = "domain" | "hostname" | "public_ip" | "server";

/** Product execution class. Maps from OFFSEC passive/active, not a 1:1 copy. */
export type RunbookKind = "public_observation" | "authorized_active";

export type ApprovalRequirement = "none" | "explicit";

export type ProvenanceSource = "witnessops-web" | "witnessops-offsec" | "mock";

export type RunbookTemplateId = "web" | "mail" | "public-services" | "certificate";

export type CompletionState = "complete" | "partial";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CheckProfile {
  checkIds: string[];
  cadence: Cadence;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  primaryDomain: string;
  createdAt: string;
  mark: string;
  exposureActive: boolean;
  checkProfile: CheckProfile;
}

export interface Asset {
  id: string;
  workspaceId: string;
  name: string;
  type: AssetType;
  runbookId: string;
  createdAt: string;
}

export interface RunbookProvenance {
  source: ProvenanceSource;
  sourceContract?: string;
  sourceRunbook?: string;
  approvalRequirement: ApprovalRequirement;
}

export interface Runbook {
  id: string;
  workspaceId: string;
  templateId: RunbookTemplateId;
  name: string;
  version: string;
  description: string;
  checkIds: string[];
  ports: number[];
  cadence: Cadence;
  kind: RunbookKind;
  supportedAssetTypes: AssetType[];
  updatedAt: string;
  provenance?: RunbookProvenance;
}

export interface Member {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
}

export interface EvidenceItem {
  label: string;
  value: string;
}

/**
 * UI projection of one check result.
 *
 * Source fields (checkId, contractStatus, collected, interpretation,
 * limitations, recommendation, sourceEvidenceRefs) are shaped after
 * ExternalCheckResultV1 so a real snapshot can be persisted later.
 */
export interface Observation {
  id: string;
  category: string;
  name: string;
  status: ObservationStatus;
  statusLabel?: string;
  summary: string;
  checked: string;
  observed: string;
  evidence: EvidenceItem[];
  whyItMatters: string;
  remainsUnknown: string;
  method: string;
  observedAt: string;
  checkId?: string;
  checkVersion?: string;
  contractStatus?: CheckStatus;
  collected?: boolean;
  interpretation?: string;
  limitations?: string[];
  recommendation?: string | null;
  sourceEvidenceRefs?: string[];
  implementation?: ImplementationClass;
  startedAt?: string;
  finishedAt?: string;
}

export interface ExposureRun {
  id: string;
  workspaceId: string;
  domain: string;
  observedAt: string;
  savedAt?: string;
  checkset: string;
  checksetVersion: string;
  checkIds: string[];
  initiator: string;
  status: "completed";
  observations: Observation[];
  source: "workspace" | "public";
  assetId?: string;
  runbookId?: string;
  runbookName?: string;
  runbookVersion?: string;
  ports?: number[];
  kind?: RunbookKind;
  snapshotVersion?: string;
  completionState?: CompletionState;
  sourceDigest?: string;
}

export interface Summary {
  total: number;
  completed: number;
  needsAttention: number;
  clear: number;
  informational: number;
  undetermined: number;
}

export interface PendingSave {
  domain: string;
  observedAt: string;
  checkset: string;
  checksetVersion: string;
  checkIds: string[];
  observations: Observation[];
}

export interface RunningCheck {
  domain: string;
  workspaceId?: string;
  observedAt: string;
  checkIds: string[];
  source?: ExposureRun["source"];
  assetId?: string;
  runbookId?: string;
  ports?: number[];
}
