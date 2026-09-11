import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useMemo } from "react";
import {
  defaultCheckProfile,
  publicCheckset,
  subscribedCheckProfile,
} from "./checks";
import {
  ACME_WORKSPACE,
  FROZEN_OBSERVED_AT,
  KAROL,
  MARK_PALETTE,
  acmeAssets,
  acmeHistoryRuns,
  companionAssets,
  companionMembers,
  companionRunbooks,
  companionRuns,
  companionWorkspaces,
  nextRunId,
  primaryAsset,
  workspaceRunbooks,
} from "./seed";
import { observationsForRun } from "./observations";
import { EXTERNAL_VERSION } from "./contracts";
import { completionStateFor, mockSourceDigest } from "./snapshot";
import {
  assetIdFor,
  inferAssetType,
  instantiateRunbooks,
  normalizeAssetName,
  runbookIdFor,
  suggestedTemplate,
  templateById,
} from "./runbooks";
import { slugify } from "./utils";
import type {
  Asset,
  AssetType,
  CheckProfile,
  ExposureRun,
  Member,
  PendingSave,
  Role,
  Runbook,
  RunningCheck,
  User,
  Workspace,
} from "./types";

interface AppState {
  hydrated: boolean;
  signedIn: boolean;
  user: User | null;
  workspaces: Workspace[];
  members: Member[];
  runs: ExposureRun[];
  assets: Asset[];
  runbooks: Runbook[];
  lastWorkspaceSlug: string | null;
  pendingSave: PendingSave | null;
  running: RunningCheck | null;
  inviteOpen: boolean;
  companionsSeeded: boolean;
  signIn: (user?: User) => void;
  signOut: () => void;
  resetPrototype: () => void;
  createWorkspace: (input: { name: string; domain: string }) => Workspace;
  setLastWorkspace: (slug: string) => void;
  setInviteOpen: (open: boolean) => void;
  inviteMember: (input: {
    workspaceId: string;
    email: string;
    name?: string;
    role: Role;
  }) => Member;
  changeRole: (memberId: string, role: Role) => void;
  removeMember: (memberId: string) => void;
  addAsset: (input: {
    workspaceId: string;
    name: string;
    type: AssetType;
    runbookId: string;
  }) => Asset;
  updateAsset: (id: string, patch: Partial<Pick<Asset, "runbookId" | "name" | "type">>) => void;
  updateRunbook: (
    id: string,
    patch: Partial<Pick<Runbook, "checkIds" | "ports" | "cadence" | "name">>,
  ) => void;
  duplicateRunbook: (id: string) => Runbook | null;
  startRun: (input: {
    domain: string;
    workspaceId: string;
    checkIds: string[];
    source?: ExposureRun["source"];
    assetId?: string;
    runbookId?: string;
    ports?: number[];
  }) => RunningCheck;
  completeRun: (opts?: {
    source?: ExposureRun["source"];
    initiator?: string;
  }) => ExposureRun | null;
  setPendingSave: (pending: PendingSave | null) => void;
  savePendingToWorkspace: (workspaceId: string) => ExposureRun | null;
  updateWorkspace: (
    id: string,
    patch: Partial<Pick<Workspace, "name" | "primaryDomain">>,
  ) => void;
  activateExposure: (workspaceId: string) => void;
  updateCheckProfile: (workspaceId: string, patch: Partial<CheckProfile>) => void;
}

const emptyState = {
  signedIn: false,
  user: null as User | null,
  workspaces: [] as Workspace[],
  members: [] as Member[],
  runs: [] as ExposureRun[],
  assets: [] as Asset[],
  runbooks: [] as Runbook[],
  lastWorkspaceSlug: null as string | null,
  pendingSave: null as PendingSave | null,
  running: null as RunningCheck | null,
  inviteOpen: false,
  companionsSeeded: false,
};

