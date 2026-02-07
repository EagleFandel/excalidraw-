import { atom } from "../app-jotai";

import type { TeamMemberRecord, TeamRecord } from "./teams-api";

export type FilesScope = "personal" | "team" | "trash";

export const teamsAtom = atom<TeamRecord[]>([]);
export const currentTeamIdAtom = atom<string | null>(null);
export const currentScopeAtom = atom<FilesScope>("personal");
export const teamMembersAtom = atom<Record<string, TeamMemberRecord[]>>({});
export const teamsPanelErrorAtom = atom<string>("");
