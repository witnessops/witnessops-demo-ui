import {
  PUBLIC_CHECK_IDS,
  publicCheckset,
  subscribedCheckProfile,
} from "./checks";
import { DEFAULT_PUBLIC_SERVICE_PORTS } from "./ports";
import {
  WEB_EXPOSURE_V11_CHECK_IDS,
  assetIdFor,
  instantiateRunbooks,
  runbookIdFor,
  templateById,
} from "./runbooks";
import { buildObservations, observationsForRun } from "./observations";
import { completionStateFor, mockSourceDigest } from "./snapshot";
import { EXTERNAL_VERSION } from "./contracts";
import type { Asset, ExposureRun, Member, Runbook, User, Workspace } from "./types";

export const KAROL: User = {
  id: "user-karol",
  name: "Karol",
  email: "karol@acme.com",
};

export const FROZEN_OBSERVED_AT = "2026-09-11T12:31:00.000Z";
export const RUN3_AT = "2026-09-04T09:12:00.000Z";
export const RUN2_AT = "2026-08-28T16:04:00.000Z";
export const MAIL_AT = "2026-09-10T08:15:00.000Z";
export const MAIL_PREV_AT = "2026-08-27T08:40:00.000Z";
export const API_AT = "2026-09-11T10:05:00.000Z";
export const API_PREV_AT = "2026-09-04T11:20:00.000Z";
export const IP_AT = "2026-08-28T09:00:00.000Z";
export const IP_PREV_AT = "2026-08-14T09:30:00.000Z";
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

function withRunbookMeta(
  runbook: Runbook,
  extra?: Partial<Pick<ExposureRun, "checkIds" | "runbookVersion" | "ports">>,
) {
  const checkIds = extra?.checkIds ?? runbook.checkIds;
  const version = extra?.runbookVersion ?? runbook.version;
  return {
    runbookId: runbook.id,
    runbookName: runbook.name,
    runbookVersion: version,
    checkset: runbook.name,
    checksetVersion: version,
    checkIds,
    ports: extra?.ports ?? runbook.ports,
    kind: runbook.kind,
    snapshotVersion: version,
  };
}

function finalizeRuns(runs: ExposureRun[]): ExposureRun[] {
  return runs.map((run) => ({
    ...run,
    snapshotVersion:
      run.snapshotVersion ?? run.runbookVersion ?? run.checksetVersion ?? EXTERNAL_VERSION,
    completionState: completionStateFor(run.observations),
    sourceDigest: mockSourceDigest(run),
  }));
}

export function workspaceRunbooks(workspace: Workspace): Runbook[] {
  return instantiateRunbooks(workspace.id, workspace.createdAt);
}

export function primaryAsset(workspace: Workspace, type: Asset["type"] = "domain"): Asset {
  const runbookId =
    type === "public_ip" || type === "server"
      ? runbookIdFor(workspace.id, "public-services")
      : runbookIdFor(workspace.id, "web");
  return {
    id: assetIdFor(workspace.id, workspace.primaryDomain),
    workspaceId: workspace.id,
    name: workspace.primaryDomain,
    type,
    runbookId,
    createdAt: workspace.createdAt,
  };
}

export function acmeAssets(): Asset[] {
  return [
    {
      id: assetIdFor(ACME_WORKSPACE.id, "acme.com"),
      workspaceId: ACME_WORKSPACE.id,
      name: "acme.com",
      type: "domain",
      runbookId: runbookIdFor(ACME_WORKSPACE.id, "web"),
      createdAt: ACME_WORKSPACE.createdAt,
    },
    {
      id: assetIdFor(ACME_WORKSPACE.id, "mail.acme.com"),
      workspaceId: ACME_WORKSPACE.id,
      name: "mail.acme.com",
      type: "hostname",
      runbookId: runbookIdFor(ACME_WORKSPACE.id, "mail"),
      createdAt: "2026-09-02T10:00:00.000Z",
    },
    {
      id: assetIdFor(ACME_WORKSPACE.id, "api.acme.com"),
      workspaceId: ACME_WORKSPACE.id,
      name: "api.acme.com",
      type: "hostname",
      runbookId: runbookIdFor(ACME_WORKSPACE.id, "web"),
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: assetIdFor(ACME_WORKSPACE.id, "203.0.113.24"),
      workspaceId: ACME_WORKSPACE.id,
      name: "203.0.113.24",
      type: "public_ip",
      runbookId: runbookIdFor(ACME_WORKSPACE.id, "public-services"),
      createdAt: "2026-08-12T10:00:00.000Z",
    },
  ];
}