function uniqueSlug(base: string, workspaces: Workspace[]) {
  const slug = slugify(base);
  const used = new Set(workspaces.map((ws) => ws.slug));
  if (!used.has(slug)) return slug;
  let i = 2;
  while (used.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Member";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Member";
  return cleaned
    .split(" ")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function ensureCatalog(
  workspace: Workspace,
  runbooks: Runbook[],
  assets: Asset[],
) {
  let nextRunbooks = runbooks;
  let nextAssets = assets;
  const existing = runbooks.filter((item) => item.workspaceId === workspace.id);
  if (existing.length === 0) {
    nextRunbooks = [...runbooks, ...instantiateRunbooks(workspace.id, workspace.createdAt)];
  }
  const hasAsset = nextAssets.some((item) => item.workspaceId === workspace.id);
  if (!hasAsset && workspace.primaryDomain) {
    nextAssets = [...nextAssets, primaryAsset(workspace)];
  }
  return { runbooks: nextRunbooks, assets: nextAssets };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...emptyState,
      signIn: (user = KAROL) => {
        set({ signedIn: true, user });
      },
      signOut: () => {
        set({ signedIn: false, user: null, running: null, inviteOpen: false });
      },
      resetPrototype: () => {
        set({ ...emptyState, hydrated: true });
      },
      createWorkspace: ({ name, domain }) => {
        const state = get();
        const slug = uniqueSlug(name, state.workspaces);
        const alreadyActive = state.workspaces.some((ws) => ws.exposureActive);
        const host = normalizeAssetName(domain);
        const workspace: Workspace = {
          id: `ws-${slug}`,
          slug,
          name: name.trim() || "Workspace",
          primaryDomain: host,
          createdAt: new Date().toISOString(),
          mark: MARK_PALETTE[state.workspaces.length % MARK_PALETTE.length] ?? "#c8b896",
          exposureActive: alreadyActive,
          checkProfile: alreadyActive
            ? subscribedCheckProfile()
            : defaultCheckProfile(),
        };
        const owner: Member = {
          id: `mem-${workspace.id}-${state.user?.id ?? "owner"}`,
          workspaceId: workspace.id,
          name: state.user?.name ?? "Owner",
          email: state.user?.email ?? "owner@example.com",
          role: "owner",
          status: "active",
        };
        let workspaces = [...state.workspaces, workspace];
        let members = [...state.members, owner];
        let runs = state.runs;
        let assets = state.assets;
        let runbooks = state.runbooks;
        let companionsSeeded = state.companionsSeeded;
        const createdAt = workspace.createdAt;
        runbooks = [...runbooks, ...instantiateRunbooks(workspace.id, createdAt)];
        if (host) {
          const type = inferAssetType(host);
          const template = suggestedTemplate(type);
          assets = [
            ...assets,
            {
              id: assetIdFor(workspace.id, host),
              workspaceId: workspace.id,
              name: host,
              type,
              runbookId: runbookIdFor(workspace.id, template.templateId),
              createdAt,
            },
          ];
        }
        if (slug === "acme") {
          workspace.exposureActive = true;
          workspace.checkProfile = subscribedCheckProfile();
          assets = [
            ...assets.filter((item) => item.workspaceId !== workspace.id),
            ...acmeAssets(),
          ];
          runs = [...runs, ...acmeHistoryRuns(workspace.id)];
        }
        if (!companionsSeeded) {
          workspaces = [...workspaces, ...companionWorkspaces()];
          members = [...members, ...companionMembers(state.user ?? KAROL)];
          runs = [...runs, ...companionRuns()];
          assets = [...assets, ...companionAssets()];
          runbooks = [...runbooks, ...companionRunbooks()];
          companionsSeeded = true;
        }
        set({
          workspaces,
          members,
          runs,
          assets,
          runbooks,
          companionsSeeded,
          lastWorkspaceSlug: workspace.slug,
        });
        return workspace;
      },
      setLastWorkspace: (slug) => {
        if (get().lastWorkspaceSlug === slug) return;
        set({ lastWorkspaceSlug: slug });
      },
      setInviteOpen: (open) => set({ inviteOpen: open }),
      inviteMember: ({ workspaceId, email, name, role }) => {
        const member: Member = {
          id: `mem-${workspaceId}-${email}`,
          workspaceId,
          name: name?.trim() || displayNameFromEmail(email),
          email: email.trim().toLowerCase(),
          role,
          status: "invited",
        };
        set({ members: [...get().members, member], inviteOpen: false });
        return member;
      },
      changeRole: (memberId, role) => {
        set({
          members: get().members.map((member) =>
            member.id === memberId ? { ...member, role } : member,
          ),
        });
      },
      removeMember: (memberId) => {
        set({ members: get().members.filter((member) => member.id !== memberId) });
      },
      addAsset: ({ workspaceId, name, type, runbookId }) => {
        const host = normalizeAssetName(name);
        const id = assetIdFor(workspaceId, host);
        const existing = get().assets.find((item) => item.id === id);
        if (existing) return existing;
        const asset: Asset = {
          id,
          workspaceId,
          name: host,
          type,
          runbookId,
          createdAt: new Date().toISOString(),
        };
        set({ assets: [...get().assets, asset] });
        const workspace = get().workspaces.find((ws) => ws.id === workspaceId);
        if (workspace && !workspace.primaryDomain) {
          set({
            workspaces: get().workspaces.map((ws) =>
              ws.id === workspaceId ? { ...ws, primaryDomain: host } : ws,
            ),
          });
        }
        return asset;
      },
      updateAsset: (id, patch) => {
        set({
          assets: get().assets.map((asset) =>
            asset.id === id ? { ...asset, ...patch } : asset,
          ),
        });
      },
      updateRunbook: (id, patch) => {
        set({
          runbooks: get().runbooks.map((runbook) =>
            runbook.id === id
              ? { ...runbook, ...patch, updatedAt: new Date().toISOString() }
              : runbook,
          ),
        });
      },
      duplicateRunbook: (id) => {
        const source = get().runbooks.find((item) => item.id === id);
        if (!source) return null;
        const copy: Runbook = {
          ...source,
          id: `${source.id}-copy-${Math.random().toString(36).slice(2, 6)}`,
          name: `${source.name} (copy)`,
          updatedAt: new Date().toISOString(),
        };
        set({ runbooks: [...get().runbooks, copy] });
        return copy;
      },
      startRun: ({ domain, workspaceId, checkIds, source, assetId, runbookId, ports }) => {
        const existing = get().runs.filter((run) => run.workspaceId === workspaceId);
        const host = normalizeAssetName(domain);
        const observedAt =
          host === "acme.com" || host === "api.acme.com" || host === "203.0.113.24"
            ? new Date(
                Date.parse(FROZEN_OBSERVED_AT) + existing.length * 60 * 60 * 1000,
              ).toISOString()
            : new Date().toISOString();
        const running: RunningCheck = {
          domain: host,
          workspaceId,
          observedAt,
          checkIds,
          source,
          assetId,
          runbookId,
          ports,
        };
        set({ running });
        return running;
      },
      completeRun: (opts) => {
        const state = get();
        const running = state.running;
        if (!running?.workspaceId) {
          set({ running: null });
          return null;
        }
        const workspace = state.workspaces.find((ws) => ws.id === running.workspaceId);
        const workspaceRuns = state.runs.filter(
          (run) => run.workspaceId === running.workspaceId,
        );
        const runbook = state.runbooks.find((item) => item.id === running.runbookId);
        const checkIds = running.checkIds;
        const source = opts?.source ?? running.source ?? "workspace";
        const meta =
          source === "public" || !workspace?.exposureActive
            ? publicCheckset()
            : runbook
              ? {
                  checkset: runbook.name,
                  checksetVersion: runbook.version,
                  checkIds,
                }
              : {
                  checkset: "Workspace profile",
                  checksetVersion: `${checkIds.length}-checks`,
                  checkIds,
                };
        const observations = observationsForRun({
          target: running.domain,
          observedAt: running.observedAt,
          checkIds,
          ports: running.ports ?? runbook?.ports,
        });
        const id = nextRunId(workspaceRuns);
        const run: ExposureRun = {
          id,
          workspaceId: running.workspaceId,
          domain: running.domain,
          observedAt: running.observedAt,
          ...meta,
          checkIds,
          initiator: opts?.initiator ?? state.user?.name ?? "Karol",
          status: "completed",
          source,
          assetId: running.assetId,
          runbookId: running.runbookId,
          runbookName: runbook?.name ?? meta.checkset,
          runbookVersion: runbook?.version ?? meta.checksetVersion,
          ports: running.ports ?? runbook?.ports,
          kind: runbook?.kind,
          snapshotVersion:
            source === "public" ? EXTERNAL_VERSION : (runbook?.version ?? meta.checksetVersion),
          observations,
          completionState: completionStateFor(observations),
          sourceDigest: mockSourceDigest({
            id,
            domain: running.domain,
            observedAt: running.observedAt,
          }),
        };
        set({ runs: [run, ...state.runs], running: null });
        return run;
      },
      setPendingSave: (pending) => set({ pendingSave: pending }),
      savePendingToWorkspace: (workspaceId) => {
        const state = get();
        const pending = state.pendingSave;
        if (!pending) return null;
        const workspace = state.workspaces.find((ws) => ws.id === workspaceId);
        const catalog = workspace
          ? ensureCatalog(workspace, state.runbooks, state.assets)
          : { runbooks: state.runbooks, assets: state.assets };
        let assets = catalog.assets;
        let runbooks = catalog.runbooks;
        const host = pending.domain;
        const type = inferAssetType(host);
        const template = suggestedTemplate(type);
        const desiredRunbookId = runbookIdFor(workspaceId, template.templateId);
        if (!runbooks.some((item) => item.id === desiredRunbookId)) {
          runbooks = [
            ...runbooks,
            ...instantiateRunbooks(workspaceId, new Date().toISOString()).filter(
              (item) => !runbooks.some((existing) => existing.id === item.id),
            ),
          ];
        }
        let asset = assets.find(
          (item) => item.workspaceId === workspaceId && item.name === host,
        );
        if (!asset) {
          asset = {
            id: assetIdFor(workspaceId, host),
            workspaceId,
            name: host,
            type,
            runbookId: desiredRunbookId,
            createdAt: new Date().toISOString(),
          };
          assets = [...assets, asset];
        }
        const workspaceRuns = state.runs.filter((run) => run.workspaceId === workspaceId);
        const existing = workspaceRuns.find(
          (run) =>
            run.domain === pending.domain && run.observedAt === pending.observedAt,
        );
        const slug =
          state.workspaces.find((ws) => ws.id === workspaceId)?.slug ??
          state.lastWorkspaceSlug;
        if (existing) {
          set({
            pendingSave: null,
            lastWorkspaceSlug: slug,
            assets,
            runbooks,
          });
          return existing;
        }
        const id = nextRunId(workspaceRuns);
        const run: ExposureRun = {
          id,
          workspaceId,
          domain: pending.domain,
          observedAt: pending.observedAt,
          savedAt: new Date().toISOString(),
          checkset: pending.checkset,
          checksetVersion: pending.checksetVersion,
          checkIds: pending.checkIds,
          initiator: `${state.user?.name ?? "Karol"} (saved from public check)`,
          status: "completed",
          source: "public",
          observations: pending.observations,
          assetId: asset.id,
          runbookName: pending.checkset,
          runbookVersion: pending.checksetVersion,
          snapshotVersion: pending.checksetVersion,
          completionState: completionStateFor(pending.observations),
          sourceDigest: mockSourceDigest({
            id,
            domain: pending.domain,
            observedAt: pending.observedAt,
          }),
        };
        set({
          runs: [run, ...state.runs],
          pendingSave: null,
          lastWorkspaceSlug: slug,
          assets,
          runbooks,
        });
        return run;
      },
      updateWorkspace: (id, patch) => {
        set({
          workspaces: get().workspaces.map((ws) =>
            ws.id === id ? { ...ws, ...patch } : ws,
          ),
        });
      },
      activateExposure: (workspaceId) => {
        const state = get();
        const workspace = state.workspaces.find((ws) => ws.id === workspaceId);
        if (!workspace) return;
        const catalog = ensureCatalog(workspace, state.runbooks, state.assets);
        const webTemplate = templateById("web")!;
        set({
          workspaces: state.workspaces.map((ws) =>
            ws.id === workspaceId
              ? {
                  ...ws,
                  exposureActive: true,
                  checkProfile: subscribedCheckProfile(),
                }
              : ws,
          ),
          runbooks: catalog.runbooks.map((runbook) =>
            runbook.workspaceId === workspaceId && runbook.templateId === "web"
              ? {
                  ...runbook,
                  checkIds: [...webTemplate.checkIds],
                  version: webTemplate.version,
                  cadence: webTemplate.cadence,
                }
              : runbook,
          ),
          assets: catalog.assets,
        });
      },
      updateCheckProfile: (workspaceId, patch) => {
        set({
          workspaces: get().workspaces.map((ws) =>
            ws.id === workspaceId
              ? { ...ws, checkProfile: { ...ws.checkProfile, ...patch } }
              : ws,
          ),
        });
        if (patch.checkIds) {
          const webId = runbookIdFor(workspaceId, "web");
          set({
            runbooks: get().runbooks.map((runbook) =>
              runbook.id === webId
                ? {
                    ...runbook,
                    checkIds: patch.checkIds!,
                    updatedAt: new Date().toISOString(),
                  }
                : runbook,
            ),
          });
        }
      },
    }),
    {
      name: "witnessops-prototype-v6",
      version: 6,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        const state = persisted as {
          workspaces?: Workspace[];
          assets?: Asset[];
          runs?: ExposureRun[];
          runbooks?: Runbook[];
          [key: string]: unknown;
        };
        if (version >= 6) return state as never;
        return {
          ...state,
          signedIn: false,
          user: null,
          workspaces: [],
          members: [],
          runs: [],
          assets: [],
          runbooks: [],
          lastWorkspaceSlug: null,
          pendingSave: null,
          companionsSeeded: false,
        } as never;
      },
      partialize: (state) => ({
        signedIn: state.signedIn,
        user: state.user,
        workspaces: state.workspaces,
        members: state.members,
        runs: state.runs,
        assets: state.assets,
        runbooks: state.runbooks,
        lastWorkspaceSlug: state.lastWorkspaceSlug,
        pendingSave: state.pendingSave,
        companionsSeeded: state.companionsSeeded,
      }),
    },
  ),
);

