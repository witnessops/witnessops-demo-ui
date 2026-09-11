import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useMemo } from "react";
import {
  defaultCheckProfile,
  publicCheckset,
  subscribedCheckProfile,
  workspaceCheckset,
} from "./checks";
import {
  ACME_WORKSPACE,
  FROZEN_OBSERVED_AT,
  KAROL,
  MARK_PALETTE,
  acmeHistoryRuns,
  companionMembers,
  companionRuns,
  companionWorkspaces,
  nextRunId,
} from "./seed";
import { observationsForDomain } from "./observations";
import { slugify } from "./utils";
import type {
  CheckProfile,
  ExposureRun,
  Member,
  PendingSave,
  Role,
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
  startRun: (input: {
    domain: string;
    workspaceId: string;
    checkIds: string[];
    source?: ExposureRun["source"];
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
  lastWorkspaceSlug: null as string | null,
  pendingSave: null as PendingSave | null,
  running: null as RunningCheck | null,
  inviteOpen: false,
  companionsSeeded: false,
};

function uniqueSlug(base: string, workspaces: Workspace[]) {
  let slug = slugify(base);
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
        const workspace: Workspace = {
          id: `ws-${slug}`,
          slug,
          name: name.trim() || "Workspace",
          primaryDomain: domain
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, ""),
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
        let companionsSeeded = state.companionsSeeded;
        if (!companionsSeeded) {
          workspaces = [...workspaces, ...companionWorkspaces()];
          members = [...members, ...companionMembers(state.user ?? KAROL)];
          runs = [...runs, ...companionRuns()];
          companionsSeeded = true;
        }
        set({
          workspaces,
          members,
          runs,
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
      startRun: ({ domain, workspaceId, checkIds, source }) => {
        const existing = get().runs.filter((run) => run.workspaceId === workspaceId);
        const observedAt =
          domain.toLowerCase() === "acme.com"
            ? new Date(
                Date.parse(FROZEN_OBSERVED_AT) + existing.length * 60 * 60 * 1000,
              ).toISOString()
            : new Date().toISOString();
        const running: RunningCheck = {
          domain,
          workspaceId,
          observedAt,
          checkIds,
          source,
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
        const checkIds = running.checkIds;
        const source = opts?.source ?? running.source ?? "workspace";
        const meta =
          source === "public" || !workspace?.exposureActive
            ? publicCheckset()
            : workspaceCheckset(checkIds);
        const run: ExposureRun = {
          id: nextRunId(workspaceRuns),
          workspaceId: running.workspaceId,
          domain: running.domain,
          observedAt: running.observedAt,
          ...meta,
          checkIds,
          initiator: opts?.initiator ?? state.user?.name ?? "Karol",
          status: "completed",
          source,
          observations: observationsForDomain(
            running.domain,
            running.observedAt,
            checkIds,
          ),
        };
        set({ runs: [run, ...state.runs], running: null });
        return run;
      },
      setPendingSave: (pending) => set({ pendingSave: pending }),
      savePendingToWorkspace: (workspaceId) => {
        const state = get();
        const pending = state.pendingSave;
        if (!pending) return null;
        const workspaceRuns = state.runs.filter((run) => run.workspaceId === workspaceId);
        const existing = workspaceRuns.find(
          (run) =>
            run.domain === pending.domain && run.observedAt === pending.observedAt,
        );
        const slug =
          state.workspaces.find((ws) => ws.id === workspaceId)?.slug ??
          state.lastWorkspaceSlug;
        if (existing) {
          set({ pendingSave: null, lastWorkspaceSlug: slug });
          return existing;
        }
        const run: ExposureRun = {
          id: nextRunId(workspaceRuns),
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
        };
        set({
          runs: [run, ...state.runs],
          pendingSave: null,
          lastWorkspaceSlug: slug,
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
        set({
          workspaces: get().workspaces.map((ws) =>
            ws.id === workspaceId
              ? {
                  ...ws,
                  exposureActive: true,
                  checkProfile: subscribedCheckProfile(),
                }
              : ws,
          ),
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
      },
    }),
    {
      name: "witnessops-prototype-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        signedIn: state.signedIn,
        user: state.user,
        workspaces: state.workspaces,
        members: state.members,
        runs: state.runs,
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
    lastWorkspaceSlug: ACME_WORKSPACE.slug,
    companionsSeeded: true,
  };
}
