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

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  primaryDomain: string;
  createdAt: string;
  mark: string;
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

export interface Observation {
  id: string;
  category: string;
  name: string;
  status: ObservationStatus;
  summary: string;
  checked: string;
  observed: string;
  evidence: EvidenceItem[];
  whyItMatters: string;
  remainsUnknown: string;
  method: string;
  observedAt: string;
}

export interface ExposureRun {
  id: string;
  workspaceId: string;
  domain: string;
  observedAt: string;
  savedAt?: string;
  checkset: string;
  checksetVersion: string;
  initiator: string;
  status: "completed";
  observations: Observation[];
  source: "workspace" | "public";
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
  observations: Observation[];
}

export interface RunningCheck {
  domain: string;
  workspaceId?: string;
  observedAt: string;
}