export function useWorkspace(slug: string | undefined) {
  return useAppStore((state) => state.workspaces.find((ws) => ws.slug === slug));
}

export function useMembership(workspaceId: string | undefined) {
  const user = useAppStore((state) => state.user);
  return useAppStore((state) =>
    state.members.find(
      (member) =>
        member.workspaceId === workspaceId && member.email === user?.email,
    ),
  );
}

export function useWorkspaceRuns(workspaceId: string | undefined) {
  const runs = useAppStore((state) => state.runs);
  return useMemo(
    () =>
      runs
        .filter((run) => run.workspaceId === workspaceId)
        .slice()
        .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1)),
    [runs, workspaceId],
  );
}

export function useWorkspaceAssets(workspaceId: string | undefined) {
  const assets = useAppStore((state) => state.assets);
  return useMemo(
    () => assets.filter((asset) => asset.workspaceId === workspaceId),
    [assets, workspaceId],
  );
}

export function useWorkspaceRunbooks(workspaceId: string | undefined) {
  const runbooks = useAppStore((state) => state.runbooks);
  return useMemo(
    () => runbooks.filter((runbook) => runbook.workspaceId === workspaceId),
    [runbooks, workspaceId],
  );
}

export function useAssetRuns(assetId: string | undefined) {
  const runs = useAppStore((state) => state.runs);
  return useMemo(
    () =>
      runs
        .filter((run) => run.assetId === assetId)
        .slice()
        .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1)),
    [runs, assetId],
  );
}

export function isOwner(role: Role | undefined) {
  return role === "owner";
}

/** Seeded Acme Ltd used only by the reset-to-populated helper. */
export function seedPopulatedAcme(user: User = KAROL) {
  const members: Member[] = [
    {
      id: "mem-acme-karol",
      workspaceId: ACME_WORKSPACE.id,
      name: user.name,
      email: user.email,
      role: "owner",
      status: "active",
    },
    {
      id: "mem-acme-alice",
      workspaceId: ACME_WORKSPACE.id,
      name: "Alice",
      email: "alice@acme.com",
      role: "viewer",
      status: "active",
    },
    ...companionMembers(user),
  ];
  return {
    workspaces: [ACME_WORKSPACE, ...companionWorkspaces()],
    members,
    runs: [...acmeHistoryRuns(ACME_WORKSPACE.id), ...companionRuns()],
    assets: [...acmeAssets(), ...companionAssets()],
    runbooks: [...workspaceRunbooks(ACME_WORKSPACE), ...companionRunbooks()],
    lastWorkspaceSlug: ACME_WORKSPACE.slug,
    companionsSeeded: true,
  };
}