export function companionAssets(): Asset[] {
  return [
    primaryAsset(MSP_WORKSPACE),
    primaryAsset(JONES_WORKSPACE),
  ];
}

export function companionRunbooks(): Runbook[] {
  return [
    ...workspaceRunbooks(MSP_WORKSPACE),
    ...workspaceRunbooks(JONES_WORKSPACE),
  ];
}

export function companionRuns(): ExposureRun[] {
  const mspWeb = instantiateRunbooks(MSP_WORKSPACE.id, MSP_WORKSPACE.createdAt).find(
    (item) => item.templateId === "web",
  )!;
  const jonesWeb = instantiateRunbooks(JONES_WORKSPACE.id, JONES_WORKSPACE.createdAt).find(
    (item) => item.templateId === "web",
  )!;
  const jonesPrevIds = WEB_EXPOSURE_V11_CHECK_IDS;
  const mspAsset = assetIdFor(MSP_WORKSPACE.id, "mymsp.io");
  const jonesAsset = assetIdFor(JONES_WORKSPACE.id, "jonesmfg.com");
  return finalizeRuns([
    {
      id: "run-msp-1",
      workspaceId: MSP_WORKSPACE.id,
      domain: "mymsp.io",
      assetId: mspAsset,
      observedAt: MSP_AT,
      ...withRunbookMeta(mspWeb),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "mymsp.io",
        observedAt: MSP_AT,
        checkIds: mspWeb.checkIds,
      }),
    },
    {
      id: "run-jones-2",
      workspaceId: JONES_WORKSPACE.id,
      domain: "jonesmfg.com",
      assetId: jonesAsset,
      observedAt: JONES_LATEST_AT,
      ...withRunbookMeta(jonesWeb),
      initiator: "Dana Jones",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "jonesmfg.com",
        observedAt: JONES_LATEST_AT,
        checkIds: jonesWeb.checkIds,
      }),
    },
    {
      id: "run-jones-1",
      workspaceId: JONES_WORKSPACE.id,
      domain: "jonesmfg.com",
      assetId: jonesAsset,
      observedAt: JONES_PREV_AT,
      ...withRunbookMeta(jonesWeb, {
        checkIds: jonesPrevIds,
        runbookVersion: "1.1",
      }),
      initiator: "Dana Jones",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "jonesmfg.com",
        observedAt: JONES_PREV_AT,
        checkIds: jonesPrevIds,
        variant: "mid",
      }),
    },
  ]);
}

