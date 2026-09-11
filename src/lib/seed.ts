import {
  ALL_CHECK_IDS,
  PUBLIC_CHECK_IDS,
  publicCheckset,
  subscribedCheckProfile,
  workspaceCheckset,
} from "./checks";
import { buildObservations, observationsForDomain } from "./observations";
import type { ExposureRun, Member, User, Workspace } from "./types";

export const KAROL: User = {
  id: "user-karol",
  name: "Karol",
  email: "karol@acme.com",
};

export const FROZEN_OBSERVED_AT = "2026-09-11T12:31:00.000Z";
export const RUN3_AT = "2026-09-04T09:12:00.000Z";
export const RUN2_AT = "2026-08-28T16:04:00.000Z";
export const MSP_AT = "2026-09-09T14:20:00.000Z";
export const JONES_LATEST_AT = "2026-09-08T11:05:00.000Z";
export const JONES_PREV_AT = "2026-08-20T08:40:00.000Z";

export const ACME_WORKSPACE: Workspace = {
  id: "ws-acme",
  slug: "acme",
  name: "Acme Ltd",
  primaryDomain: "acme.com",
  createdAt: "2026-08-12T10:00:00.000Z",
  mark: "#c8b896",
  exposureActive: true,
  checkProfile: subscribedCheckProfile(),
};

export const MSP_WORKSPACE: Workspace = {
  id: "ws-msp",
  slug: "my-msp",
  name: "My MSP",
  primaryDomain: "mymsp.io",
  createdAt: "2026-06-02T10:00:00.000Z",
  mark: "#8fa3b8",
  exposureActive: true,
  checkProfile: subscribedCheckProfile(),
};

export const JONES_WORKSPACE: Workspace = {
  id: "ws-jones",
  slug: "jones",
  name: "Jones Manufacturing",
  primaryDomain: "jonesmfg.com",
  createdAt: "2026-07-18T10:00:00.000Z",
  mark: "#9aab8e",
  exposureActive: true,
  checkProfile: subscribedCheckProfile(),
};

export function companionWorkspaces(): Workspace[] {
  return [{ ...MSP_WORKSPACE }, { ...JONES_WORKSPACE }];
}

export function companionMembers(user: User): Member[] {
  return [
    {
      id: "mem-msp-karol",
      workspaceId: MSP_WORKSPACE.id,
      name: user.name,
      email: user.email,
      role: "owner",
      status: "active",
    },
    {
      id: "mem-jones-dana",
      workspaceId: JONES_WORKSPACE.id,
      name: "Dana Jones",
      email: "dana@jonesmfg.com",
      role: "owner",
      status: "active",
    },
    {
      id: "mem-jones-karol",
      workspaceId: JONES_WORKSPACE.id,
      name: user.name,
      email: user.email,
      role: "viewer",
      status: "active",
    },
  ];
}

export function companionRuns(): ExposureRun[] {
  const mspMeta = workspaceCheckset(ALL_CHECK_IDS);
  const jonesMeta = workspaceCheckset(ALL_CHECK_IDS);
  const jonesPrevIds = ALL_CHECK_IDS.filter((id) => id !== "dkim" && id !== "domain");
  return [
    {
      id: "run-msp-1",
      workspaceId: MSP_WORKSPACE.id,
      domain: "mymsp.io",
      observedAt: MSP_AT,
      ...mspMeta,
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForDomain("mymsp.io", MSP_AT, ALL_CHECK_IDS),
    },
    {
      id: "run-jones-2",
      workspaceId: JONES_WORKSPACE.id,
      domain: "jonesmfg.com",
      observedAt: JONES_LATEST_AT,
      ...jonesMeta,
      initiator: "Dana Jones",
      status: "completed",
      source: "workspace",
      observations: observationsForDomain("jonesmfg.com", JONES_LATEST_AT, ALL_CHECK_IDS),
    },
    {
      id: "run-jones-1",
      workspaceId: JONES_WORKSPACE.id,
      domain: "jonesmfg.com",
      observedAt: JONES_PREV_AT,
      checkset: "Workspace profile",
      checksetVersion: `${jonesPrevIds.length}-checks`,
      checkIds: jonesPrevIds,
      initiator: "Dana Jones",
      status: "completed",
      source: "workspace",
      observations: buildObservations("jonesmfg.com", "mid", JONES_PREV_AT, jonesPrevIds),
    },
  ];
}

export function acmeHistoryRuns(workspaceId: string): ExposureRun[] {
  const latestMeta = workspaceCheckset(ALL_CHECK_IDS);
  const midIds = ALL_CHECK_IDS.filter((id) => id !== "dkim");
  const earlyIds = PUBLIC_CHECK_IDS.filter((id) => id !== "tech" && id !== "securitytxt");
  return [
    {
      id: "run-4",
      workspaceId,
      domain: "acme.com",
      observedAt: FROZEN_OBSERVED_AT,
      ...latestMeta,
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: buildObservations("acme.com", "latest", FROZEN_OBSERVED_AT, ALL_CHECK_IDS),
    },
    {
      id: "run-3",
      workspaceId,
      domain: "acme.com",
      observedAt: RUN3_AT,
      checkset: "Workspace profile",
      checksetVersion: `${midIds.length}-checks`,
      checkIds: midIds,
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: buildObservations("acme.com", "mid", RUN3_AT, midIds),
    },
    {
      id: "run-2",
      workspaceId,
      domain: "acme.com",
      observedAt: RUN2_AT,
      ...publicCheckset(),
      checkIds: earlyIds,
      checkset: "Public snapshot",
      checksetVersion: "public",
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: buildObservations("acme.com", "early", RUN2_AT, earlyIds),
    },
  ];
}

export function nextRunId(existing: ExposureRun[]) {
  const nums = existing
    .map((run) => {
      const match = /run-(?:[a-z]+-)?(\d+)/.exec(run.id);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `run-${max + 1}`;
}

export const MARK_PALETTE = ["#c8b896", "#8fa3b8", "#9aab8e", "#b59a8a", "#8a9aa8"];