export function acmeHistoryRuns(workspaceId: string): ExposureRun[] {
  const web = instantiateRunbooks(workspaceId, ACME_WORKSPACE.createdAt).find(
    (item) => item.templateId === "web",
  )!;
  const mail = instantiateRunbooks(workspaceId, ACME_WORKSPACE.createdAt).find(
    (item) => item.templateId === "mail",
  )!;
  const services = instantiateRunbooks(workspaceId, ACME_WORKSPACE.createdAt).find(
    (item) => item.templateId === "public-services",
  )!;
  const webIds = [...web.checkIds];
  const mailLatestIds = [...mail.checkIds, "mail.dkim.v1"];
  const mailPrevIds = [...mail.checkIds];
  const acmeAssetId = assetIdFor(workspaceId, "acme.com");
  const mailAssetId = assetIdFor(workspaceId, "mail.acme.com");
  const apiAssetId = assetIdFor(workspaceId, "api.acme.com");
  const ipAssetId = assetIdFor(workspaceId, "203.0.113.24");
  return finalizeRuns([
    {
      id: "run-4",
      workspaceId,
      domain: "acme.com",
      assetId: acmeAssetId,
      observedAt: FROZEN_OBSERVED_AT,
      ...withRunbookMeta(web, { checkIds: webIds }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "acme.com",
        observedAt: FROZEN_OBSERVED_AT,
        checkIds: webIds,
        variant: "latest",
      }),
    },
    {
      id: "run-3",
      workspaceId,
      domain: "acme.com",
      assetId: acmeAssetId,
      observedAt: RUN3_AT,
      ...withRunbookMeta(web, { checkIds: webIds }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "acme.com",
        observedAt: RUN3_AT,
        checkIds: webIds,
        variant: "latest",
      }),
    },
    {
      id: "run-2",
      workspaceId,
      domain: "acme.com",
      assetId: acmeAssetId,
      observedAt: RUN2_AT,
      ...publicCheckset(),
      checkIds: PUBLIC_CHECK_IDS.filter(
        (id) => id !== "web.security_txt.v1" && id !== "web.hsts.v1",
      ),
      runbookName: "Public snapshot",
      runbookVersion: "external-demo-v0.1",
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: buildObservations(
        "acme.com",
        "early",
        RUN2_AT,
        PUBLIC_CHECK_IDS.filter(
          (id) => id !== "web.security_txt.v1" && id !== "web.hsts.v1",
        ),
      ),
    },
    {
      id: "run-api-2",
      workspaceId,
      domain: "api.acme.com",
      assetId: apiAssetId,
      observedAt: API_AT,
      ...withRunbookMeta(web, { checkIds: webIds }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "api.acme.com",
        observedAt: API_AT,
        checkIds: webIds,
        variant: "latest",
      }),
    },
    {
      id: "run-api-1",
      workspaceId,
      domain: "api.acme.com",
      assetId: apiAssetId,
      observedAt: API_PREV_AT,
      ...withRunbookMeta(web, { checkIds: webIds }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "api.acme.com",
        observedAt: API_PREV_AT,
        checkIds: webIds,
        variant: "mid",
      }),
    },
    {
      id: "run-mail-2",
      workspaceId,
      domain: "mail.acme.com",
      assetId: mailAssetId,
      observedAt: MAIL_AT,
      ...withRunbookMeta(mail, {
        checkIds: mailLatestIds,
        runbookVersion: "1.1",
      }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "mail.acme.com",
        observedAt: MAIL_AT,
        checkIds: mailLatestIds,
        variant: "latest",
      }),
    },
    {
      id: "run-mail-1",
      workspaceId,
      domain: "mail.acme.com",
      assetId: mailAssetId,
      observedAt: MAIL_PREV_AT,
      ...withRunbookMeta(mail, {
        checkIds: mailPrevIds,
        runbookVersion: "1.0",
      }),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "mail.acme.com",
        observedAt: MAIL_PREV_AT,
        checkIds: mailPrevIds,
        variant: "latest",
      }),
    },
    {
      id: "run-ip-2",
      workspaceId,
      domain: "203.0.113.24",
      assetId: ipAssetId,
      observedAt: IP_AT,
      ...withRunbookMeta(services),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "203.0.113.24",
        observedAt: IP_AT,
        checkIds: services.checkIds,
        ports: services.ports,
        variant: "latest",
      }),
    },
    {
      id: "run-ip-1",
      workspaceId,
      domain: "203.0.113.24",
      assetId: ipAssetId,
      observedAt: IP_PREV_AT,
      ...withRunbookMeta(services),
      initiator: "Karol",
      status: "completed",
      source: "workspace",
      observations: observationsForRun({
        target: "203.0.113.24",
        observedAt: IP_PREV_AT,
        checkIds: services.checkIds,
        ports: services.ports,
        variant: "latest",
      }),
    },
  ]);
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

export { DEFAULT_PUBLIC_SERVICE_PORTS, templateById };
